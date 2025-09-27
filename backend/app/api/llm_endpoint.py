from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
import logging
from dotenv import load_dotenv
from math import radians, sin, cos, sqrt, atan2

import google.generativeai as genai

from app.api.fems_endpoints import FEMSFireRiskAPI
from .plume_endpoint import PlumeRequest, compute_dynamic_plume, MPS_PER_MPH

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

# Mock location - Empire State Building coordinates
EMPIRE_STATE_COORDS = {
    "latitude": 40.748817,
    "longitude": -73.985428,
    "name": "Empire State Building, New York City"
}

# Simple in-memory chat history storage (in production, use Redis or similar)
chat_sessions: Dict[str, List[Dict[str, str]]] = {}

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the message sender (user or assistant)")
    content: str = Field(..., description="Content of the message")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

class ChatRequest(BaseModel):
    message: str = Field(..., description="User's question or message")
    session_id: Optional[str] = Field(default="default", description="Chat session ID for conversation continuity")
    location: Optional[Dict[str, Any]] = Field(default=None, description="User location (lat, lon). If not provided, uses Empire State Building as mock location")

class ChatResponse(BaseModel):
    response: str = Field(..., description="AI assistant's response")
    session_id: str = Field(..., description="Chat session ID")
    location_used: Dict[str, Any] = Field(..., description="Location coordinates used for the query")
    fire_risk_data: Optional[Dict[str, Any]] = Field(default=None, description="Fire risk assessment data if relevant")
    plume_forecast: Optional[Dict[str, Any]] = Field(default=None, description="Smoke plume forecast data if available")
    wildfire_context: Optional[Dict[str, Any]] = Field(default=None, description="Aggregated wildfire detections and smoke plumes")
    sources: List[str] = Field(default_factory=list, description="Data sources used")

def get_or_create_chat_history(session_id: str) -> List[Dict[str, str]]:
    """Get or create chat history for a session"""
    if session_id not in chat_sessions:
        chat_sessions[session_id] = []
    return chat_sessions[session_id]

