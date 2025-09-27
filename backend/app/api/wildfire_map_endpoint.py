# wildfire_map_endpoint.py
from __future__ import annotations

import logging
import math
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from shapely.geometry import Point, mapping, shape
from shapely.ops import unary_union

from .fems_endpoints import FEMSFireRiskAPI
from .plume_endpoint import MPS_PER_MPH, PlumeRequest, compute_dynamic_plume, safe_float

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/wildfire", tags=["Wildfire Map"])

# ---------------- CONFIG ----------------
# Use the MAP_KEY you provided
FIRMS_MAP_KEY = "426954fed85f21a00f77c25cabe0b9e0"

# FIRMS API base
FIRMS_API_BASE = "https://firms.modaps.eosdis.nasa.gov/api"

# Default product options (common)
DEFAULT_PRODUCT = "VIIRS_SNPP_NRT"
DEFAULT_DATASET = "Global_VIIRS_SNPP_24h"  # kept for compatibility but not used by JSON endpoint

# Geographic restrictions (CONUS)
US_BOUNDS = {
    "min_lat": 24.0,
    "max_lat": 49.5,
    "min_lon": -125.0,
    "max_lon": -66.0,
}

# Caching TTLs
CACHE_TTL_SECONDS = 3600  # result cache for each request
FIRMS_DATA_TTL_SECONDS = 1800  # cache raw FIRMS response per URL

_wildfire_cache: Dict[str, Dict[str, Any]] = {}
_firms_data_cache: Dict[str, Dict[str, Any]] = {}

fems_api = FEMSFireRiskAPI()


# ---------------- MODELS ----------------
class WildfireMapRequest(BaseModel):
    latitude: float = Field(..., description="User latitude in decimal degrees")
    longitude: float = Field(..., description="User longitude in decimal degrees")
    radius_km: float = Field(
        1000.0,
        ge=50.0,
        le=1500.0,
        description="Search radius around the user in kilometers",
    )
    dataset: str = Field(
        DEFAULT_DATASET,
        description="NASA FIRMS dataset name (ignored by JSON area endpoint)",
    )
    product: str = Field(
        DEFAULT_PRODUCT,
        description="NASA FIRMS product collection (e.g., VIIRS_SNPP_NRT, VIIRS_NOAA20_NRT, MODIS_NRT)",
    )
    confidence_threshold: int = Field(
        50, ge=0, le=100, description="Minimum fire confidence percentage"
    )
    max_fires: int = Field(
        250, ge=1, le=1000, description="Maximum number of fires to include"
    )


class SmokeRiskRequest(BaseModel):
    latitude: float = Field(..., description="User latitude in decimal degrees")
    longitude: float = Field(..., description="User longitude in decimal degrees")
    radius_km: float = Field(500.0, ge=50.0, le=1500.0, description="Fire search radius in kilometers")
    dataset: str = Field(DEFAULT_DATASET, description="FIRMS dataset identifier")
    product: str = Field(DEFAULT_PRODUCT, description="FIRMS product collection")
    confidence_threshold: int = Field(50, ge=0, le=100, description="Minimum fire confidence to include")
    max_fires: int = Field(100, ge=1, le=500, description="Maximum fires to inspect for plume overlap")


