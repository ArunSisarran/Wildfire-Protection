import logging
from fastapi import APIRouter, Query
import requests
import csv
from io import StringIO
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

router = APIRouter(prefix="/api", tags=["api"])


@router.get("/hello")
async def hello(name: str = "world") -> dict:
    return {"message": f"Hello, {name}!"}


@router.get("/fires")
async def get_fires(
    bbox: str = Query(..., description="Bounding box as minLon,minLat,maxLon,maxLat"),
    days: int = Query(1, description="Number of days to look back"),
):
    FIRMS_API_KEY = os.getenv("FIRMS_API_KEY")
    if not FIRMS_API_KEY:
        logger.error("FIRMS API key not set in environment")
        return JSONResponse(status_code=500, content={"error": "FIRMS API key not set in environment"})
    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{FIRMS_API_KEY}/VIIRS_SNPP_NRT/{bbox}/{days}"
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        csv_text = resp.text
        f = StringIO(csv_text)
        reader = csv.DictReader(f)
        fires = []
        for row in reader:
            fires.append(
                {
                    "lat": float(row["latitude"]),
                    "lng": float(row["longitude"]),
                    "time": f'{row["acq_date"]} {row["acq_time"]}',
                    "confidence": row.get("confidence", None),
                }
            )
        logger.info(f"Fetched {len(fires)} fires for bbox {bbox} and days {days}")
        return {"fires": fires}
    except Exception as e:
        logger.error(f"Error fetching FIRMS data: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch FIRMS data"})


@router.get("/wind")
async def get_wind(
    lat: float = Query(..., description="Latitude of the location"),
    lon: float = Query(..., description="Longitude of the location"),
    hours: int = Query(3, description="Number of forecast hours to fetch"),
):
    url = f"https://api.open-meteo.com/v1/gfs?latitude={lat}&longitude={lon}&hourly=winddirection_10m,windspeed_10m&forecast_hours={hours}"
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        logger.info(f"Fetched wind data for lat={lat}, lon={lon}, hours={hours}")
        return {"wind": data.get("hourly", {})}
    except Exception as e:
        logger.error(f"Error fetching wind data: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to fetch wind data"})


class SimulateFrame(BaseModel):
    lat: float
    lng: float
    hour: int
    fire_index: int


class SimulateRequest(BaseModel):
    fires: List[SimulateFrame]
    wind: dict
    hours: int = Field(3, ge=1)


class SimulateResponse(BaseModel):
    frames: List[SimulateFrame]


@router.post("/simulate", response_model=SimulateResponse)
async def simulate_smoke(
    req: SimulateRequest
):
    from math import sin, cos, radians
    EARTH_RADIUS = 6371000  # meters
    frames = []
    try:
        for idx, fire in enumerate(req.fires):
            for t in range(1, req.hours + 1):
                meters = req.wind.speed * 3600 * t
                bearing = radians(req.wind.direction)
                dx = meters * sin(bearing)
                dy = meters * cos(bearing)
                dLat = (dy / EARTH_RADIUS) * (180 / 3.141592653589793)
                dLon = (dx / (EARTH_RADIUS * cos(radians(fire.lat)))) * (180 / 3.141592653589793)
                newLat = fire.lat + dLat
                newLon = fire.lng + dLon
                frames.append(SimulateFrame(lat=newLat, lng=newLon, hour=t, fire_index=idx))
        logger.info(f"Simulated smoke for {len(req.fires)} fires over {req.hours} hours")
        return SimulateResponse(frames=frames)
    except Exception as e:
        logger.error(f"Error in smoke simulation: {e}")
        return JSONResponse(status_code=500, content={"error": "Failed to simulate smoke spread"})


