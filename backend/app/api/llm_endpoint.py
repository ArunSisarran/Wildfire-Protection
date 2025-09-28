from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import logging
from dotenv import load_dotenv
from math import radians, sin, cos, sqrt, atan2

import google.generativeai as genai

from fems_endpoints import FEMSFireRiskAPI

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api/llm", tags=["llm"])

# Initialize FEMS API
fems_api = FEMSFireRiskAPI()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required")

genai.configure(api_key=GEMINI_API_KEY)

# Default location if none is provided by the user
DEFAULT_LOCATION = {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "name": "New York, NY"
}

# In-memory chat history
chat_sessions: Dict[str, List[Dict[str, Any]]] = {}

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    location: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    location_used: Dict[str, Any]
    fire_risk_data: Optional[Dict[str, Any]] = None
    sources: List[str] = []

def get_or_create_chat_history(session_id: str) -> List[Dict[str, Any]]:
    if session_id not in chat_sessions:
        chat_sessions[session_id] = []
    return chat_sessions[session_id]

def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3958.8
    phi1, phi2 = radians(lat1), radians(lat2)
    d_phi = radians(lat2 - lat1)
    d_lambda = radians(lon2 - lon1)
    a = sin(d_phi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(d_lambda / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))

def find_nearest_weather_stations(latitude: float, longitude: float, max_candidates: int = 5) -> List[Dict]:
    """Find the nearest active weather stations from the national dataset."""
    try:
        response = fems_api.get_ny_stations()
        stations = response.get('data', {}).get('stationMetaData', {}).get('data', [])
        if not stations: return []

        active_stations = [dict(s) for s in stations if s.get('station_status') == 'A']
        for station in active_stations:
            station['distance_miles'] = round(_haversine_distance(latitude, longitude, station['latitude'], station['longitude']), 1)
        
        active_stations.sort(key=lambda s: s['distance_miles'])
        return active_stations[:max_candidates]
    except Exception as e:
        logger.error(f"Error finding nearest stations: {str(e)}")
        return []

def get_fire_risk_context(location: Dict[str, Any]) -> Dict[str, Any]:
    """Get fire risk assessment data for any given location."""
    try:
        lat, lon = location["latitude"], location["longitude"]
        candidate_stations = find_nearest_weather_stations(lat, lon, max_candidates=5)
        if not candidate_stations:
            return {"error": "No weather stations could be found nearby."}

        for station in candidate_stations:
            station_id = str(station["station_id"])
            try:
                weather_response = fems_api.get_weather_observations(station_id, hours_back=6)
                weather_data = weather_response.get('data', {}).get('weatherObs', {}).get('data', [])
                
                nfdrs_response = fems_api.get_nfdrs_observations(station_id, days_back=3)
                nfdrs_data = nfdrs_response.get('data', {}).get('nfdrsObs', {}).get('data', [])

                if weather_data and nfdrs_data:
                    latest_weather = sorted(weather_data, key=lambda x: x['observation_time'], reverse=True)[0]
                    latest_nfdrs = sorted(nfdrs_data, key=lambda x: x['nfdr_date'], reverse=True)[0]
                    risk_score = fems_api.calculate_fire_risk_score(latest_nfdrs, latest_weather)
                    
                    if risk_score < 20: risk_level = "LOW"
                    elif risk_score < 40: risk_level = "MODERATE"
                    elif risk_score < 60: risk_level = "HIGH"
                    elif risk_score < 80: risk_level = "VERY HIGH"
                    else: risk_level = "EXTREME"
                    
                    return {
                        "station": station, "weather": latest_weather, "nfdrs": latest_nfdrs,
                        "risk_score": risk_score, "risk_level": risk_level
                    }
            except Exception as e:
                logger.warning(f"Could not fetch complete data for station {station_id}: {e}")
                continue
        
        return {"error": "Could not retrieve complete, recent data from nearby weather stations.", "station": candidate_stations[0]}
    except Exception as e:
        logger.error(f"Error in get_fire_risk_context: {e}")
        return {"error": str(e)}