# ---------------- utilities ----------------
def _within_us(lat: float, lon: float) -> bool:
    return (
        US_BOUNDS["min_lat"] <= lat <= US_BOUNDS["max_lat"]
        and US_BOUNDS["min_lon"] <= lon <= US_BOUNDS["max_lon"]
    )


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _bearing_degrees(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_lambda = math.radians(lon2 - lon1)
    x = math.sin(d_lambda) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(
        d_lambda
    )
    bearing = math.degrees(math.atan2(x, y))
    return (bearing + 360.0) % 360.0


def _bearing_to_cardinal(bearing: Optional[float]) -> Optional[str]:
    if bearing is None:
        return None
    directions = [
        "N",
        "NNE",
        "NE",
        "ENE",
        "E",
        "ESE",
        "SE",
        "SSE",
        "S",
        "SSW",
        "SW",
        "WSW",
        "W",
        "WNW",
        "NW",
        "NNW",
    ]
    idx = int((bearing + 11.25) // 22.5) % 16
    return directions[idx]


def _bbox_from_radius(lat: float, lon: float, radius_km: float) -> Tuple[float, float, float, float]:
    # returns min_lat, max_lat, min_lon, max_lon
    lat_delta = radius_km / 111.32
    lon_scale = math.cos(math.radians(lat))
    lon_scale = lon_scale if lon_scale else 0.01
    lon_delta = radius_km / (111.32 * lon_scale)
    min_lat = max(US_BOUNDS["min_lat"], lat - lat_delta)
    max_lat = min(US_BOUNDS["max_lat"], lat + lat_delta)
    min_lon = max(US_BOUNDS["min_lon"], lon - lon_delta)
    max_lon = min(US_BOUNDS["max_lon"], lon + lon_delta)
    return min_lat, max_lat, min_lon, max_lon


def _confidence_to_percent(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    if isinstance(value, str):
        lowered = value.lower()
        if lowered in {"l", "low"}:
            return 20
        if lowered in {"n", "nominal", "m", "med", "medium"}:
            return 60
        if lowered in {"h", "high"}:
            return 90
        try:
            return int(float(value))
        except ValueError:
            return None
    return None


def _parse_acq_datetime(acq_date: Optional[str], acq_time: Optional[str]) -> Optional[str]:
    if not acq_date:
        return None
    time_str = (acq_time or "").zfill(4)
    try:
        dt = datetime.strptime(f"{acq_date} {time_str}", "%Y-%m-%d %H%M")
        return dt.replace(tzinfo=timezone.utc).isoformat()
    except Exception:
        return None


def _cache_key(
    lat: float,
    lon: float,
    radius_km: float,
    dataset: str,
    product: str,
    confidence_threshold: int,
    max_fires: int,
) -> str:
    return (
        f"{round(lat, 3)}:{round(lon, 3)}:{int(radius_km)}:"
        f"{dataset}:{product}:{confidence_threshold}:{max_fires}"
    )


# ---------------- FIRMS fetching (MAP_KEY) ----------------
def _build_firms_area_url(product: str, bbox: Tuple[float, float, float, float], days: int = 1) -> str:
    """Build the FIRMS area JSON URL using MAP_KEY."""
    min_lat, max_lat, min_lon, max_lon = bbox
    bbox_str = f"{min_lon},{min_lat},{max_lon},{max_lat}"
    return f"{FIRMS_API_BASE}/area/json/{FIRMS_MAP_KEY}/{product}/{bbox_str}/{days}"


def _build_firms_area_csv_url(product: str, bbox: Tuple[float, float, float, float], days: int = 1) -> str:
    """Build the FIRMS area CSV URL using MAP_KEY."""
    min_lat, max_lat, min_lon, max_lon = bbox
    bbox_str = f"{min_lon},{min_lat},{max_lon},{max_lat}"
    return f"{FIRMS_API_BASE}/area/csv/{FIRMS_MAP_KEY}/{product}/{bbox_str}/{days}"


def _fetch_firms_features(
    *, product: str, dataset: str, bbox: Tuple[float, float, float, float], days: int = 1
) -> List[Dict[str, Any]]:
    """
    Fetch fire detections from NASA FIRMS (JSON preferred, CSV fallback).
    Normalize into a list of {'properties': {...}} dicts.
    """
    json_url = _build_firms_area_url(product, bbox, days=days)
    csv_url = _build_firms_area_csv_url(product, bbox, days=days)
    now = datetime.now(timezone.utc)

    # 1. Try JSON
    try:
        cached = _firms_data_cache.get(json_url)
        if cached and cached["expires_at"] > now:
            rows = cached["rows"]
        else:
            logger.debug("Requesting FIRMS JSON: %s", json_url)
            resp = requests.get(json_url, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, list):
                rows = data
            elif isinstance(data, dict):
                if "data" in data and isinstance(data["data"], list):
                    rows = data["data"]
                elif "features" in data and isinstance(data["features"], list):
                    rows = [f.get("properties", {}) for f in data["features"]]
                else:
                    rows = [data]
            else:
                rows = []
            _firms_data_cache[json_url] = {"rows": rows, "expires_at": now + timedelta(seconds=FIRMS_DATA_TTL_SECONDS)}
    except Exception as exc:
        logger.warning("FIRMS JSON failed (%s). Trying CSV fallback...", exc)
        rows = []

    # 2. If JSON gave nothing, try CSV
    if not rows:
        try:
            cached = _firms_data_cache.get(csv_url)
            if cached and cached["expires_at"] > now:
                rows = cached["rows"]
            else:
                logger.debug("Requesting FIRMS CSV: %s", csv_url)
                resp = requests.get(csv_url, timeout=30)
                resp.raise_for_status()
                import csv
                from io import StringIO
                reader = csv.DictReader(StringIO(resp.text))
                rows = list(reader)
                _firms_data_cache[csv_url] = {"rows": rows, "expires_at": now + timedelta(seconds=FIRMS_DATA_TTL_SECONDS)}
        except Exception as exc:
            logger.error("NASA FIRMS request failed (both JSON and CSV): %s", exc)
            raise HTTPException(status_code=502, detail="Failed to retrieve NASA FIRMS data")

    # 3. Normalize into features
    min_lat, max_lat, min_lon, max_lon = bbox
    features: List[Dict[str, Any]] = []
    for row in rows:
        fire_lat = safe_float(row.get("latitude") or row.get("lat"))
        fire_lon = safe_float(row.get("longitude") or row.get("lon"))
        if fire_lat is None or fire_lon is None:
            continue
        if not (min_lat <= fire_lat <= max_lat and min_lon <= fire_lon <= max_lon):
            continue
        if not _within_us(fire_lat, fire_lon):
            continue
        features.append({"properties": row})

    return features


# ---------------- risk context resolver (unchanged) ----------------
def _resolve_fire_risk_context(
    lat: float, lon: float, precomputed: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    if precomputed and isinstance(precomputed, dict) and "error" not in precomputed:
        return precomputed
    try:
        from .llm_endpoint import get_fire_risk_context  # local import to avoid circular
        return get_fire_risk_context({"latitude": lat, "longitude": lon})
    except Exception as exc:
        logger.debug("Fire risk context lookup failed: %s", exc)
        return {"error": str(exc)}


# ---------------- main collector ----------------
def collect_wildfire_context(
    *,
    lat: float,
    lon: float,
    radius_km: float = 1000.0,
    dataset: str = DEFAULT_DATASET,
    product: str = DEFAULT_PRODUCT,
    confidence_threshold: int = 50,
    max_fires: int = 250,
    precomputed_fire_risk: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    if not _within_us(lat, lon):
        raise HTTPException(
            status_code=400, detail="Location must be within the contiguous United States"
        )

    radius_km = max(50.0, min(1500.0, radius_km))
    cache_key = _cache_key(lat, lon, radius_km, dataset, product, confidence_threshold, max_fires)
    now = datetime.now(timezone.utc)

    cached = _wildfire_cache.get(cache_key)
    if cached and cached["expires_at"] > now:
        cached_copy = deepcopy(cached["data"])
        cached_copy["cache_hit"] = True
        return cached_copy

    # Build bbox and fetch features (1-day default)
    bbox = _bbox_from_radius(lat, lon, radius_km)
    try:
        features = _fetch_firms_features(product=product, dataset=dataset, bbox=bbox, days=1)
    except requests.RequestException as exc:
        # raise a clear 502 for upstream issues
        logger.error("NASA FIRMS request failed: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to retrieve NASA FIRMS data")

    fires: List[Dict[str, Any]] = []
    plume_geometries: List[Any] = []

    risk_context = _resolve_fire_risk_context(lat, lon, precomputed_fire_risk)
    station_info = risk_context.get("station") or {}
    weather = risk_context.get("weather") or {}
    nfdrs = risk_context.get("nfdrs") or {}
    risk_score = safe_float(risk_context.get("risk_score"))
    risk_level = risk_context.get("risk_level")
    risk_warnings = risk_context.get("warnings", [])

    station_distance_km: Optional[float] = None
    if station_info:
        station_distance_km = _haversine_km(
            lat,
            lon,
            safe_float(station_info.get("latitude")) or lat,
            safe_float(station_info.get("longitude")) or lon,
        )

    for feature in features:
        properties = feature.get("properties", {}) or {}

        fire_lat = safe_float(properties.get("latitude"))
        fire_lon = safe_float(properties.get("longitude"))
        # compatibility keys
        if fire_lat is None:
            fire_lat = safe_float(properties.get("lat"))
        if fire_lon is None:
            fire_lon = safe_float(properties.get("lon"))

        if fire_lat is None or fire_lon is None:
            continue

        distance_km = _haversine_km(lat, lon, fire_lat, fire_lon)
        if distance_km > radius_km:
            continue

        confidence = _confidence_to_percent(properties.get("confidence"))
        if confidence_threshold and confidence is not None and confidence < confidence_threshold:
            continue

        acq_iso = _parse_acq_datetime(properties.get("acq_date"), properties.get("acq_time"))
        frp = safe_float(properties.get("frp"))
        scan = safe_float(properties.get("scan")) or 0.375
        track = safe_float(properties.get("track")) or 0.375
        estimated_area_m2 = scan * 1000.0 * track * 1000.0

        plume_frames: List[Dict[str, Any]] = []
        plume_error: Optional[str] = None

        if "error" not in risk_context:
            wind_speed_m_s = safe_float(weather.get("wind_speed"))
            if wind_speed_m_s is not None:
                wind_speed_m_s *= MPS_PER_MPH
            wind_dir_from = safe_float(weather.get("wind_direction"))
            burning_index = safe_float(nfdrs.get("burning_index"))
            one_hr_fm = safe_float(nfdrs.get("one_hr_tl_fuel_moisture"))

            plume_request = PlumeRequest(
                lat=fire_lat,
                lon=fire_lon,
                hours=[0.5, 1.0, 2.0],
                wind_speed=wind_speed_m_s,
                wind_dir_from=wind_dir_from,
                burning_index=burning_index,
                one_hr_fm=one_hr_fm,
                viirs_frp=frp,
                viirs_confidence=confidence,
                area_m2=estimated_area_m2 if estimated_area_m2 > 0 else None,
                suppress_small_fires=False,
                only_target_frames=True,
                simulation_mode="cumulative_union",
            )

            try:
                plume_response = compute_dynamic_plume(plume_request)
                for frame in plume_response.frames:
                    frame_payload = frame.model_dump()
                    plume_frames.append(frame_payload)
                    frame_geojson = frame_payload.get("geojson")
                    if frame_geojson:
                        try:
                            plume_geometries.append(shape(frame_geojson))
                        except Exception as exc:
                            logger.debug("Failed to add plume geometry: %s", exc)
            except Exception as exc:
                plume_error = f"Plume simulation failed: {exc}"
                logger.debug("Dynamic plume failed for fire: %s", exc)

        fires.append(
            {
                "latitude": fire_lat,
                "longitude": fire_lon,
                "distance_km": round(distance_km, 2),
                "acquired_at": acq_iso,
                "collection": dataset,
                "frp": frp,
                "confidence": confidence,
                "daynight": properties.get("daynight"),
                "bright_ti4": safe_float(properties.get("bright_ti4")),
                "bright_ti5": safe_float(properties.get("bright_ti5")),
                "scan_km": scan,
                "track_km": track,
                "estimated_area_m2": estimated_area_m2,
                "station_used": station_info,
                "plume_frames": plume_frames,
                "plume_error": plume_error,
            }
        )

    fires.sort(key=lambda entry: entry["distance_km"])
    fires = fires[:max_fires]

    merged_plume_geojson: Optional[Dict[str, Any]] = None
    if plume_geometries:
        try:
            merged_geometry = unary_union(plume_geometries)
            merged_plume_geojson = mapping(merged_geometry)
        except Exception as exc:
            logger.debug("Unable to compute merged plume: %s", exc)

    closest_fire = fires[0] if fires else None
    prevailing_wind_dir = safe_float(weather.get("wind_direction"))
    prevailing_wind_cardinal = _bearing_to_cardinal(prevailing_wind_dir)

    smoke_eta_hours: Optional[float] = None
    smoke_direction: Optional[str] = None
    if closest_fire and prevailing_wind_dir is not None:
        wind_speed_m_s = safe_float(weather.get("wind_speed"))
        if wind_speed_m_s is not None:
            wind_speed_m_s *= MPS_PER_MPH
            if wind_speed_m_s > 0.1:
                smoke_eta_hours = round(
                    closest_fire["distance_km"] / (wind_speed_m_s * 3.6), 1
                )
        smoke_bearing = _bearing_degrees(
            closest_fire["latitude"], closest_fire["longitude"], lat, lon
        )
        smoke_direction = _bearing_to_cardinal(smoke_bearing)

    summary = {
        "total_fires": len(fires),
        "radius_km": radius_km,
        "maximum_risk_level": risk_level,
        "risk_score": risk_score,
        "nearest_fire_km": closest_fire["distance_km"] if closest_fire else None,
        "smoke_eta_hours": smoke_eta_hours,
        "smoke_direction": smoke_direction,
        "prevailing_wind": prevailing_wind_cardinal,
        "warnings": risk_warnings,
    }

    chat_lines = [
        f"{len(fires)} satellite fire detections within {int(radius_km)} km.",
    ]
    if risk_level and risk_score is not None:
        chat_lines.append(f"Highest local fire danger: {risk_level} (score {risk_score:.1f}).")
    elif risk_level:
        chat_lines.append(f"Highest local fire danger: {risk_level}.")
    if closest_fire:
        chat_lines.append(
            f"Nearest fire is {closest_fire['distance_km']} km away; smoke may reach the area"
            f"{f' from the {smoke_direction}' if smoke_direction else ''}"
            f"{f' in ~{smoke_eta_hours} h' if smoke_eta_hours else ''}."
        )
    if prevailing_wind_cardinal:
        chat_lines.append(f"Prevailing winds blowing from {prevailing_wind_cardinal}.")
    for warning in risk_warnings or []:
        chat_lines.append(f"Warning: {warning}")

    chat_summary = " ".join(chat_lines)

    sources = [f"NASA FIRMS ({product})"]
    if "error" not in risk_context:
        sources.append("FEMS Weather Data")
        sources.append("NFDRS Fire Danger Indices")

    result = {
        "updated_at": now.isoformat(),
        "expires_at": (now + timedelta(seconds=CACHE_TTL_SECONDS)).isoformat(),
        "cache_hit": False,
        "user_location": {"latitude": lat, "longitude": lon},
        "radius_km": radius_km,
        "fires": fires,
        "station_context": {
            "station": station_info,
            "weather": weather,
            "nfdrs": nfdrs,
            "distance_km": station_distance_km,
        },
        "summary": summary,
        "chat_summary": chat_summary,
        "sources": sources,
        "merged_plume": merged_plume_geojson,
    }

    _wildfire_cache[cache_key] = {
        "data": result,
        "expires_at": now + timedelta(seconds=CACHE_TTL_SECONDS),
    }
    return deepcopy(result)


@router.post("/overview")
async def wildfire_overview(request: WildfireMapRequest):
    context = collect_wildfire_context(
        lat=request.latitude,
        lon=request.longitude,
        radius_km=request.radius_km,
        dataset=request.dataset,
        product=request.product,
        confidence_threshold=request.confidence_threshold,
        max_fires=request.max_fires,
    )
    return context


def _frame_hits_user(user_point: Point, frames: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    hits: List[Dict[str, Any]] = []
    for frame in frames or []:
        geojson = frame.get("geojson")
        if not geojson:
            continue
        try:
            plume_geom = shape(geojson)
        except Exception:
            continue
        if plume_geom.is_empty:
            continue
        if plume_geom.contains(user_point) or plume_geom.buffer(1e-6).contains(user_point):
            hits.append({"hours": frame.get("hours"), "frame": frame})
    if not hits:
        return None
    hits.sort(key=lambda item: (item["hours"] if item["hours"] is not None else float("inf")))
    return hits[0]


@router.post("/smoke-risk")
async def evaluate_smoke_risk(request: SmokeRiskRequest) -> Dict[str, Any]:
    context = collect_wildfire_context(
        lat=request.latitude,
        lon=request.longitude,
        radius_km=request.radius_km,
        dataset=request.dataset,
        product=request.product,
        confidence_threshold=request.confidence_threshold,
        max_fires=request.max_fires,
    )

    user_point = Point(request.longitude, request.latitude)
    threats: List[Dict[str, Any]] = []

    for fire in context.get("fires", []):
        hit = _frame_hits_user(user_point, fire.get("plume_frames"))
        if not hit:
            continue
        frame = hit["frame"]
        threats.append(
            {
                "fire_latitude": fire.get("latitude"),
                "fire_longitude": fire.get("longitude"),
                "fire_distance_km": fire.get("distance_km"),
                "confidence": fire.get("confidence"),
                "frp": fire.get("frp"),
                "hours_to_arrival": hit["hours"],
                "plume_frame": frame,
            }
        )

    threats.sort(key=lambda entry: entry.get("hours_to_arrival") or float("inf"))
    risk_statement = (
        f"Smoke predicted to reach the user from {len(threats)} fire(s) within {request.radius_km:.0f} km."
        if threats
        else "No modeled smoke impacts on the user within the selected radius."
    )

    return {
        "user_location": {"latitude": request.latitude, "longitude": request.longitude},
        "radius_km": request.radius_km,
        "fires_considered": len(context.get("fires", [])),
        "smoke_threats": threats,
        "risk_statement": risk_statement,
        "sources": context.get("sources", []),
        "cache_hit": context.get("cache_hit", False),
        "updated_at": context.get("updated_at"),
    }