def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in miles between two lat/lon coordinates."""
    R = 3958.8  # Earth radius in miles
    phi1, phi2 = radians(lat1), radians(lat2)
    d_phi = radians(lat2 - lat1)
    d_lambda = radians(lon2 - lon1)

    a = sin(d_phi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(d_lambda / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


def find_nearest_weather_stations(latitude: float, longitude: float, max_candidates: int = 5) -> List[Dict]:
    """Find the nearest active weather stations to given coordinates, ordered by distance."""
    try:
        response = fems_api.get_ny_stations()
        stations = response.get('data', {}).get('stationMetaData', {}).get('data', [])

        if not stations:
            return []

        active_stations = [dict(s) for s in stations if s.get('station_status') == 'A']
        if not active_stations:
            active_stations = [dict(s) for s in stations]

        for station in active_stations:
            station_lat = station.get('latitude')
            station_lon = station.get('longitude')
            if station_lat is None or station_lon is None:
                station['distance_miles'] = None
                continue
            distance = _haversine_distance(latitude, longitude, station_lat, station_lon)
            station['distance_miles'] = round(distance, 1)

        active_stations.sort(key=lambda s: float('inf') if s.get('distance_miles') is None else s['distance_miles'])
        return active_stations[:max_candidates]

    except Exception as e:
        logger.error(f"Error finding nearest stations: {str(e)}")
        return []

def get_fire_risk_context(location: Dict[str, Any]) -> Dict[str, Any]:
    """Get fire risk assessment data for the given location"""
    try:
        lat, lon = location["latitude"], location["longitude"]

        candidate_stations = find_nearest_weather_stations(lat, lon, max_candidates=6)
        if not candidate_stations:
            return {"error": "No weather stations found for this location"}

        selected_station: Optional[Dict[str, Any]] = None
        latest_weather: Dict[str, Any] = {}
        latest_nfdrs: Dict[str, Any] = {}
        warnings: List[str] = []

        for station in candidate_stations:
            station_id = str(station["station_id"])

            try:
                weather_response = fems_api.get_weather_observations(station_id, hours_back=24)
                weather_data = weather_response.get('data', {}).get('weatherObs', {}).get('data', [])
                station_weather = weather_data[0] if weather_data else {}
            except Exception as e:
                logger.warning(f"Could not fetch weather data for station {station_id}: {str(e)}")
                station_weather = {}

            try:
                nfdrs_response = fems_api.get_nfdrs_observations(station_id, days_back=7)
                nfdrs_data = nfdrs_response.get('data', {}).get('nfdrsObs', {}).get('data', [])
                station_nfdrs = nfdrs_data[0] if nfdrs_data else {}
            except Exception as e:
                logger.warning(f"Could not fetch NFDRS data for station {station_id}: {str(e)}")
                station_nfdrs = {}

            if station_weather and not latest_weather:
                latest_weather = station_weather
                selected_station = station

            if station_nfdrs:
                latest_nfdrs = station_nfdrs
                if not latest_weather:
                    latest_weather = station_weather
                selected_station = station
                break
            else:
                warnings.append(
                    f"No recent NFDRS data for station {station.get('station_name', station_id)}"
                )

        if not selected_station:
            selected_station = candidate_stations[0]

        if not latest_weather and not latest_nfdrs:
            return {
                "station": selected_station,
                "error": "No recent weather observations or NFDRS data available for nearby stations",
                "warnings": warnings
            }

        risk_score = 0
        risk_level = "UNKNOWN"

        if latest_nfdrs:
            try:
                risk_score = fems_api.calculate_fire_risk_score(latest_nfdrs, latest_weather)
                if risk_score < 20:
                    risk_level = "LOW"
                elif risk_score < 40:
                    risk_level = "MODERATE"
                elif risk_score < 60:
                    risk_level = "HIGH"
                elif risk_score < 80:
                    risk_level = "VERY HIGH"
                else:
                    risk_level = "EXTREME"
            except Exception as e:
                warning_message = f"Could not calculate risk score: {str(e)}"
                warnings.append(warning_message)
                logger.warning(warning_message)

        result = {
            "station": selected_station,
            "weather": latest_weather,
            "nfdrs": latest_nfdrs,
            "risk_score": risk_score,
            "risk_level": risk_level
        }

        if warnings:
            result["warnings"] = warnings

        return result

    except Exception as e:
        logger.error(f"Error getting fire risk context: {str(e)}")
        return {"error": str(e)}


def _safe_float(value: Any) -> Optional[float]:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _bearing_to_cardinal(bearing: Optional[float]) -> Optional[str]:
    if bearing is None:
        return None
    directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    idx = int((bearing % 360) / 22.5 + 0.5) % 16
    return directions[idx]


def get_plume_forecast(location: Dict[str, Any], fire_risk_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Derive a lightweight plume forecast for the AI assistant context."""

    if not location or "latitude" not in location or "longitude" not in location:
        return None

    if fire_risk_data.get("error"):
        return None

    lat, lon = location["latitude"], location["longitude"]
    weather = fire_risk_data.get("weather", {}) if isinstance(fire_risk_data, dict) else {}
    nfdrs = fire_risk_data.get("nfdrs", {}) if isinstance(fire_risk_data, dict) else {}

    wind_speed_m_s: Optional[float] = None
    wind_direction: Optional[float] = None

    if weather:
        ws = _safe_float(weather.get("wind_speed"))
        wd = _safe_float(weather.get("wind_direction"))
        if ws is not None:
            # Weather observations are typically in mph; convert to m/s
            wind_speed_m_s = ws * MPS_PER_MPH
        if wd is not None:
            wind_direction = wd

    burning_index = _safe_float(nfdrs.get("burning_index")) if nfdrs else None
    one_hr_fm = _safe_float(nfdrs.get("one_hr_tl_fuel_moisture")) if nfdrs else None

    plume_request = PlumeRequest(
        lat=lat,
        lon=lon,
        hours=[0.5, 1.0, 2.0],
        wind_speed=wind_speed_m_s,
        wind_dir_from=wind_direction,
        burning_index=burning_index,
        one_hr_fm=one_hr_fm,
        suppress_small_fires=False,
        only_target_frames=True,
        simulation_mode="cumulative_union",
    )

    try:
        plume_response = compute_dynamic_plume(plume_request)
    except Exception as exc:
        logger.debug("Plume computation failed: %s", exc)
        return None

    if not plume_response.frames:
        return None

    frames_summary: List[Dict[str, Any]] = []
    for frame in plume_response.frames:
        meta = frame.meta or {}
        plume_length_m = meta.get("plume_length_m")
        plume_width_m = meta.get("plume_width_m")
        frames_summary.append(
            {
                "hours": frame.hours,
                "plume_length_km": round(plume_length_m / 1000.0, 2) if plume_length_m else None,
                "plume_width_km": round(plume_width_m / 1000.0, 2) if plume_width_m else None,
                "wind_dir_from": meta.get("wind_dir_from"),
                "wind_cardinal": _bearing_to_cardinal(meta.get("wind_dir_from")),
                "wind_speed_m_s": meta.get("wind_speed_m_s"),
                "emission_factor": round(meta.get("emission_factor"), 2) if meta.get("emission_factor") is not None else None,
                "station_id": meta.get("station_id"),
            }
        )

    forecast = {
        "frames": frames_summary,
        "mode": plume_request.simulation_mode,
        "geometry_preview": plume_response.frames[-1].geojson if plume_response.frames else None,
    }

    return forecast


