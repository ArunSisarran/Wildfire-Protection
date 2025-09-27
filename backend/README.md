# Wildfire Protection API Documentation

This document provides comprehensive documentation for all API endpoints in the Wildfire Protection system. The API is built with FastAPI and provides fire risk assessment, weather data, NFDRS (National Fire Danger Rating System) observations, LLM-powered chat functionality, and smoke plume prediction capabilities.

## Base URL

```
http://localhost:8000
```

## Authentication

Currently, no authentication is required for API endpoints.

## API Modules

The API is organized into several modules:

1. **Core FEMS Integration** (`fems_fastapi.py`) - Main fire risk assessment endpoints
2. **LLM Chat** (`llm_endpoint.py`) - AI-powered conversational interface
3. **Plume Prediction** (`plume_endpoint.py`) - Smoke plume modeling and forecasting
4. **Data Access Layer** (`fems_endpoints.py`) - Low-level FEMS API integration

---

## Core Fire Risk Assessment Endpoints

### GET `/`
**Description**: API root endpoint with basic information

**Response**:
```json
{
  "message": "FEMS Fire Risk Assessment API",
  "version": "1.0.0",
  "documentation": "/docs"
}
```

### GET `/api/stations/ny`
**Description**: Retrieve all weather stations in New York state with historic data

**Response**: Array of station information objects
```json
[
  {
    "station_id": 44731,
    "wrcc_id": "441901",
    "station_name": "ALBANY COUNTY AP",
    "latitude": 42.748,
    "longitude": -73.803,
    "elevation": 285,
    "station_type": "RAWS (SAT NFDRS)",
    "station_status": "A",
    "time_zone": "America/New_York"
  }
]
```

**Usage**: Use this endpoint to discover available weather stations for fire risk monitoring in New York state.

### GET `/api/weather/observations`
**Description**: Get current weather observations for specified stations

**Parameters**:
- `station_ids` (required): Comma-separated station IDs (e.g., "44731,44732")
- `hours_back` (optional): Number of hours to look back (default: 24, max: 168)

**Response**:
```json
{
  "station_ids": "44731,44732",
  "hours_back": 24,
  "count": 48,
  "data": [
    {
      "station_id": 44731,
      "station_name": "ALBANY COUNTY AP",
      "latitude": 42.748,
      "longitude": -73.803,
      "observation_time": "2025-09-26T14:00:00Z",
      "temperature": 72.5,
      "relative_humidity": 45,
      "wind_speed": 8.2,
      "wind_direction": 270,
      "hourly_precip": 0.0,
      "hr24Precipitation": 0.15
    }
  ]
}
```

**Usage**: Monitor real-time weather conditions that affect fire risk, including temperature, humidity, wind, and precipitation.

### GET `/api/nfdrs/observations`
**Description**: Get NFDRS (National Fire Danger Rating System) observations for fire danger assessment

**Parameters**:
- `station_ids` (required): Comma-separated station IDs
- `days_back` (optional): Number of days to look back (default: 7, max: 30)

**Response**:
```json
{
  "station_ids": "44731",
  "days_back": 7,
  "count": 7,
  "data": [
    {
      "station_id": 44731,
      "nfdr_date": "2025-09-26",
      "nfdr_time": "13:00",
      "fuel_model": "Y",
      "kbdi": 125,
      "one_hr_tl_fuel_moisture": 8.5,
      "ten_hr_tl_fuel_moisture": 12.3,
      "hun_hr_tl_fuel_moisture": 18.7,
      "thou_hr_tl_fuel_moisture": 25.4,
      "ignition_component": 85,
      "spread_component": 45,
      "energy_release_component": 78,
      "burning_index": 62
    }
  ]
}
```

**Usage**: Access fire danger indices including burning index, fuel moisture levels, and drought indicators for scientific fire risk assessment.

### GET `/api/fire-danger/percentiles`
**Description**: Get historical fire danger percentile levels for comparison with current conditions

**Parameters**:
- `station_ids` (required): Comma-separated station IDs

