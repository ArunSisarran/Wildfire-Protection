import axios from 'axios';
import { FireRiskAssessment, FireRiskStation, FireLocation, PlumeData, Coordinates, UserLocation, WildfireOverview, ActiveFire } from '../types';
import { generateMockStation } from '../utils/helpers';

import { API_BASE_URL, PLUME_API_BASE_URL, GEMINI_API_BASE_URL, API_ENDPOINTS, PLUME_ENDPOINTS, GEMINI_ENDPOINTS, NY_CONFIG } from '../utils/constants';

class FireRiskAPI {
  private baseURL: string;
  private plumeURL: string;
  private geminiURL: string;

  constructor() {
    this.baseURL = this.normalizeBaseUrl(API_BASE_URL);
    this.plumeURL = this.normalizeBaseUrl(PLUME_API_BASE_URL);
    this.geminiURL = this.normalizeBaseUrl(GEMINI_API_BASE_URL);
  }

  async fetchFireRiskAssessment(): Promise<FireRiskAssessment> {
    try {
  const response = await axios.get(this.buildUrl(this.baseURL, API_ENDPOINTS.fireRisk));
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      return this.getMockAssessment();
    }
  }

  async calculatePlume(fireLocation: FireLocation, hours: number[] = [1, 2, 4]): Promise<PlumeData> {
    try {
  const response = await axios.post(this.buildUrl(this.plumeURL, PLUME_ENDPOINTS.plume), {
        lat: fireLocation.coordinates.lat,
        lon: fireLocation.coordinates.lng,
        hours: hours,
        area_m2: fireLocation.area_m2 || 10000,
        emission_multiplier: 1.5,
        diffusion_multiplier: 1.2,
        suppress_small_fires: false
      });
      return response.data;
    } catch (error) {
      console.error('Plume calculation error:', error);
      return this.getMockPlume(fireLocation, hours);
    }
  }

  async calculateDynamicPlume(fireLocation: FireLocation, maxHours: number = 6): Promise<PlumeData> {
    try {
  const response = await axios.post(this.buildUrl(this.plumeURL, PLUME_ENDPOINTS.plumeDynamic), {
        lat: fireLocation.coordinates.lat,
        lon: fireLocation.coordinates.lng,
        hours: Array.from({ length: maxHours }, (_, i) => i + 1),
        area_m2: fireLocation.area_m2 || 10000,
        step_minutes: 30,
        simulation_mode: 'cumulative_union',
        emission_multiplier: 1.5,
        diffusion_multiplier: 1.2
      });
      return response.data;
    } catch (error) {
      console.error('Dynamic plume error:', error);
      return this.getMockPlume(fireLocation, [1, 2, 3, 4, 5, 6]);
    }
  }

  async sendChatMessage(message: string, sessionId: string, location?: any): Promise<any> {
    try {
  const response = await axios.post(this.buildUrl(this.geminiURL, GEMINI_ENDPOINTS.chat), {
        message,
        session_id: sessionId,
        location: location || { latitude: 42.7, longitude: -75.8 }
      });
      return response.data;
    } catch (error) {
      console.error('Chat error:', error);
      return {
        response: "I'm currently unable to connect to the server. Please try again later.",
        session_id: sessionId,
        fire_risk_data: null
      };
    }
  }

  // --- NEW FUNCTION ADDED HERE ---
  async getPlumeForStation(stationId: number): Promise<PlumeData> {
    try {
      // Calls the new FastAPI endpoint for generating a plume from a station
  const response = await axios.get(this.buildUrl(this.baseURL, `/api/stations/${stationId}/plume`));
      return response.data;
    } catch (error) {
      console.error(`Error fetching plume for station ${stationId}:`, error);
      // Fallback to mock data on error, consistent with other methods
      const mockFireLocation: FireLocation = {
        id: `station-${stationId}`,
        coordinates: { lat: NY_CONFIG.center.lat, lng: NY_CONFIG.center.lng },
        timestamp: new Date().toISOString()
      };
      return this.getMockPlume(mockFireLocation, [1, 3, 6]);
    }
  }

  async getWildfireOverview(userLocation: UserLocation, radiusKm: number = 500): Promise<WildfireOverview> {
    try {
      const response = await axios.post(this.buildUrl(this.baseURL, '/api/wildfire/overview'), {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius_km: radiusKm,
        confidence_threshold: 50,
        max_fires: 100
      });
      return response.data;
    } catch (error) {
      console.error('Wildfire overview error:', error);
      return this.getMockWildfireOverview(userLocation, radiusKm);
    }
  }

  async getSmokeRisk(userLocation: UserLocation, radiusKm: number = 500): Promise<any> {
    try {
      const response = await axios.post(this.buildUrl(this.baseURL, '/api/wildfire/smoke-risk'), {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius_km: radiusKm,
        confidence_threshold: 50,
        max_fires: 50
      });
      return response.data;
    } catch (error) {
      console.error('Smoke risk error:', error);
      return {
        user_location: userLocation,
        radius_km: radiusKm,
        fires_considered: 0,
        smoke_threats: [],
        risk_statement: "Unable to retrieve smoke risk data at this time.",
        sources: ["Mock Data"],
        cache_hit: false,
        updated_at: new Date().toISOString()
      };
    }
  }

  private normalizeBaseUrl(url?: string): string {
    if (!url) {
      return '';
    }
    return url.replace(/\/+$/, '');
  }

  private buildUrl(base: string, path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return base ? `${base}${normalizedPath}` : normalizedPath;
  }