def create_system_prompt(location: Dict[str, Any], fire_risk_data: Optional[Dict[str, Any]]) -> str:
    """Create a new, more flexible system prompt for the AI."""
    persona = "You are 'Respira,' a helpful and knowledgeable AI assistant specializing in wildfire safety and risk assessment. Your tone should be clear, direct, and reassuring."
    
    general_knowledge = """
    **Your Capabilities:**
    1.  **General Knowledge:** You can answer general questions about wildfire prevention (e.g., creating defensible space), safety procedures (e.g., evacuation plans), and understanding fire weather.
    2.  **Real-Time Analysis:** When provided with real-time data, your primary role is to state the overall risk level **concisely** and give a **single, brief sentence** explaining the main reason (e.g., "The risk is low due to high humidity and calm winds."). Do not list out all the individual data points. After stating the risk, you can proactively offer to provide more details or answer other safety questions.
    3.  **Fallback:** If a user asks about a location but you have no data, state that you cannot provide a real-time assessment and offer to answer general safety questions instead.
    """

    data_context = f"## Real-Time Data Context for the User's Location\n"
    data_context += f"**Location:** {location.get('name', 'Unknown')} (Lat: {location['latitude']:.4f}, Lon: {location['longitude']:.4f})\n"

    if fire_risk_data and "error" not in fire_risk_data:
        station = fire_risk_data.get('station', {})
        weather = fire_risk_data.get('weather', {})
        data_context += f"**Nearest Data Source:** {station.get('station_name', 'N/A')} (~{station.get('distance_miles', 'N/A')} miles away)\n"
        data_context += f"**Current Fire Risk:** {fire_risk_data.get('risk_level', 'UNKNOWN')} ({fire_risk_data.get('risk_score', 0)}/100)\n"
        data_context += f"**Key Factors:** Temp {weather.get('temperature', 'N/A')}°F, Humidity {weather.get('relative_humidity', 'N/A')}%, Wind {weather.get('wind_speed', 'N/A')} mph\n"
    elif fire_risk_data and "error" in fire_risk_data:
        data_context += f"**Data Status:** {fire_risk_data['error']}\n"
    else:
        data_context = "## Real-Time Data Context\n**Status:** No location data provided for this query. Rely on general knowledge.\n"

    return f"{persona}\n\n{general_knowledge}\n{data_context}"

def build_chat_response(message: str, session_id: str, location: Optional[Dict[str, Any]]) -> ChatResponse:
    """Shared chat response builder for API and CLI usage."""
    location_to_use = location or DEFAULT_LOCATION
    chat_history = get_or_create_chat_history(session_id)
    
    fire_risk_data = get_fire_risk_context(location_to_use) if location else None
    
    system_prompt = create_system_prompt(location_to_use, fire_risk_data)
    
    messages_for_api = [
        {'role': 'user', 'parts': [system_prompt]},
        {'role': 'model', 'parts': ["Understood. I am ready to assist with wildfire safety and risk assessment."]},
    ]
    
    messages_for_api.extend(chat_history)
    messages_for_api.append({'role': 'user', 'parts': [message]})
    
    # --- THIS IS THE FIX: Using a valid model name from your list ---
    model = genai.GenerativeModel('models/gemini-pro-latest')

    response = model.generate_content(messages_for_api)
    ai_response = response.text

    # Update history for the next turn
    chat_history.append({'role': 'user', 'parts': [message]})
    chat_history.append({'role': 'model', 'parts': [ai_response]})
    
    sources = []
    if fire_risk_data and "error" not in fire_risk_data:
        sources.append("FEMS Real-Time Weather & Fire Danger Data")

    return ChatResponse(
        response=ai_response,
        session_id=session_id,
        location_used=location_to_use,
        fire_risk_data=fire_risk_data if "error" not in fire_risk_data else None,
        sources=sources
    )

@router.post("/chat", response_model=ChatResponse)
async def chat_with_llm(request: ChatRequest):
    """Chat with the AI about fire risk and safety."""
    try:
        chat_response = build_chat_response(
            message=request.message,
            session_id=request.session_id,
            location=request.location
        )
        return chat_response
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing chat request: {str(e)}")

# ... (rest of the file remains the same) ...

@router.get("/sessions/{session_id}/history")
async def get_chat_history(session_id: str):
    """Get chat history for a session"""
    if session_id not in chat_sessions:
        return {"session_id": session_id, "messages": []}
    
    chat_history = chat_sessions[session_id]
    messages = []
    
    for message in chat_history:
        messages.append({
            "role": message["role"],
            "content": message["content"],
            "timestamp": datetime.utcnow().isoformat()
        })
    
    return {
        "session_id": session_id,
        "messages": messages
    }

@router.delete("/sessions/{session_id}")
async def clear_chat_session(session_id: str):
    """Clear chat history for a session"""
    if session_id in chat_sessions:
        del chat_sessions[session_id]
    
    return {"message": f"Session {session_id} cleared"}

@router.get("/location/default")
async def get_default_location():
    """Get the default mock location (Empire State Building)"""
    return {
        "location": DEFAULT_LOCATION,
        "fire_risk_assessment": get_fire_risk_context(DEFAULT_LOCATION)
    }

@router.post("/location/risk-assessment")
async def get_location_risk_assessment(location: Dict[str, Any]):
    """Get fire risk assessment for a specific location"""
    try:
        if "latitude" not in location or "longitude" not in location:
            raise HTTPException(status_code=400, detail="Location must include latitude and longitude")
        
        fire_risk_data = get_fire_risk_context(location)
        
        return {
            "location": location,
            "fire_risk_assessment": fire_risk_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting location risk assessment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def simple_llm_test():
    """
    Very simple function to test LLM functionality
    Returns a dictionary with test results
    """
    try:
        # Test message
        test_message = "What is the current fire risk?"
        
        # Use Empire State Building as test location
        location = DEFAULT_LOCATION
        
        chat_response = build_chat_response(test_message, session_id="simple-test", location=location)
        fire_risk_data = chat_response.fire_risk_data or {}

        return {
            "status": "success",
            "test_message": test_message,
            "location": location,
            "fire_risk_level": fire_risk_data.get("risk_level", "Unknown"),
            "ai_response": chat_response.response,
            "warnings": fire_risk_data.get("warnings", []),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error_message": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
