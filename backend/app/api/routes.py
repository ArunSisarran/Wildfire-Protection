from fastapi import APIRouter, Query
import requests
import csv
from io import StringIO
from fastapi.responses import JSONResponse


router = APIRouter(prefix="/api", tags=["api"])


@router.get("/hello")
async def hello(name: str = "world") -> dict:
    return {"message": f"Hello, {name}!"}


@router.get("/fires")
async def get_fires(
    bbox: str = Query(..., description="Bounding box as minLon,minLat,maxLon,maxLat"),
    days: int = Query(1, description="Number of days to look back"),
):
    FIRMS_API_KEY = "fe5a1ef80022754548f8f039c1667c23"
    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{FIRMS_API_KEY}/VIIRS_SNPP_NRT/{bbox}/{days}"
    resp = requests.get(url)
    if resp.status_code != 200:
        return JSONResponse(status_code=resp.status_code, content={"error": "Failed to fetch FIRMS data"})
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
    return {"fires": fires}


@router.get("/wind")
async def get_wind(
    lat: float = Query(..., description="Latitude of the location"),
    lon: float = Query(..., description="Longitude of the location"),
    hours: int = Query(3, description="Number of forecast hours to fetch"),
):
    url = f"https://api.open-meteo.com/v1/gfs?latitude={lat}&longitude={lon}&hourly=winddirection_10m,windspeed_10m&forecast_hours={hours}"
    resp = requests.get(url)
    if resp.status_code != 200:
        return JSONResponse(status_code=resp.status_code, content={"error": "Failed to fetch wind data"})
    data = resp.json()
    return {"wind": data.get("hourly", {})}


@router.post("/simulate")
async def simulate_smoke(
    fire: dict,
    wind: dict,
    hours: int = 3,
):
    # fire: {"lat": float, "lng": float}
    # wind: {"speed": float (m/s), "direction": float (deg)}
    from math import sin, cos, radians

    EARTH_RADIUS = 6371000  # meters
    frames = []
    for t in range(1, hours + 1):
        meters = wind["speed"] * 3600 * t
        bearing = radians(wind["direction"])
        dx = meters * sin(bearing)
        dy = meters * cos(bearing)
        dLat = (dy / EARTH_RADIUS) * (180 / 3.141592653589793)
        dLon = (dx / (EARTH_RADIUS * cos(radians(fire["lat"])))) * (180 / 3.141592653589793)
        newLat = fire["lat"] + dLat
        newLon = fire["lng"] + dLon
        frames.append({"lat": newLat, "lng": newLon, "hour": t})
    return {"frames": frames}