  private getMockAssessment(): FireRiskAssessment {
    const stations = this.getMockStations();
    const highRiskStations = stations.filter(s => s.risk_score > 60);
    const avgRisk = stations.reduce((sum, s) => sum + s.risk_score, 0) / stations.length;
    
    return {
      assessment_time: new Date().toISOString(),
      total_stations: stations.length,
      high_risk_count: highRiskStations.length,
      summary: {
        highest_risk: stations.sort((a, b) => b.risk_score - a.risk_score)[0] || null,
        average_risk: avgRisk
      },
      assessments: stations
    };
  }

  private getMockStations(): FireRiskStation[] {
    const stations: FireRiskStation[] = [];
    const gridSize = 10;
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const lat = NY_CONFIG.bounds.south + (i / gridSize) * (NY_CONFIG.bounds.north - NY_CONFIG.bounds.south);
        const lng = NY_CONFIG.bounds.west + (j / gridSize) * (NY_CONFIG.bounds.east - NY_CONFIG.bounds.west);
        
        stations.push(generateMockStation(
          stations.length + 1,
          lat + (Math.random() - 0.5) * 0.3,
          lng + (Math.random() - 0.5) * 0.3
        ));
      }
    }
    
    return stations;
  }

  private getMockPlume(fireLocation: FireLocation, hours: number[]): PlumeData {
    const frames = hours.map(h => ({
      hours: h,
      geojson: this.generateMockPlumePolygon(fireLocation.coordinates, h),
      meta: {
        plume_length_m: 1000 * h,
        plume_width_m: 500 * h,
        emission_factor: 0.8,
        wind_speed_m_s: 5,
        wind_dir_from: 270
      }
    }));

    return { frames, source: 'mock' };
  }

  private generateMockPlumePolygon(center: Coordinates, hours: number): any {
    const distance = 0.01 * hours;
    const points = [];
    const numPoints = 20;
    
    for (let i = 0; i <= numPoints; i++) {
      const angle = (Math.PI * i) / numPoints;
      const lat = center.lat + distance * Math.cos(angle);
      const lng = center.lng + distance * 2 * Math.sin(angle);
      points.push([lng, lat]);
    }
    
    return {
      type: 'Polygon',
      coordinates: [points]
    };
  }

  private getMockWildfireOverview(userLocation: UserLocation, radiusKm: number): WildfireOverview {
    const mockFires: ActiveFire[] = [
      {
        latitude: userLocation.latitude + 0.1,
        longitude: userLocation.longitude + 0.1,
        distance_km: 15.2,
        acquired_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        collection: "VIIRS_SNPP_NRT",
        frp: 42.5,
        confidence: 85,
        daynight: "D",
        bright_ti4: 305.2,
        bright_ti5: 289.1,
        scan_km: 0.375,
        track_km: 0.375,
        estimated_area_m2: 140625,
        plume_frames: [
          {
            hours: 1,
            geojson: this.generateMockPlumePolygon({lat: userLocation.latitude + 0.1, lng: userLocation.longitude + 0.1}, 1),
            meta: {
              plume_length_m: 2000,
              plume_width_m: 800,
              emission_factor: 0.7,
              wind_speed_m_s: 4.5,
              wind_dir_from: 270
            }
          },
          {
            hours: 2,
            geojson: this.generateMockPlumePolygon({lat: userLocation.latitude + 0.1, lng: userLocation.longitude + 0.1}, 2),
            meta: {
              plume_length_m: 4000,
              plume_width_m: 1200,
              emission_factor: 0.7,
              wind_speed_m_s: 4.5,
              wind_dir_from: 270
            }
          }
        ]
      },
      {
        latitude: userLocation.latitude - 0.05,
        longitude: userLocation.longitude + 0.15,
        distance_km: 8.7,
        acquired_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        collection: "VIIRS_SNPP_NRT",
        frp: 28.3,
        confidence: 72,
        daynight: "D",
        bright_ti4: 298.7,
        bright_ti5: 285.4,
        scan_km: 0.375,
        track_km: 0.375,
        estimated_area_m2: 140625,
        plume_frames: [
          {
            hours: 1,
            geojson: this.generateMockPlumePolygon({lat: userLocation.latitude - 0.05, lng: userLocation.longitude + 0.15}, 1),
            meta: {
              plume_length_m: 1500,
              plume_width_m: 600,
              emission_factor: 0.5,
              wind_speed_m_s: 4.5,
              wind_dir_from: 270
            }
          }
        ]
      }
    ];

    return {
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      cache_hit: false,
      user_location: userLocation,
      radius_km: radiusKm,
      fires: mockFires,
      station_context: {
        station: { station_name: "Mock Station", latitude: userLocation.latitude, longitude: userLocation.longitude },
        weather: { wind_speed: 10, wind_direction: 270, temperature: 78, relative_humidity: 35 },
        nfdrs: { burning_index: 45, one_hr_tl_fuel_moisture: 8 },
        distance_km: 5.2
      },
      summary: {
        total_fires: mockFires.length,
        radius_km: radiusKm,
        maximum_risk_level: "HIGH",
        risk_score: 68,
        nearest_fire_km: 8.7,
        smoke_eta_hours: 2.1,
        smoke_direction: "NE",
        prevailing_wind: "W",
        warnings: ["High fire danger conditions present"]
      },
      chat_summary: `${mockFires.length} satellite fire detections within ${radiusKm} km. Highest local fire danger: HIGH (score 68.0). Nearest fire is 8.7 km away; smoke may reach the area from the NE in ~2.1 h. Prevailing winds blowing from W.`,
      sources: ["NASA FIRMS (Mock)", "FEMS Weather Data (Mock)", "NFDRS Fire Danger Indices (Mock)"]
    };
  }
}

export default new FireRiskAPI();