def format_plume_summary(plume_forecast: Optional[Dict[str, Any]]) -> str:
    if not plume_forecast:
        return "Plume forecast unavailable."

    frames = plume_forecast.get("frames", [])
    if not frames:
        return "Plume forecast unavailable."

    lines = ["Smoke plume forecast (dynamic model):"]
    for frame in frames:
        hours = frame.get("hours")
        length = frame.get("plume_length_km")
        direction = frame.get("wind_cardinal")
        speed = frame.get("wind_speed_m_s")
        parts = []
        if length is not None:
            parts.append(f"~{length} km downwind")
        if direction:
            parts.append(f"toward {direction}")
        if speed is not None:
            parts.append(f"wind {speed:.1f} m/s")
        if not parts:
            parts.append("insufficient data")
        lines.append(f"- {hours} h: " + ", ".join(parts))
    return "\n".join(lines)

def create_system_prompt(
    location: Dict[str, Any],
    fire_risk_data: Dict[str, Any],
    plume_forecast: Optional[Dict[str, Any]] = None,
    wildfire_summary: Optional[str] = None,
) -> str:
    """Create a system prompt with location, fire risk, and plume context."""
    
    location_info = f"Location: {location.get('name', 'Unknown location')} (Lat: {location['latitude']}, Lon: {location['longitude']})"
    
    if "error" in fire_risk_data:
        risk_context = f"Fire risk data unavailable: {fire_risk_data['error']}"
    else:
        station = fire_risk_data.get('station', {})
        weather = fire_risk_data.get('weather', {})
        nfdrs = fire_risk_data.get('nfdrs', {})
        warnings = fire_risk_data.get('warnings', [])

        fallback_distance = round(((station.get('latitude', 0) - location['latitude'])**2 + (station.get('longitude', 0) - location['longitude'])**2)**0.5 * 69, 1)
        distance_miles = station.get('distance_miles', fallback_distance)

        risk_context = f"""
Current Fire Risk Assessment:
- Nearest Weather Station: {station.get('station_name', 'Unknown')} (ID: {station.get('station_id', 'Unknown')})
- Distance: Approximately {distance_miles} miles
- Risk Level: {fire_risk_data.get('risk_level', 'UNKNOWN')}
- Risk Score: {fire_risk_data.get('risk_score', 0)}/100

Current Weather Conditions:
- Temperature: {weather.get('temperature', 'N/A')}°F
- Humidity: {weather.get('relative_humidity', 'N/A')}%
- Wind Speed: {weather.get('wind_speed', 'N/A')} mph
- Wind Direction: {weather.get('wind_direction', 'N/A')}°
- 24hr Precipitation: {weather.get('hr24Precipitation', 'N/A')} inches

Fire Danger Indices (NFDRS):
- Burning Index: {nfdrs.get('burning_index', 'N/A')}
- Ignition Component: {nfdrs.get('ignition_component', 'N/A')}
- Spread Component: {nfdrs.get('spread_component', 'N/A')}
- Energy Release Component: {nfdrs.get('energy_release_component', 'N/A')}
- 1-Hour Fuel Moisture: {nfdrs.get('one_hr_tl_fuel_moisture', 'N/A')}%
- 10-Hour Fuel Moisture: {nfdrs.get('ten_hr_tl_fuel_moisture', 'N/A')}%
- 100-Hour Fuel Moisture: {nfdrs.get('hun_hr_tl_fuel_moisture', 'N/A')}%
- KBDI (Drought Index): {nfdrs.get('kbdi', 'N/A')}
"""

        if warnings:
            warning_lines = "\n".join(f"- {warning}" for warning in warnings)
            risk_context += f"\nWarnings:\n{warning_lines}\n"

    plume_context = format_plume_summary(plume_forecast)
    wildfire_context = wildfire_summary or "No satellite wildfire detections near the query location in the past 24 hours."

    return f"""You are a specialized wildfire risk assessment AI assistant. You help users understand fire danger conditions and provide safety recommendations based on current weather and fire risk data.

{location_info}

{risk_context}

{plume_context}

Wildfire Satellite Summary:
{wildfire_context}

Guidelines for responses:
1. Always provide actionable safety advice based on the current risk level
2. Explain fire risk factors in simple terms
3. Reference specific data points when relevant
4. Be clear about the reliability and recency of data
5. Encourage users to check official sources for evacuation orders or warnings
6. If asked about locations far from the weather station, mention the distance limitation

Risk Level Interpretations:
- LOW (0-19): Minimal fire risk, normal outdoor activities
- MODERATE (20-39): Some fire risk, exercise normal caution
- HIGH (40-59): Significant fire risk, avoid outdoor burning
- VERY HIGH (60-79): Dangerous conditions, extreme caution with any ignition sources
- EXTREME (80-100): Critical fire danger, follow all local fire restrictions

Remember to stay focused on fire safety and risk assessment topics.
"""

