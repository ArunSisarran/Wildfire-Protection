from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime
import logging
import os

from fems_endpoints import FEMSFireRiskAPI
from llm_endpoint import router as llm_router
from plume_endpoint import router as plume_router, cone_polygon, PlumeResponse, PlumeFrame, MPS_PER_MPH

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="FEMS Fire Risk Assessment API",
    description="FastAPI wrapper for FEMS Fire Risk Assessment functions with LLM integration",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include LLM router
app.include_router(llm_router)
app.include_router(plume_router)

fems_api = FEMSFireRiskAPI()

class StationInfo(BaseModel):
    station_id: int
    wrcc_id: Optional[str] = None
    station_name: str
    latitude: float
    longitude: float
    elevation: Optional[float] = None
    station_type: Optional[str] = None
    station_status: Optional[str] = None
    time_zone: Optional[str] = None

class WeatherObservation(BaseModel):
    station_id: int
    station_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    observation_time: Optional[str] = None
    temperature: Optional[float] = None
    relative_humidity: Optional[float] = None
    hourly_precip: Optional[float] = None
    hr24Precipitation: Optional[float] = None
    hr48Precipitation: Optional[float] = None
    hr72Precipitation: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_direction: Optional[float] = None
    peak_gust_speed: Optional[float] = None
    peak_gust_dir: Optional[float] = None
    sol_rad: Optional[float] = None

class NFDRSObservation(BaseModel):
    station_id: int
    nfdr_date: Optional[str] = None
    nfdr_time: Optional[str] = None
    fuel_model: Optional[str] = None
    kbdi: Optional[float] = None
    one_hr_tl_fuel_moisture: Optional[float] = None
    ten_hr_tl_fuel_moisture: Optional[float] = None
    hun_hr_tl_fuel_moisture: Optional[float] = None
    thou_hr_tl_fuel_moisture: Optional[float] = None
    ignition_component: Optional[float] = None
    spread_component: Optional[float] = None
    energy_release_component: Optional[float] = None
    burning_index: Optional[float] = None
    herbaceous_lfi_fuel_moisture: Optional[float] = None
    woody_lfi_fuel_moisture: Optional[float] = None

class FireRiskAssessment(BaseModel):
    station_id: int
    station_name: str
    latitude: float
    longitude: float
    risk_score: float = Field(ge=0, le=100)
    risk_level: str = Field(..., description="LOW, MODERATE, HIGH, VERY HIGH, or EXTREME")
    weather_data: Optional[WeatherObservation] = None
    nfdrs_data: Optional[NFDRSObservation] = None

class GraphQLQuery(BaseModel):
    query: str = Field(..., description="GraphQL query string")


@app.get("/")
async def root():
    return {
        "message": "FEMS Fire Risk Assessment API",
        "version": "1.0.0",
        "documentation": "/docs"
    }

@app.get("/api/stations/ny", response_model=List[StationInfo])
async def get_ny_stations():
    """
    Get all weather stations in New York state with historic data
    """
    try:
        logger.info("Fetching NY stations")
        response = fems_api.get_ny_stations()
        
        stations_data = response.get('data', {}).get('stationMetaData', {}).get('data', [])
        
        return stations_data
    except Exception as e:
        logger.error(f"Error fetching NY stations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/weather/observations")
async def get_weather_observations(
    station_ids: str = Query(..., description="Comma-separated station IDs"),
    hours_back: int = Query(24, description="Number of hours to look back", ge=1, le=168)
):
    """
    Get weather observations for specified stations
    
    - **station_ids**: Comma-separated list of station IDs (e.g., "44731,44732")
    - **hours_back**: Number of hours to look back (default: 24, max: 168)
    """
    try:
        logger.info(f"Fetching weather observations for stations: {station_ids}")
        response = fems_api.get_weather_observations(station_ids, hours_back)
        
        weather_data = response.get('data', {}).get('weatherObs', {}).get('data', [])
        
        return {
            "station_ids": station_ids,
            "hours_back": hours_back,
            "count": len(weather_data),
            "data": weather_data
        }
    except Exception as e:
        logger.error(f"Error fetching weather observations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/nfdrs/observations")
