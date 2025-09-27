import React, { useContext } from 'react';
import { FireRiskContext } from '../context/FireRiskContext';
import { getRiskLevelInfo, formatTimestamp } from '../utils/helpers';
import LoadingSpinner from './LoadingSpinner';

// Helper function to convert degrees to a cardinal direction
const getWindDirectionCardinal = (degrees: number | null | undefined): string => {
  if (degrees == null) return 'N/A';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

const Sidebar: React.FC = () => {
  const { assessment, loading, error, refreshData, selectedStation, setSelectedStation } = useContext(FireRiskContext);

  const renderSummary = () => {
    if (loading && !assessment) return <div className="p-8"><LoadingSpinner /></div>;
    if (error) return <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>;
    if (!assessment) return null;

    const avgRiskInfo = getRiskLevelInfo(assessment.summary.average_risk);
    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Risk Assessment</h2>
          <button onClick={refreshData} disabled={loading} className="p-2 hover:bg-white/20 rounded-full transition">
            {loading ? <LoadingSpinner size="sm" /> : '🔄'}
          </button>
        </div>
        
        {/* Average Risk Section */}
        <div className="p-4 rounded-lg bg-black/20 mb-4">
            <span className="text-sm font-medium text-white/80">Average Risk</span>
            <div className="text-3xl font-bold">{assessment.summary.average_risk.toFixed(1)}%</div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-black/20">
              <p className="text-xs font-medium text-white/70">Total Stations</p>
              <p className="text-2xl font-bold">{assessment.total_stations}</p>
            </div>
            <div className="p-3 rounded-lg bg-black/20">
              <p className="text-xs font-medium text-white/70">High Risk</p>
              <p className="text-2xl font-bold text-orange-400">{assessment.high_risk_count}</p>
            </div>
        </div>

        {/* Highest Risk Station */}
        {assessment.summary.highest_risk && (
            <div className="p-3 rounded-lg bg-red-900/50">
              <p className="text-xs font-medium text-red-200">Highest Risk Station</p>
              <p className="font-semibold">{assessment.summary.highest_risk.station_name}</p>
              <p className="text-sm text-red-300 mt-1">Score: {assessment.summary.highest_risk.risk_score.toFixed(1)}%</p>
            </div>
        )}
        <p className="text-xs text-white/50 mt-4">Updated: {formatTimestamp(assessment.assessment_time)}</p>
      </>
    );
  };

  const renderStationDetails = () => {
    if (!selectedStation) return null;
    const riskInfo = getRiskLevelInfo(selectedStation.risk_score);
    const weather = selectedStation.weather_conditions;
    const fire = selectedStation.fire_indices;

    return (
      <>
        <div className="flex items-center mb-4">
          <button onClick={() => setSelectedStation(null)} className="mr-3 p-2 hover:bg-white/20 rounded-full">
            ←
          </button>
          <h2 className="text-xl font-bold truncate" title={selectedStation.station_name}>{selectedStation.station_name}</h2>
        </div>

        <div className="p-4 rounded-lg bg-black/20 mb-4">
          <span className="text-sm font-medium text-white/80">Risk Score</span>
          <div className="text-3xl font-bold" style={{ color: riskInfo?.color }}>
            {selectedStation.risk_score.toFixed(1)}%
            <span className="text-lg ml-2 font-semibold">{riskInfo?.label}</span>
          </div>
        </div>

        {/* Weather & Fire Indices */}
        <div className="space-y-3 text-sm">
          <div>
            <h4 className="font-semibold mb-1 text-white/90">Current Weather</h4>
            <div className="p-3 rounded-lg bg-black/20 space-y-1">
              <p><strong>Wind:</strong> {getWindDirectionCardinal(weather?.wind_direction)} at {weather?.wind_speed ?? 'N/A'} mph</p>
              <p><strong>Temp:</strong> {weather?.temperature ?? 'N/A'}°F</p>
              <p><strong>Humidity:</strong> {weather?.relative_humidity ?? 'N/A'}%</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-1 text-white/90">Fire Indices</h4>
            <div className="p-3 rounded-lg bg-black/20 space-y-1">
              <p><strong>Burning Index:</strong> {fire?.burning_index?.toFixed(0) ?? 'N/A'}</p>
              <p><strong>Spread Comp:</strong> {fire?.spread_component?.toFixed(0) ?? 'N/A'}</p>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <aside className="absolute top-0 left-0 h-full w-[400px] bg-gray-900/80 backdrop-blur-lg text-white p-6 z-20 overflow-y-auto">
      {selectedStation ? renderStationDetails() : renderSummary()}
    </aside>
  );
};

export default Sidebar;