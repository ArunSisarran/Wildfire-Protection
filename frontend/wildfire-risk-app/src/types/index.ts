export interface Coordinates {
  lat: number;
  lng: number;
}

export interface NYBounds {
  north: number;
  south: number;
  west: number;
  east: number;
}

export interface FireLocation {
  id: string;
  coordinates: Coordinates;
  timestamp: string;
  area_m2?: number;
}

export interface PlumeData {
  frames: PlumeFrame[];
  source: string;
}

export interface PlumeFrame {
  hours: number;
  geojson: any;
  meta: {
    plume_length_m: number;
    plume_width_m: number;
    emission_factor: number;
    wind_speed_m_s: number;
    wind_dir_from: number;
    [key: string]: any;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  fire_risk_data?: any;
}

export interface WeatherConditions {
  temperature?: number;
  relative_humidity?: number;
  wind_speed?: number;
  wind_direction?: number;
  hr24Precipitation?: number;
}

export interface FireIndices {
  burning_index?: number;
  ignition_component?: number;
  spread_component?: number;
  energy_release_component?: number;
  kbdi?: number;
  one_hr_tl_fuel_moisture?: number;
  ten_hr_tl_fuel_moisture?: number;
  hun_hr_tl_fuel_moisture?: number;
  thou_hr_tl_fuel_moisture?: number;
}

export interface FireRiskStation {
  station_id: number;
  station_name: string;
  latitude: number;
  longitude: number;
  risk_score: number;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'EXTREME';
  weather_conditions?: WeatherConditions;
  fire_indices?: FireIndices;
}

export interface FireRiskAssessment {
  assessment_time: string;
  total_stations: number;
  high_risk_count: number;
  summary: {
    highest_risk: FireRiskStation | null;
    average_risk: number;
  };
  assessments: FireRiskStation[];
}

export interface RiskLevel {
  color: string;
  range: [number, number];
  label: string;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface ActiveFire {
  latitude: number;
  longitude: number;
  distance_km: number;
  acquired_at?: string;
  collection: string;
  frp?: number;
  confidence?: number;
  daynight?: string;
  bright_ti4?: number;
  bright_ti5?: number;
  scan_km: number;
  track_km: number;
  estimated_area_m2: number;
  station_used?: any;
  plume_frames: PlumeFrame[];
  plume_error?: string;
}

export interface WildfireOverview {
  updated_at: string;
  expires_at: string;
  cache_hit: boolean;
  user_location: UserLocation;
  radius_km: number;
  fires: ActiveFire[];
  station_context: {
    station: any;
    weather: any;
    nfdrs: any;
    distance_km?: number;
  };
  summary: {
    total_fires: number;
    radius_km: number;
    maximum_risk_level?: string;
    risk_score?: number;
    nearest_fire_km?: number;
    smoke_eta_hours?: number;
    smoke_direction?: string;
    prevailing_wind?: string;
    warnings: string[];
  };
  chat_summary: string;
  sources: string[];
  merged_plume?: any;
}