async def get_nfdrs_observations(
    station_ids: str = Query(..., description="Comma-separated station IDs"),
    days_back: int = Query(7, description="Number of days to look back", ge=1, le=30)
):
    """
    Get NFDRS (National Fire Danger Rating System) observations for specified stations
    
    - **station_ids**: Comma-separated list of station IDs
    - **days_back**: Number of days to look back (default: 7, max: 30)
    """
    try:
        logger.info(f"Fetching NFDRS observations for stations: {station_ids}")
        response = fems_api.get_nfdrs_observations(station_ids, days_back)
        
        nfdrs_data = response.get('data', {}).get('nfdrsObs', {}).get('data', [])
        
        return {
            "station_ids": station_ids,
            "days_back": days_back,
            "count": len(nfdrs_data),
            "data": nfdrs_data
        }
    except Exception as e:
        logger.error(f"Error fetching NFDRS observations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/fire-danger/percentiles")
async def get_fire_danger_percentiles(
    station_ids: str = Query(..., description="Comma-separated station IDs")
):
    """
    Get fire danger percentile levels for specified stations
    """
    try:
        logger.info(f"Fetching fire danger percentiles for stations: {station_ids}")
        response = fems_api.get_fire_danger_percentiles(station_ids)
        
        percentile_data = response.get('data', {}).get('percentileLevels', {}).get('data', [])
        
        return {
            "station_ids": station_ids,
            "count": len(percentile_data),
            "data": percentile_data
        }
    except Exception as e:
        logger.error(f"Error fetching fire danger percentiles: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/fire-risk/calculate")
async def calculate_fire_risk(
    nfdrs_data: Dict,
    weather_data: Dict
):
    """
    Calculate fire risk score based on NFDRS and weather data
    
    Returns a risk score from 0-100 and corresponding risk level
    """
    try:
        score = fems_api.calculate_fire_risk_score(nfdrs_data, weather_data)
        
        if score < 20:
            risk_level = "LOW"
        elif score < 40:
            risk_level = "MODERATE"
        elif score < 60:
            risk_level = "HIGH"
        elif score < 80:
            risk_level = "VERY HIGH"
        else:
            risk_level = "EXTREME"
        
        return {
            "risk_score": score,
            "risk_level": risk_level,
            "interpretation": {
                "LOW": "Minimal fire risk",
                "MODERATE": "Some fire risk - stay alert",
                "HIGH": "Significant fire risk - exercise caution",
                "VERY HIGH": "Dangerous conditions - extreme caution advised",
                "EXTREME": "Critical fire danger - avoid all outdoor burning"
            }.get(risk_level, "Unknown risk level")
        }
    except Exception as e:
        logger.error(f"Error calculating fire risk: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/fire-risk/assessment")
async def get_fire_risk_assessment(
    station_ids: Optional[str] = Query(None, description="Comma-separated station IDs. If not provided, uses top 5 active NY stations"),
    limit: int = Query(20, description="Number of stations to assess", ge=1, le=20)
):
    """
    Get comprehensive fire risk assessment for specified stations or top NY stations
    Combines weather data, NFDRS data, and risk calculations for each station
    """
    try:
        if not station_ids:
            logger.info(f"No station IDs provided, fetching top {limit} active NY stations")
            stations_response = fems_api.get_ny_stations()
            stations = stations_response['data']['stationMetaData']['data']
            active_stations = [s for s in stations if s.get('station_status') == 'A'][:limit]
            station_ids = ','.join(str(s['station_id']) for s in active_stations)
        else:
            stations_response = fems_api.get_ny_stations()
            all_stations = stations_response['data']['stationMetaData']['data']
            requested_ids = [int(sid.strip()) for sid in station_ids.split(',')]
            active_stations = [s for s in all_stations if s['station_id'] in requested_ids]

        if not active_stations:
            return {
                "message": "No active stations found",
                "assessments": []
            }

        logger.info(f"Assessing fire risk for stations: {station_ids}")

        weather_response = fems_api.get_weather_observations(station_ids, hours_back=24)
        weather_data = weather_response['data']['weatherObs']['data']

        nfdrs_response = fems_api.get_nfdrs_observations(station_ids, days_back=7)
        nfdrs_data = nfdrs_response['data']['nfdrsObs']['data']

        assessments = []
        for station in active_stations:
            station_id = station['station_id']
            station_weather = next((w for w in weather_data if w['station_id'] == station_id), {})
            station_nfdrs = next((n for n in nfdrs_data if n['station_id'] == station_id), {})

            if station_nfdrs:
                risk_score = fems_api.calculate_fire_risk_score(station_nfdrs, station_weather)
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
            else:
                risk_score = None
                risk_level = None

            assessments.append({
                "station_id": station_id,
                "station_name": station['station_name'],
                "latitude": station['latitude'],
                "longitude": station['longitude'],
                "risk_score": risk_score,
                "risk_level": risk_level,
                "weather_conditions": station_weather if station_weather else None,
                "fire_indices": station_nfdrs if station_nfdrs else None
            })

        assessments.sort(key=lambda x: (x['risk_score'] if x['risk_score'] is not None else -1), reverse=True)
        high_risk = [a for a in assessments if a['risk_score'] is not None and a['risk_score'] >= 40]

        return {
            "assessment_time": datetime.utcnow().isoformat(),
            "total_stations": len(assessments),
            "high_risk_count": len(high_risk),
            "summary": {
                "highest_risk": assessments[0] if assessments else None,
                "average_risk": sum(a['risk_score'] for a in assessments if a['risk_score'] is not None) / max(1, len([a for a in assessments if a['risk_score'] is not None])) if assessments else 0
            },
            "assessments": assessments
        }
    except Exception as e:
        logger.error(f"Error performing fire risk assessment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stations/{station_id}/plume", response_model=PlumeResponse, tags=["Plume"])
