import axios from 'axios';
import { FireRiskAssessment, FireRiskStation, FireLocation, PlumeData, Coordinates} from '../types';
import { generateMockStation } from '../utils/helpers';

import { API_BASE_URL, PLUME_API_BASE_URL, GEMINI_API_BASE_URL, API_ENDPOINTS, PLUME_ENDPOINTS, GEMINI_ENDPOINTS, NY_CONFIG } from '../utils/constants';

class FireRiskAPI {
  private baseURL: string;
  private plumeURL: string;
  private geminiURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.plumeURL = PLUME_API_BASE_URL;
    this.geminiURL = GEMINI_API_BASE_URL;
  }

  async fetchFireRiskAssessment(): Promise<FireRiskAssessment> {
    try {
      const response = await axios.get(`${this.baseURL}${API_ENDPOINTS.fireRisk}`);
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      return this.getMockAssessment();
    }
  }

async calculatePlume(fireLocation: FireLocation, hours: number[] = [1, 2, 4]): Promise<PlumeData> {
  try {
    const response = await axios.post(`${this.plumeURL}${PLUME_ENDPOINTS.plume}`, {
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
    const response = await axios.post(`${this.plumeURL}${PLUME_ENDPOINTS.plumeDynamic}`, {
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
    const response = await axios.post(`${this.geminiURL}${GEMINI_ENDPOINTS.chat}`, {
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
}

export default new FireRiskAPI();
