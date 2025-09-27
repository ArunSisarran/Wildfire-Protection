from __future__ import annotations
import math
import logging
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel, Field, field_validator
from pyproj import Geod
from shapely.geometry import Polygon, mapping, shape
from shapely.geometry.base import BaseGeometry

from .fems_endpoints import FEMSFireRiskAPI

router = APIRouter(prefix="/api", tags=["Plume"])

logger = logging.getLogger(__name__)
geod = Geod(ellps="WGS84")
fems_api = FEMSFireRiskAPI()

DEFAULT_HOURS = [0.5, 1.0, 2.0]
MPS_PER_MPH = 0.44704

# ---------------- utility ----------------
def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))

def safe_float(value: Any, default: Optional[float] = None) -> Optional[float]:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default

def compute_emission_factor(
    *,
    burning_index: Optional[float] = None,
    one_hr_fm: Optional[float] = None,
    viirs_frp: Optional[float] = None,
    area_m2: Optional[float] = None,
    emission_multiplier: float = 1.0,
) -> Tuple[float, float, float, float, float]:
    bi_norm = clamp((burning_index or 0.0) / 200.0, 0.0, 1.0)
    fm_norm = 1.0 - clamp((one_hr_fm or 30.0) / 100.0, 0.0, 1.0)
    frp_norm = clamp((viirs_frp or 0.0) / 500.0, 0.0, 1.0)
    area_norm = clamp((area_m2 or 0.0) / 1_000_000.0, 0.0, 1.0)

    w_bi, w_fm, w_frp, w_area = 0.4, 0.25, 0.25, 0.1
    emission_raw = w_bi*bi_norm + w_fm*fm_norm + w_frp*frp_norm + w_area*area_norm
    emission = max(0.05, emission_raw) * emission_multiplier
    return emission, bi_norm, fm_norm, frp_norm, area_norm

def compute_loft(bi_norm: float, frp_norm: float, loft_multiplier: float = 1.0) -> float:
    loft = 0.5 + 1.5 * (0.6 * frp_norm + 0.4 * bi_norm)
    return clamp(loft * loft_multiplier, 0.3, 3.0)

