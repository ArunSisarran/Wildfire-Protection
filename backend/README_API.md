# Wildfire Protection Backend API Documentation

This document provides comprehensive information about all APIs available in the Wildfire Protection backend system. The APIs are organized into different modules for fire risk assessment, LLM integration, plume modeling, and wildfire detection.

## Base URL
```
http://localhost:8000
```

## Quick Start
All APIs return JSON responses and accept JSON request bodies where applicable. The system integrates multiple data sources including:
- NASA FIRMS (Fire Information for Resource Management System)
- FEMS (Fire Environment Monitoring System)
- NFDRS (National Fire Danger Rating System)
- Dynamic plume modeling
- AI-powered chat assistance

---

## 🔥 Core Fire Risk Assessment APIs

### 1. Get NY Weather Stations
**Endpoint:** `GET /api/stations/ny`

**Description:** Retrieves all weather stations in New York state with historic data.

**Request:**
```bash
curl -X GET "http://localhost:8000/api/stations/ny"
```

**Response:**
```json
[
  {
    "station_id": 301101,
    "wrcc_id": "YIRO",
    "station_name": "IROQUOIS",
    "latitude": 43.11286,
    "longitude": -78.40431,
    "elevation": 628,
    "station_type": 4,
    "station_status": "A",
    "time_zone": "EST"
  }
]
```

### 2. Get Weather Observations
**Endpoint:** `GET /api/weather/observations`

**Description:** Retrieves weather data for specified stations within a time range.

**Parameters:**
- `station_ids` (required): Comma-separated station IDs (e.g., "44731,44732")
- `hours_back` (optional): Number of hours to look back (default: 24, max: 168)

**Request:**
```bash
curl -X GET "http://localhost:8000/api/weather/observations?station_ids=301101&hours_back=24"
```

**Response:**
```json
{
  "station_ids": "301101",
  "hours_back": 24,
  "count": 1,
  "data": [
    {
      "station_id": 301101,
      "station_name": "IROQUOIS",
      "latitude": 43.11286,
      "longitude": -78.40431,
      "observation_time": "2025-09-26T06:00:00.000Z",
      "temperature": 62,
      "relative_humidity": 96,
      "wind_speed": 6,
      "wind_direction": 280,
      "hourly_precip": 0.01
    }
  ]
}
```

### 3. Get NFDRS Observations
**Endpoint:** `GET /api/nfdrs/observations`

**Description:** Retrieves National Fire Danger Rating System data for specified stations.

**Parameters:**
- `station_ids` (required): Comma-separated station IDs
- `days_back` (optional): Number of days to look back (default: 7, max: 30)

**Request:**
```bash
curl -X GET "http://localhost:8000/api/nfdrs/observations?station_ids=301101&days_back=7"
```

**Response:**
```json
{
  "station_ids": "301101",
  "days_back": 7,
  "count": 1,
  "data": [
    {
      "station_id": 301101,
      "nfdr_date": "2025-09-20",
      "fuel_model": "Y",
      "kbdi": 479,
      "one_hr_tl_fuel_moisture": 22.09,
      "ten_hr_tl_fuel_moisture": 25.3,
      "burning_index": 6.71,
      "ignition_component": 0.06,
      "spread_component": 0.44,
      "energy_release_component": 13.04
    }
  ]
}
```

### 4. Calculate Fire Risk Score
**Endpoint:** `POST /api/fire-risk/calculate`

**Description:** Calculates a fire risk score (0-100) based on NFDRS and weather data.

**Request Body:**
```json
{
  "nfdrs_data": {
    "burning_index": 6.71,
    "kbdi": 479,
    "one_hr_tl_fuel_moisture": 22.09
  },
  "weather_data": {
    "temperature": 62,
    "relative_humidity": 96,
    "wind_speed": 6
  }
}
```

**Response:**
```json
{
  "risk_score": 12.87,
  "risk_level": "LOW",
  "interpretation": "Minimal fire risk"
}
```