**Response**:
```json
{
  "station_ids": "44731",
  "count": 1,
  "data": [
    {
      "station_id": 44731,
      "kbdi": {
        "six0th": 45,
        "seven0th": 65,
        "eight0th": 95,
        "nine0th": 135,
        "nine7th": 185
      },
      "burning_index": {
        "six0th": 25,
        "seven0th": 35,
        "eight0th": 50,
        "nine0th": 75,
        "nine7th": 110
      }
    }
  ]
}
```

**Usage**: Compare current fire danger conditions against historical percentiles to understand relative risk levels.

### POST `/api/fire-risk/calculate`
**Description**: Calculate fire risk score based on NFDRS and weather data

**Request Body**:
```json
{
  "nfdrs_data": {
    "burning_index": 62,
    "ignition_component": 85,
    "one_hr_tl_fuel_moisture": 8.5,
    "kbdi": 125
  },
  "weather_data": {
    "wind_speed": 8.2,
    "relative_humidity": 45,
    "temperature": 72.5
  }
}
```

**Response**:
```json
{
  "risk_score": 67.8,
  "risk_level": "VERY HIGH",
  "interpretation": "Dangerous conditions - extreme caution advised"
}
```

**Usage**: Calculate quantitative fire risk scores from raw meteorological and fire danger data.

### GET `/api/fire-risk/assessment`
**Description**: Get comprehensive fire risk assessment combining weather, NFDRS, and risk calculations

**Parameters**:
- `station_ids` (optional): Comma-separated station IDs. If not provided, uses top 5 active NY stations
- `limit` (optional): Number of stations to assess (default: 5, max: 20)

**Response**:
```json
{
  "assessment_time": "2025-09-26T14:30:00.000Z",
  "total_stations": 5,
  "high_risk_count": 2,
  "summary": {
    "highest_risk": {
      "station_id": 44731,
      "station_name": "ALBANY COUNTY AP",
      "risk_score": 67.8,
      "risk_level": "VERY HIGH"
    },
    "average_risk": 45.2
  },
  "assessments": [
    {
      "station_id": 44731,
      "station_name": "ALBANY COUNTY AP",
      "latitude": 42.748,
      "longitude": -73.803,
      "risk_score": 67.8,
      "risk_level": "VERY HIGH",
      "weather_conditions": {
        "temperature": 72.5,
        "relative_humidity": 45,
        "wind_speed": 8.2
      },
      "fire_indices": {
        "burning_index": 62,
        "ignition_component": 85,
        "kbdi": 125
      }
    }
  ]
}
```

**Usage**: Get a complete fire risk overview for multiple stations with prioritized results and summary statistics.

### POST `/api/graphql/query`
**Description**: Execute custom GraphQL queries against the FEMS API for advanced data access

**Request Body**:
```json
{
  "query": "query { stationMetaData(stateId: \"NY\") { data { station_id station_name } } }"
}
```

**Response**: Raw GraphQL response from FEMS API

**Usage**: Advanced users can execute custom queries for specific data requirements not covered by standard endpoints.

### GET `/api/health`
**Description**: Health check endpoint to verify API and FEMS connectivity

**Response**:
```json
{
  "status": "healthy",
  "fems_api": "connected",
  "timestamp": "2025-09-26T14:30:00.000Z"
}
```

**Usage**: Monitor API health and connectivity to underlying data sources.

### GET `/test-llm`
**Description**: Simple test endpoint for LLM functionality

**Response**:
```json
{
  "status": "success",
  "test_message": "What is the current fire risk?",
  "location": {
    "latitude": 40.748817,
    "longitude": -73.985428,
    "name": "Empire State Building, New York City"
  },
  "fire_risk_level": "MODERATE",
  "ai_response": "Based on current conditions...",
  "timestamp": "2025-09-26T14:30:00.000Z"
}
```

**Usage**: Test LLM integration and verify AI response functionality.

---

## LLM Chat Endpoints

### POST `/api/llm/chat`
**Description**: Chat with AI assistant about fire risk assessment and safety recommendations

**Request Body**:
```json
{
  "message": "What is the current fire risk in my area?",
  "session_id": "user123",
  "location": {
    "latitude": 40.748817,
    "longitude": -73.985428,
    "name": "New York City"
  }
}
```

