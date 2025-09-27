import { RISK_LEVELS } from './constants';
import { RiskLevel, FireRiskStation } from '../types';

export const getRiskLevel = (score: number): string => {
  if (score < 20) return 'LOW';
  if (score < 40) return 'MODERATE';
  if (score < 60) return 'HIGH';
  if (score < 80) return 'VERY_HIGH';
  return 'EXTREME';
};

export const getRiskLevelInfo = (score: number): RiskLevel & { key: string } => {
  for (const [key, value] of Object.entries(RISK_LEVELS)) {
    if (score >= value.range[0] && score < value.range[1]) {
      return { key, ...value };
    }
  }
  return { key: 'EXTREME', ...RISK_LEVELS.EXTREME };
};

export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const generateMockStation = (id: number, lat: number, lng: number): FireRiskStation => {
  const riskScore = Math.random() * 100;
  return {
    station_id: id,
    station_name: `Station ${id}`,
    latitude: lat,
    longitude: lng,
    risk_score: riskScore,
    risk_level: getRiskLevel(riskScore) as any,
    weather_conditions: {
      temperature: 65 + Math.random() * 30,
      relative_humidity: 30 + Math.random() * 50,
      wind_speed: Math.random() * 25,
      hr24Precipitation: Math.random() * 2
    },
    fire_indices: {
      burning_index: Math.random() * 100,
      ignition_component: Math.random() * 100,
      spread_component: Math.random() * 50,
      energy_release_component: Math.random() * 100,
      kbdi: 200 + Math.random() * 600,
      one_hr_tl_fuel_moisture: 5 + Math.random() * 20
    }
  };
};
