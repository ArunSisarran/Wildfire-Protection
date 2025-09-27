import { NYBounds, Coordinates, RiskLevel } from '../types';

export const API_BASE_URL = process.env.REACT_APP_FEMS_API_BASE_URL || 'https://your-api.vercel.app';
export const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

export const NY_CONFIG = {
  center: { lat: 42.7, lng: -75.8 } as Coordinates,
  bounds: {
    north: 45.0153,
    south: 40.4774,
    west: -79.7624,
    east: -71.7517
  } as NYBounds,
  defaultZoom: 7
};

export const RISK_LEVELS: Record<string, RiskLevel> = {
  LOW: { color: '#10b981', range: [0, 20], label: 'Low' },
  MODERATE: { color: '#84cc16', range: [20, 40], label: 'Moderate' },
  HIGH: { color: '#eab308', range: [40, 60], label: 'High' },
  VERY_HIGH: { color: '#f97316', range: [60, 80], label: 'Very High' },
  EXTREME: { color: '#dc2626', range: [80, 100], label: 'Extreme' }
};

export const API_ENDPOINTS = {
  stations: '/api/stations/ny',
  weatherObs: '/api/weather/observations',
  nfdrsObs: '/api/nfdrs/observations',
  fireRisk: '/api/fire-risk/assessment',
  percentiles: '/api/fire-danger/percentiles',
  health: '/api/health'
};

export const UPDATE_INTERVAL = 60000; // 1 minute