def _prepare_ai_response_text(response: Any) -> str:
    """Extract a usable text string from the Gemini response object."""
    try:
        if getattr(response, "text", None):
            return response.text

        candidates = getattr(response, "candidates", None) or []
        for candidate in candidates:
            parts = getattr(candidate, "content", None)
            if not parts:
                continue
            part_list = getattr(parts, "parts", [])
            texts = [getattr(part, "text", "") for part in part_list]
            combined = " ".join(filter(None, texts)).strip()
            if combined:
                return combined
    except Exception as extraction_error:
        logger.warning(f"Error extracting text from Gemini response: {extraction_error}")

    return "I'm sorry, I couldn't generate a response at this time."


def build_chat_response(
    message: str,
    session_id: str = "default",
    location: Optional[Dict[str, Any]] = None,
    model_name: str = 'gemini-2.5-flash-lite'
) -> ChatResponse:
    """Shared chat response builder for API and CLI usage."""

    # Use provided location or default to Empire State Building
    location_to_use = location or EMPIRE_STATE_COORDS

    # Get conversation history
    chat_history = get_or_create_chat_history(session_id)

    # Get fire risk context and plume forecast
    fire_risk_data = get_fire_risk_context(location_to_use)
    plume_forecast = get_plume_forecast(location_to_use, fire_risk_data)

    wildfire_context: Optional[Dict[str, Any]] = None
    wildfire_summary: Optional[str] = None
    try:
        from . import wildfire_map_endpoint
        wildfire_context = wildfire_map_endpoint.collect_wildfire_context(
            lat=location_to_use["latitude"],
            lon=location_to_use["longitude"],
            radius_km=1000.0,
            precomputed_fire_risk=fire_risk_data,
        )
        wildfire_summary = wildfire_context.get("chat_summary")
    except Exception as exc:
        logger.debug("Wildfire satellite context unavailable: %s", exc)

    # Create system prompt with current context
    system_prompt = create_system_prompt(location_to_use, fire_risk_data, plume_forecast, wildfire_summary)

    # Build conversation context for Gemini
    conversation_context = system_prompt + "\n\nConversation History:\n"
    for past_message in chat_history[-10:]:  # Last 10 messages
        conversation_context += f"{past_message['role'].capitalize()}: {past_message['content']}\n"

    conversation_context += f"\nUser: {message}\nAssistant:"

    # Initialize Gemini model
    model = genai.GenerativeModel(model_name)

    # Generate response
    response = model.generate_content(conversation_context)
    ai_response = _prepare_ai_response_text(response)

    # Save to chat history
    chat_history.append({"role": "user", "content": message})
    chat_history.append({"role": "assistant", "content": ai_response})

    # Keep only last 20 messages (10 exchanges)
    if len(chat_history) > 20:
        chat_history[:] = chat_history[-20:]

    # Determine sources used
    sources: List[str] = []
    if "error" not in fire_risk_data:
        if fire_risk_data.get("weather"):
            sources.append("FEMS Weather Data")
        if fire_risk_data.get("nfdrs"):
            sources.append("NFDRS Fire Danger Indices")
    if plume_forecast:
        sources.append("Dynamic Plume Model")
    if wildfire_context:
        for source in wildfire_context.get("sources", []):
            if source not in sources:
                sources.append(source)

    return ChatResponse(
        response=ai_response,
        session_id=session_id,
        location_used=location_to_use,
        fire_risk_data=fire_risk_data if "error" not in fire_risk_data else None,
        plume_forecast=plume_forecast,
        wildfire_context=wildfire_context,
        sources=sources
    )


@router.post("/chat", response_model=ChatResponse)
async def chat_with_llm(request: ChatRequest):
    """
    Chat with the LLM about fire risk assessment
    
    The AI assistant can answer questions about:
    - Current fire risk conditions
    - Weather impacts on fire danger  
    - Safety recommendations
    - Fire prevention tips
    - Understanding fire risk indices
    """
    try:
        session_id = request.session_id or "default"
        chat_response = build_chat_response(
            message=request.message,
            session_id=session_id,
            location=request.location
        )
        return chat_response

    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing chat request: {str(e)}")

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
        "location": EMPIRE_STATE_COORDS,
        "fire_risk_assessment": get_fire_risk_context(EMPIRE_STATE_COORDS)
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
        location = EMPIRE_STATE_COORDS
        
        chat_response = build_chat_response(test_message, session_id="simple-test", location=location)
        fire_risk_data = chat_response.fire_risk_data or {}

        return {
            "status": "success",
            "test_message": test_message,
            "location": location,
            "fire_risk_level": fire_risk_data.get("risk_level", "Unknown"),
            "ai_response": chat_response.response,
            "plume_forecast": chat_response.plume_forecast,
            "warnings": fire_risk_data.get("warnings", []),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error_message": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
