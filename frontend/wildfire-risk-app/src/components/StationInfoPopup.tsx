import React, { useContext } from 'react';
import { FireRiskContext } from '../context/FireRiskContext';
import { RISK_LEVELS } from '../utils/constants';

const StationInfoPopup: React.FC = () => {
  const { selectedStation, setSelectedStation } = useContext(FireRiskContext);

  if (!selectedStation) return null;

  const riskInfo = Object.values(RISK_LEVELS).find(
    level => selectedStation.risk_score >= level.range[0] && selectedStation.risk_score < level.range[1]
  ) || RISK_LEVELS.EXTREME;

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 min-w-[320px] z-50">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-lg">{selectedStation.station_name}</h3>
        <button
          onClick={() => setSelectedStation(null)}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ×
        </button>
      </div>

      <div
        className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white mb-4"
        style={{ backgroundColor: riskInfo.color }}
      >
        {riskInfo.label} Risk
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Risk Score:</span>
          <span className="font-semibold">{selectedStation.risk_score.toFixed(1)}%</span>
        </div>

        {selectedStation.weather_conditions && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-600">Temperature:</span>
              <span>{selectedStation.weather_conditions.temperature?.toFixed(1)}°F</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Humidity:</span>
              <span>{selectedStation.weather_conditions.relative_humidity?.toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Wind Speed:</span>
              <span>{selectedStation.weather_conditions.wind_speed?.toFixed(1)} mph</span>
            </div>
          </>
        )}

        {selectedStation.fire_indices && (
          <div className="pt-2 mt-2 border-t border-gray-200">
            <div className="flex justify-between">
              <span className="text-gray-600">Burning Index:</span>
              <span>{selectedStation.fire_indices.burning_index?.toFixed(0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Spread Component:</span>
              <span>{selectedStation.fire_indices.spread_component?.toFixed(0)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StationInfoPopup;