### 5. Comprehensive Fire Risk Assessment
**Endpoint:** `GET /api/fire-risk/assessment`

**Description:** Provides complete fire risk analysis for multiple stations with ranking.

**Parameters:**
- `station_ids` (optional): Comma-separated station IDs. If not provided, uses top 5 active NY stations
- `limit` (optional): Number of stations to assess (default: 5, max: 20)

**Request:**
```bash
curl -X GET "http://localhost:8000/api/fire-risk/assessment?limit=3"
```

**Response:**
```json
{
  "assessment_time": "2025-09-27T05:30:00.000000",
  "total_stations": 3,
  "high_risk_count": 0,
  "summary": {
    "highest_risk": {
      "station_id": 301101,
      "risk_score": 15.2,
      "risk_level": "LOW"
    },
    "average_risk": 12.5
  },
  "assessments": [...]
}
```

---

## 🌬️ Smoke Plume Modeling APIs

### 6. Generate Static Plume Forecast
**Endpoint:** `POST /api/plume`

**Description:** Generates smoke plume polygons for specified time intervals using static conditions.

**Request Body:**
```json
{
  "lat": 40.7128,
  "lon": -74.0060,
  "hours": [0.5, 1.0, 2.0],
  "wind_speed": 5.5,
  "wind_dir_from": 270,
  "burning_index": 45,
  "one_hr_fm": 8,
  "viirs_frp": 150,
  "area_m2": 50000,
  "suppress_small_fires": false
}
```

**Alternative with Geometry:**
```json
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[-74.01, 40.71], [-74.00, 40.71], [-74.00, 40.72], [-74.01, 40.72], [-74.01, 40.71]]]
  },
  "hours": [1.0, 2.0]
}
```

**Response:**
```json
{
  "frames": [
    {
      "hours": 0.5,
      "geojson": {
        "type": "Polygon",
        "coordinates": [[[...plume polygon coordinates...]]]
      },
      "meta": {
        "plume_length_m": 8500,
        "plume_width_m": 1200,
        "emission_factor": 0.65,
        "wind_speed_m_s": 2.46,
        "wind_dir_from": 270,
        "station_id": 301101
      }
    }
  ],
  "source": "approx_cone_v1"
}
```

### 7. Generate Dynamic Plume Forecast
**Endpoint:** `POST /api/plume_dynamic`

**Description:** Generates time-evolved plume forecasts by simulating plume movement step-by-step.

**Request Body:**
```json
{
  "lat": 40.7128,
  "lon": -74.0060,
  "hours": [1.0, 2.0, 4.0],
  "step_minutes": 30,
  "simulation_mode": "cumulative_union",
  "only_target_frames": true,
  "wind_speed": 4.0,
  "wind_dir_from": 225
}
```

**Simulation Modes:**
- `"segment"`: Each frame is one time step
- `"cumulative_union"`: Union of all segments up to that time
- `"cumulative_last"`: Only the latest growing segment

**Response:** Same format as static plume but with time-evolved geometry.

---

## 🛰️ Wildfire Detection & Context APIs

### 8. Wildfire Overview
**Endpoint:** `POST /api/wildfire/overview`

**Description:** Comprehensive wildfire detection around user location with satellite data, plume forecasts, and risk assessment.

**Request Body:**
```json
{
  "latitude": 46.0,
  "longitude": -121.0060,
  "radius_km": 1000,
  "dataset": "Global_VIIRS_SNPP_24h",
  "product": "VIIRS_SNPP_NRT",
  "confidence_threshold": 50,
  "max_fires": 100
}
```