**Response**:
```json
{
  "response": "Based on current conditions near your location, the fire risk is currently MODERATE...",
  "session_id": "user123",
  "location_used": {
    "latitude": 40.748817,
    "longitude": -73.985428,
    "name": "New York City"
  },
  "fire_risk_data": {
    "risk_level": "MODERATE",
    "risk_score": 35.2,
    "station": {
      "station_name": "CENTRAL PARK",
      "distance_miles": 2.1
    }
  },
  "sources": ["FEMS Weather Data", "NFDRS Fire Danger Indices"]
}
```

**Usage**: Interactive chat interface for fire safety questions, risk explanations, and personalized recommendations.

### GET `/api/llm/sessions/{session_id}/history`
**Description**: Retrieve chat history for a specific session

**Parameters**:
- `session_id` (path): Session identifier

**Response**:
```json
{
  "session_id": "user123",
  "messages": [
    {
      "role": "user",
      "content": "What is the fire risk?",
      "timestamp": "2025-09-26T14:25:00.000Z"
    },
    {
      "role": "assistant",
      "content": "The current fire risk is MODERATE...",
      "timestamp": "2025-09-26T14:25:01.000Z"
    }
  ]
}
```

**Usage**: Retrieve conversation history for continuity and review.

### DELETE `/api/llm/sessions/{session_id}`
**Description**: Clear chat history for a specific session

**Parameters**:
- `session_id` (path): Session identifier

**Response**:
```json
{
  "message": "Session user123 cleared"
}
```

**Usage**: Clear conversation history for privacy or to start fresh.

### GET `/api/llm/location/default`
**Description**: Get default mock location and its fire risk assessment

**Response**:
```json
{
  "location": {
    "latitude": 40.748817,
    "longitude": -73.985428,
    "name": "Empire State Building, New York City"
  },
  "fire_risk_assessment": {
    "risk_level": "MODERATE",
    "risk_score": 35.2,
    "station": {
      "station_name": "CENTRAL PARK",
      "distance_miles": 2.1
    }
  }
}
```

**Usage**: Get fire risk information for the default location when user location is not available.

### POST `/api/llm/location/risk-assessment`
**Description**: Get fire risk assessment for a specific location

**Request Body**:
```json
{
  "latitude": 42.748,
  "longitude": -73.803,
  "name": "Albany, NY"
}
```

**Response**:
```json
{
  "location": {
    "latitude": 42.748,
    "longitude": -73.803,
    "name": "Albany, NY"
  },
  "fire_risk_assessment": {
    "risk_level": "HIGH",
    "risk_score": 58.7,
    "station": {
      "station_name": "ALBANY COUNTY AP",
      "distance_miles": 0.5
    },
    "weather": {
      "temperature": 72.5,
      "relative_humidity": 45,
      "wind_speed": 8.2
    },
    "nfdrs": {
      "burning_index": 62,
      "kbdi": 125
    }
  },
  "timestamp": "2025-09-26T14:30:00.000Z"
}
```

**Usage**: Get detailed fire risk assessment for any geographic location.

---

## Plume Prediction Endpoints

### POST `/api/plume`
**Description**: Generate smoke plume predictions based on fire location, weather conditions, and emission parameters

**Request Body**:
```json
{
  "lat": 42.748,
  "lon": -73.803,
  "hours": [0.5, 1.0, 2.0],
  "wind_speed": 5.2,
  "wind_dir_from": 270,
  "burning_index": 62,
  "one_hr_fm": 8.5,
  "viirs_frp": 150,
  "area_m2": 50000,
  "emission_multiplier": 1.0,
  "diffusion_multiplier": 1.0,
  "loft_multiplier": 1.0,
  "suppress_small_fires": true
}
```

**Alternative with GeoJSON polygon**:
```json
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [-73.803, 42.748],
      [-73.802, 42.748],
      [-73.802, 42.749],
      [-73.803, 42.749],
      [-73.803, 42.748]
    ]]
  },
  "hours": [1.0, 2.0, 3.0]
}
```

