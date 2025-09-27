import axios, { AxiosError } from 'axios';
import { FireRiskAssessment, FireRiskStation, ApiError } from '../types';
import { API_BASE_URL, API_ENDPOINTS, NY_CONFIG } from '../utils/constants';
import { generateMockStation } from '../utils/helpers';

class FireRiskAPIService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async fetchStations(): Promise<FireRiskStation[]> {
    try {
      const response = await axios.get(`${this.baseURL}${API_ENDPOINTS.stations}`);
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      return this.getMockStations();
    }
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

  private getMockStations(): FireRiskStation[] {
    const stations: FireRiskStation[] = [];
    const gridSize = 8;
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const lat = NY_CONFIG.bounds.south + (i / gridSize) * (NY_CONFIG.bounds.north - NY_CONFIG.bounds.south);
        const lng = NY_CONFIG.bounds.west + (j / gridSize) * (NY_CONFIG.bounds.east - NY_CONFIG.bounds.west);
        
        stations.push(generateMockStation(
          stations.length + 1,
          lat + (Math.random() - 0.5) * 0.5,
          lng + (Math.random() - 0.5) * 0.5
        ));
      }
    }
    
    return stations;
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

  handleError(error: AxiosError): ApiError {
    if (error.response) {
      return {
        message:'Server error occurred',
        status: error.response.status
      };
    }
    return {
      message: error.message || 'An unexpected error occurred',
      status: 0
    };
  }
}

export default new FireRiskAPIService();
