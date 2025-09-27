import { NYBounds, Coordinates, RiskLevel } from '../types';

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000';
export const PLUME_API_BASE_URL = process.env.REACT_APP_PLUME_API || 'http://127.0.0.1:8000';
export const GEMINI_API_BASE_URL = process.env.REACT_APP_GEMINI_API || 'http://127.0.0.1:8000';
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

export const HEATMAP_GRADIENT = [
  'rgba(0, 255, 0, 0)',
  'rgba(0, 255, 0, 0.6)',
  'rgba(132, 204, 22, 0.7)',
  'rgba(234, 179, 8, 0.8)',
  'rgba(249, 115, 22, 0.9)',
  'rgba(220, 38, 38, 1)'
];

export const API_ENDPOINTS = {
  stations: '/api/stations/ny',
  weatherObs: '/api/weather/observations',
  nfdrsObs: '/api/nfdrs/observations',
  fireRisk: '/api/fire-risk/assessment',
  health: '/api/health'
};

export const PLUME_ENDPOINTS = {
  plume: '/api/plume',
  plumeDynamic: '/api/plume_dynamic'
};

export const GEMINI_ENDPOINTS = {
  chat: '/api/llm/chat'
};

export const WILDFIRE_ENDPOINTS = {
  overview: '/api/wildfire/overview',
  smokeRisk: '/api/wildfire/smoke-risk'
};

export const UPDATE_INTERVAL = 600000; // 1 minute