**Response**:
```json
{
  "frames": [
    {
      "hours": 0.5,
      "geojson": {
        "type": "Polygon",
        "coordinates": [[
          [-73.803, 42.748],
          [-73.801, 42.749],
          [-73.800, 42.750],
          [-73.803, 42.748]
        ]]
      },
      "meta": {
        "plume_length_m": 2850,
        "plume_width_m": 450,
        "emission_factor": 0.65,
        "loft": 1.2,
        "hours": 0.5,
        "wind_speed_m_s": 5.2,
        "wind_dir_from": 270,
        "burning_index": 62,
        "station_id": 44731
      }
    },
    {
      "hours": 1.0,
      "geojson": {
        "type": "Polygon",
        "coordinates": [[
          [-73.803, 42.748],
          [-73.799, 42.750],
          [-73.796, 42.752],
          [-73.803, 42.748]
        ]]
      },
      "meta": {
        "plume_length_m": 5700,
        "plume_width_m": 650,
        "emission_factor": 0.65,
        "loft": 1.2,
        "hours": 1.0
      }
    }
  ],
  "source": "approx_cone_v1"
}
```

**Parameters**:
- `lat`, `lon` (optional): Fire location coordinates. Required if geometry not provided
- `geometry` (optional): GeoJSON polygon describing fire area. Alternative to lat/lon
- `hours` (optional): Forecast time steps in hours (default: [0.5, 1.0, 2.0])
- `wind_speed` (optional): Wind speed in m/s. Auto-fetched if not provided
- `wind_dir_from` (optional): Wind direction (degrees from). Auto-fetched if not provided
- `burning_index` (optional): NFDRS burning index. Auto-fetched if not provided
- `one_hr_fm` (optional): 1-hour fuel moisture. Auto-fetched if not provided
- `viirs_frp` (optional): VIIRS fire radiative power
- `viirs_confidence` (optional): VIIRS detection confidence (0-100)
- `area_m2` (optional): Fire area in square meters
- `station_id` (optional): Override station for weather/NFDRS data
- `emission_multiplier` (optional): Scale emission intensity (0.1-3.0, default: 1.0)
- `diffusion_multiplier` (optional): Control lateral spread (0.5-3.0, default: 1.0)
- `loft_multiplier` (optional): Adjust plume height (0.5-3.0, default: 1.0)
- `suppress_small_fires` (optional): Hide plumes for low-confidence small fires (default: true)

**Usage**: 
- **Fire Response**: Model smoke dispersion from active fires for evacuation planning
- **Prescribed Burns**: Predict smoke impacts before conducting controlled burns
- **Risk Assessment**: Visualize potential smoke patterns for fire-prone areas
- **Planning**: Assess smoke impacts on communities, airports, or sensitive areas

**Suppression Logic**: Small fires are automatically suppressed if:
- Emission factor < 0.08 AND VIIRS FRP < 30 AND area < 10,000 m² AND confidence < 40%
- OR confidence < 40% AND burning index < 40 AND area < 5,000 m²

---

## Risk Level Classifications

All risk assessment endpoints use the following standardized risk levels:

- **LOW (0-19)**: Minimal fire risk, normal outdoor activities
- **MODERATE (20-39)**: Some fire risk, exercise normal caution  
- **HIGH (40-59)**: Significant fire risk, avoid outdoor burning
- **VERY HIGH (60-79)**: Dangerous conditions, extreme caution with ignition sources
- **EXTREME (80-100)**: Critical fire danger, follow all local fire restrictions

---

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (invalid endpoint)
- `500`: Internal Server Error

Error responses include detailed messages:
```json
{
  "detail": "Station IDs parameter is required"
}
```

---

## Data Sources

The API integrates with multiple authoritative data sources:

- **FEMS (Fire Environment Monitoring System)**: Weather observations and NFDRS data
- **NFDRS (National Fire Danger Rating System)**: Standardized fire danger indices
- **VIIRS**: Satellite fire detection data (optional input)
- **Google Gemini**: AI-powered conversational responses

---

## Development and Testing

### Running the API

```bash
# Install dependencies
poetry install

# Start development server
poetry run uvicorn app.api.fems_fastapi:app --reload --host 0.0.0.0 --port 8000
```

### API Documentation

Interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Health Monitoring

Use the `/api/health` endpoint to monitor API status and connectivity to external data sources.