def cone_polygon(
    *,
    lat: float,
    lon: float,
    wind_speed_m_s: float,
    wind_dir_from_deg: float,
    hours: float,
    burning_index: Optional[float] = None,
    one_hr_fm: Optional[float] = None,
    viirs_frp: Optional[float] = None,
    area_m2: Optional[float] = None,
    viirs_confidence: Optional[float] = None,
    emission_multiplier: float = 1.0,
    diffusion_multiplier: float = 1.0,
    loft_multiplier: float = 1.0,
    suppress_small_fires: bool = True,
    n_segs: int = 40,
) -> Optional[Tuple[Dict[str, Any], Dict[str, Any]]]:
    emission, bi_norm, fm_norm, frp_norm, area_norm = compute_emission_factor(
        burning_index=burning_index,
        one_hr_fm=one_hr_fm,
        viirs_frp=viirs_frp,
        area_m2=area_m2,
        emission_multiplier=emission_multiplier,
    )
    loft = compute_loft(bi_norm, frp_norm, loft_multiplier=loft_multiplier)

    if suppress_small_fires:
        if (
            (emission < 0.08 and (viirs_frp or 0) < 30 and (area_m2 or 0) < 10_000 and (viirs_confidence or 0) < 40)
            or ((viirs_confidence or 0) < 40 and (burning_index or 0) < 40 and (area_m2 or 0) < 5_000)
        ):
            return None

    base_distance_m = max(wind_speed_m_s, 0.0) * 3600.0 * hours
    plume_length_m = max(200.0, base_distance_m * (0.8 + 1.2 * emission) * loft)
    base_width_m = max(100.0, plume_length_m * 0.03)
    plume_width_m = base_width_m * (1.0 + 2.5 * math.sqrt(hours) * (0.6 + 0.4 * (1.0 - fm_norm)))
    plume_width_m *= diffusion_multiplier

    bearing_to = (wind_dir_from_deg + 180.0) % 360.0
    half_angle = clamp(math.degrees(math.atan((plume_width_m / 2.0) / max(plume_length_m, 1.0))), 2.0, 40.0)

    pts: List[Tuple[float, float]] = [(lon, lat)]
    for i in range(n_segs + 1):
        frac = i / n_segs
        angle = bearing_to - half_angle + (2 * half_angle) * frac
        r = plume_length_m * (frac ** 0.9)
        dest_lon, dest_lat, _ = geod.fwd(lon, lat, angle, r)
        pts.append((dest_lon, dest_lat))
    pts.append((lon, lat))

    poly = Polygon(pts)
    if not poly.is_valid or poly.is_empty:
        return None

    return mapping(poly), {
        "plume_length_m": plume_length_m,
        "plume_width_m": plume_width_m,
        "emission_factor": emission,
        "loft": loft,
        "BI_norm": bi_norm,
        "FM_norm": fm_norm,
        "FRP_norm": frp_norm,
        "AREA_norm": area_norm,
    }

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6_371_000.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def nearest_station(lat: float, lon: float, stations: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    best = None
    best_d = float("inf")
    for s in stations:
        slat = s.get("latitude")
        slon = s.get("longitude")
        if slat is None or slon is None:
            continue
        d = haversine(lat, lon, slat, slon)
        if d < best_d:
            best_d = d
            best = s
    return best

# ---------------- models ----------------
class PlumeRequest(BaseModel):
    lat: Optional[float] = Field(None)
    lon: Optional[float] = Field(None)
    geometry: Optional[Dict[str, Any]] = Field(None, description="GeoJSON Polygon ignition area")
    hours: List[float] = Field(default_factory=lambda: DEFAULT_HOURS.copy())
    wind_speed: Optional[float] = Field(None, description="m/s")
    wind_dir_from: Optional[float] = Field(None, ge=0, le=360)
    burning_index: Optional[float] = Field(None, ge=0)
    one_hr_fm: Optional[float] = Field(None, ge=0)
    viirs_frp: Optional[float] = Field(None, ge=0)
    viirs_confidence: Optional[float] = Field(None, ge=0, le=100)
    area_m2: Optional[float] = Field(None, ge=0)
    station_id: Optional[int] = Field(None, ge=0)
    emission_multiplier: float = Field(1.0, ge=0.1, le=3.0)
    diffusion_multiplier: float = Field(1.0, ge=0.5, le=3.0)
    loft_multiplier: float = Field(1.0, ge=0.5, le=3.0)
    suppress_small_fires: bool = False

    @field_validator("hours")
    @classmethod
    def validate_hours(cls, v: List[float]) -> List[float]:
        if not v:
            raise ValueError("hours cannot be empty")
        vv = sorted(set(float(h) for h in v if h > 0))
        if not vv:
            raise ValueError("at least one positive hour required")
        if len(vv) > 12:
            raise ValueError("too many hours")
        return vv

class PlumeFrame(BaseModel):
    hours: float
    geojson: Dict[str, Any]
    meta: Dict[str, Any]

class PlumeResponse(BaseModel):
    frames: List[PlumeFrame]
    source: str = "approx_cone_v1"

# ------------- helpers -------------
def resolve_geometry(
    geometry: Optional[Dict[str, Any]],
    lat: Optional[float],
    lon: Optional[float],
    area_override_m2: Optional[float],
) -> Tuple[float, float, Optional[float]]:
    if geometry is None:
        if lat is None or lon is None:
            raise HTTPException(status_code=400, detail="Provide geometry or lat/lon")
        return lat, lon, area_override_m2
    try:
        geom: BaseGeometry = shape(geometry)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid geometry: {e}")
    if geom.is_empty:
        raise HTTPException(status_code=400, detail="Empty geometry")
    c = geom.centroid
    if area_override_m2 is not None:
        return c.y, c.x, area_override_m2
    area, _ = geod.geometry_area_perimeter(geom)
    return c.y, c.x, abs(area)

def fetch_station_context(
    *,
    lat: float,
    lon: float,
    station_id: Optional[int],
    need_weather: bool,
    need_nfdrs: bool,
) -> Tuple[Optional[int], Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    stations_resp = fems_api.get_ny_stations()
    stations = stations_resp.get("data", {}).get("stationMetaData", {}).get("data", [])
    selected = None
    if station_id is not None:
        for s in stations:
            if s.get("station_id") == station_id:
                selected = s
                break
    if selected is None:
        selected = nearest_station(lat, lon, stations)
    if selected is None:
        return None, None, None
    sid = selected.get("station_id")
    weather_obs = None
    nfdrs_obs = None
    if need_weather:
        w_resp = fems_api.get_weather_observations(str(sid), hours_back=3)
        wlist = w_resp.get("data", {}).get("weatherObs", {}).get("data", [])
        if wlist:
            weather_obs = wlist[-1]
    if need_nfdrs:
        n_resp = fems_api.get_nfdrs_observations(str(sid), days_back=1)
        nlist = n_resp.get("data", {}).get("nfdrsObs", {}).get("data", [])
        if nlist:
            nfdrs_obs = nlist[-1]
    return sid, weather_obs, nfdrs_obs

# ------------- route -------------
@router.post("/plume", response_model=PlumeResponse)
async def plume(req: PlumeRequest = Body(...)) -> PlumeResponse:
    lat, lon, derived_area = resolve_geometry(req.geometry, req.lat, req.lon, req.area_m2)
    area_m2 = derived_area

    need_weather = not (req.wind_speed and req.wind_dir_from is not None)
    need_nfdrs = not (req.burning_index and req.one_hr_fm is not None)

    station_id, weather_obs, nfdrs_obs = fetch_station_context(
        lat=lat,
        lon=lon,
        station_id=req.station_id,
        need_weather=need_weather,
        need_nfdrs=need_nfdrs,
    )

    wind_speed_m_s = req.wind_speed
    wind_dir_from = req.wind_dir_from

    if need_weather and weather_obs:
        ws = safe_float(weather_obs.get("wind_speed"))
        wd = safe_float(weather_obs.get("wind_direction"), 180.0)
        if ws is not None:
            # assume station wind speed is mph if small
            wind_speed_m_s = wind_speed_m_s or (ws * MPS_PER_MPH)
        wind_dir_from = wind_dir_from if wind_dir_from is not None else wd

    if need_nfdrs and nfdrs_obs:
        if req.burning_index is None:
            req.burning_index = safe_float(nfdrs_obs.get("burning_index"), 30.0)
        if req.one_hr_fm is None:
            req.one_hr_fm = safe_float(nfdrs_obs.get("one_hr_tl_fuel_moisture"), 10.0)

    wind_speed_m_s = wind_speed_m_s or 2.0
    wind_dir_from = wind_dir_from if wind_dir_from is not None else 180.0

    frames: List[PlumeFrame] = []
    for h in req.hours:
        res = cone_polygon(
            lat=lat,
            lon=lon,
            wind_speed_m_s=wind_speed_m_s,
            wind_dir_from_deg=wind_dir_from,
            hours=h,
            burning_index=req.burning_index,
            one_hr_fm=req.one_hr_fm,
            viirs_frp=req.viirs_frp,
            area_m2=area_m2,
            viirs_confidence=req.viirs_confidence,
            emission_multiplier=req.emission_multiplier,
            diffusion_multiplier=req.diffusion_multiplier,
            loft_multiplier=req.loft_multiplier,
            suppress_small_fires=req.suppress_small_fires,
        )
        if res:
            geojson_poly, meta = res
            meta.update({
                "hours": h,
                "wind_speed_m_s": wind_speed_m_s,
                "wind_dir_from": wind_dir_from,
                "burning_index": req.burning_index,
                "one_hr_fm": req.one_hr_fm,
                "station_id": station_id,
                "area_m2": area_m2,
            })
            frames.append(PlumeFrame(hours=h, geojson=geojson_poly, meta=meta))

    return PlumeResponse(frames=frames, source="approx_cone_v1")