**Response:**
```json
{
  "updated_at": "2025-09-27T05:27:46.130597+00:00",
  "cache_hit": false,
  "user_location": {
    "latitude": 46.0,
    "longitude": -121.006
  },
  "radius_km": 1000,
  "fires": [
    {
      "latitude": 45.123,
      "longitude": -120.456,
      "distance_km": 85.2,
      "acquired_at": "2025-09-26T14:30:00+00:00",
      "frp": 125.5,
      "confidence": 85,
      "plume_frames": [
        {
          "hours": 0.5,
          "geojson": {...},
          "meta": {...}
        }
      ]
    }
  ],
  "station_context": {
    "station": {...},
    "weather": {...},
    "nfdrs": {...}
  },
  "summary": {
    "total_fires": 15,
    "maximum_risk_level": "HIGH",
    "nearest_fire_km": 85.2,
    "smoke_eta_hours": 12.5,
    "smoke_direction": "NE",
    "prevailing_wind": "W"
  },
  "chat_summary": "15 satellite fire detections within 1000 km. Highest local fire danger: HIGH. Nearest fire is 85.2 km away; smoke may reach the area from the NE in ~12.5 h.",
  "sources": ["NASA FIRMS (VIIRS_SNPP_NRT)", "FEMS Weather Data", "NFDRS Fire Danger Indices"],
  "merged_plume": {...}
}
```

---

## 🤖 AI Chat & Intelligence APIs

### 9. Chat with Fire Risk AI
**Endpoint:** `POST /api/llm/chat`

**Description:** Interactive AI assistant for fire risk questions with context-aware responses.

**Request Body:**
```json
{
  "message": "What's the current fire risk in my area and should I be concerned?",
  "session_id": "user_123",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "name": "New York City"
  }
}
```

**Response:**
```json
{
  "response": "Based on current conditions in your area, the fire risk is currently LOW with a risk score of 12.9 out of 100. The nearest weather station shows favorable conditions with high humidity (96%) and recent precipitation. While there are no immediate fire threats, I recommend staying informed about local conditions...",
  "session_id": "user_123",
  "location_used": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "name": "New York City"
  },
  "fire_risk_data": {
    "station": {...},
    "weather": {...},
    "risk_level": "LOW",
    "risk_score": 12.9
  },
  "plume_forecast": {
    "frames": [...],
    "mode": "cumulative_union"
  },
  "wildfire_context": {
    "summary": {...},
    "fires": [...]
  },
  "sources": ["FEMS Weather Data", "NFDRS Fire Danger Indices", "Dynamic Plume Model"]
}
```

### 10. Get Chat History
**Endpoint:** `GET /api/llm/sessions/{session_id}/history`

**Description:** Retrieves conversation history for a chat session.

**Response:**
```json
{
  "session_id": "user_123",
  "messages": [
    {
      "role": "user",
      "content": "What's the fire risk?",
      "timestamp": "2025-09-27T05:30:00.000000"
    },
    {
      "role": "assistant",
      "content": "The current fire risk is LOW...",
      "timestamp": "2025-09-27T05:30:01.000000"
    }
  ]
}
```

### 11. Clear Chat Session
**Endpoint:** `DELETE /api/llm/sessions/{session_id}`

**Description:** Clears chat history for a specific session.

### 12. Location Risk Assessment
**Endpoint:** `POST /api/llm/location/risk-assessment`

**Description:** Get detailed fire risk assessment for any location.

**Request Body:**
```json
{
  "latitude": 34.0522,
  "longitude": -118.2437,
  "name": "Los Angeles, CA"
}
```

---

## 🔧 System Health & Utility APIs

### 13. Health Check
**Endpoint:** `GET /api/health`

**Description:** System health status and API connectivity check.

**Response:**
```json
{
  "status": "healthy",
  "fems_api": "connected",
  "timestamp": "2025-09-27T05:30:00.000000"
}
```

### 14. Test LLM
**Endpoint:** `GET /test-llm`

**Description:** Simple test endpoint for LLM functionality verification.

### 15. Custom GraphQL Query
**Endpoint:** `POST /api/graphql/query`

**Description:** Execute custom GraphQL queries against the FEMS API for advanced users.

**Request Body:**
```json
{
  "query": "query { stationMetaData(stateId: \"NY\", per_page: 5) { data { station_id station_name latitude longitude } } }"
}
```