async def get_plume_for_station(
    station_id: int,
    # --- UPDATED: More hours for a longer, smoother animation path ---
    hours: List[float] = Query([
        0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6,
        7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24
    ], description="List of hours for plume travel time")
):
    """
    Generates a smoke plume projection for a given weather station.
    """
    try:
        meta_resp = fems_api.get_station_metadata(str(station_id))
        station_meta = meta_resp.get("data", {}).get("stationMetaData", {}).get("data", [])
        if not station_meta:
            raise HTTPException(status_code=404, detail="Station not found")
        
        station_info = station_meta[0]
        lat, lon = station_info['latitude'], station_info['longitude']

        weather_resp = fems_api.get_weather_observations(str(station_id), hours_back=3)
        weather_list = weather_resp.get("data", {}).get("weatherObs", {}).get("data", [])
        latest_weather = weather_list[-1] if weather_list else {}

        nfdrs_resp = fems_api.get_nfdrs_observations(str(station_id), days_back=1)
        nfdrs_list = nfdrs_resp.get("data", {}).get("nfdrsObs", {}).get("data", [])
        latest_nfdrs = nfdrs_list[-1] if nfdrs_list else {}

        wind_speed_mph = latest_weather.get("wind_speed", 5.0)
        wind_speed_m_s = (wind_speed_mph or 0.0) * MPS_PER_MPH
        wind_dir_from = latest_weather.get("wind_direction", 180.0)
        burning_index = latest_nfdrs.get("burning_index", 30.0)
        one_hr_fm = latest_nfdrs.get("one_hr_tl_fuel_moisture", 10.0)

        frames: List[PlumeFrame] = []
        for h in sorted(set(h for h in hours if h > 0)):
            res = cone_polygon(
                lat=lat, lon=lon, wind_speed_m_s=wind_speed_m_s,
                wind_dir_from_deg=wind_dir_from, hours=h,
                burning_index=burning_index, one_hr_fm=one_hr_fm,
                suppress_small_fires=False 
            )
            if res:
                geojson_poly, meta = res
                meta.update({
                    "hours": h, "wind_speed_mph": wind_speed_mph, "wind_dir_from": wind_dir_from,
                    "burning_index": burning_index, "one_hr_fm": one_hr_fm, "station_id": station_id
                })
                frames.append(PlumeFrame(hours=h, geojson=geojson_poly, meta=meta))

        return PlumeResponse(frames=frames, source="station_cone_v1")
    except Exception as e:
        logger.error(f"Error generating plume for station {station_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Could not generate plume: {e}")

@app.post("/api/graphql/query")
async def execute_graphql_query(query: GraphQLQuery):
    """
    Execute a custom GraphQL query against the FEMS API
    
    This endpoint allows advanced users to execute custom GraphQL queries
    """
    try:
        logger.info("Executing custom GraphQL query")
        response = fems_api.query_graphql(query.query)
        return response
    except Exception as e:
        logger.error(f"Error executing GraphQL query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    try:
        response = fems_api.query_graphql("""
            query {
                stationMetaData(stateId: "NY", per_page: 1) {
                    _metadata {
                        total_count
                    }
                }
            }
        """)
        
        return {
            "status": "healthy",
            "fems_api": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "fems_api": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

<<<<<<< HEAD
=======
@app.get("/test-llm")
async def test_llm_simple():
    """Simple test endpoint for LLM functionality"""
    try:
        from llm_endpoint import simple_llm_test
        result = simple_llm_test()
        return result
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error testing LLM: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }

>>>>>>> upstream/main
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)