---

## 📊 Data Models & Schemas

### Fire Risk Levels
- **LOW (0-19)**: Minimal fire risk, normal outdoor activities
- **MODERATE (20-39)**: Some fire risk, exercise normal caution  
- **HIGH (40-59)**: Significant fire risk, avoid outdoor burning
- **VERY HIGH (60-79)**: Dangerous conditions, extreme caution
- **EXTREME (80-100)**: Critical fire danger, follow all restrictions

### NASA FIRMS Datasets
- `Global_VIIRS_SNPP_24h`: VIIRS 375m Active Fire Product (24 hours)
- `Global_VIIRS_SNPP_48h`: VIIRS 375m Active Fire Product (48 hours)
- `Global_MODIS_24h`: MODIS Active Fire Product (24 hours)

### Wind Direction Convention
- Wind directions use meteorological convention (direction wind is coming FROM)
- 0° = North, 90° = East, 180° = South, 270° = West

---

## 🚀 Frontend Integration Examples

### React/TypeScript Integration

```typescript
// Types
interface FireRiskData {
  risk_level: string;
  risk_score: number;
  station: StationInfo;
  weather: WeatherData;
  nfdrs: NFDRSData;
}

interface WildfireOverview {
  fires: Fire[];
  summary: WildfireSummary;
  chat_summary: string;
  merged_plume: GeoJSON;
}

// API Calls
const getWildfireOverview = async (lat: number, lon: number) => {
  const response = await fetch('/api/wildfire/overview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude: lat,
      longitude: lon,
      radius_km: 1000,
      confidence_threshold: 50
    })
  });
  return response.json() as WildfireOverview;
};

const chatWithAI = async (message: string, sessionId: string) => {
  const response = await fetch('/api/llm/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      location: { latitude: userLat, longitude: userLon }
    })
  });
  return response.json();
};
```

### Map Integration
```javascript
// For Leaflet/Mapbox integration
const addFireMarkers = (map, fires) => {
  fires.forEach(fire => {
    const marker = L.marker([fire.latitude, fire.longitude])
      .bindPopup(`Fire detected: ${fire.confidence}% confidence, FRP: ${fire.frp}`)
      .addTo(map);
  });
};

const addPlumeOverlay = (map, mergedPlume) => {
  if (mergedPlume) {
    L.geoJSON(mergedPlume, {
      style: { color: 'orange', opacity: 0.6, fillOpacity: 0.3 }
    }).addTo(map);
  }
};
```

---

## 🔑 Environment Variables

Required environment variables:
```bash
# AI Integration
GEMINI_API_KEY=your_gemini_api_key_here

# NASA FIRMS Access (uses default MAP_KEY if not set)
MAP_KEY=426954fed85f21a00f77c25cabe0b9e0

# Optional
FRONTEND_URL=http://localhost:3000
FIRMS_TIMEOUT_SECONDS=25
```

---

## ⚠️ Rate Limits & Caching

- **NASA FIRMS data**: Cached for 1 hour to reduce API load
- **FEMS weather/NFDRS**: Real-time queries with fallback caching
- **Wildfire context**: Cached per location/radius combination for 1 hour
- **Chat sessions**: Kept in memory (use Redis for production)

---

## 🐛 Error Handling

All APIs return structured error responses:
```json
{
  "detail": "Error description",
  "status_code": 400
}
```

Common error codes:
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (invalid endpoint)
- `500`: Internal Server Error (system/API failures)
- `502`: Bad Gateway (external API failures)

---

## 📚 Additional Resources

- **API Documentation**: Visit `/docs` for interactive Swagger UI
- **NASA FIRMS**: https://firms.modaps.eosdis.nasa.gov/
- **FEMS System**: https://fems.azurewebsites.net/
- **NFDRS Information**: https://www.nwcg.gov/publications/pms437

For technical support or feature requests, please refer to the project repository.