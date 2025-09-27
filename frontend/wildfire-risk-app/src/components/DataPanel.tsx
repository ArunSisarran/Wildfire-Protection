import React, { useContext } from 'react';
import { FireRiskContext } from '../context/FireRiskContext';
import { getRiskLevelInfo, formatTimestamp } from '../utils/helpers';
import LoadingSpinner from './LoadingSpinner';

const DataPanel: React.FC = () => {
  const { assessment, loading, error, refreshData } = useContext(FireRiskContext);

  const avgRiskInfo = assessment ? getRiskLevelInfo(assessment.summary.average_risk) : null;

  return (
    <div className="absolute top-5 left-5 bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl p-6 min-w-[360px] max-w-[420px] z-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Fire Risk Assessment</h2>
        <button
          onClick={refreshData}
          className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
          disabled={loading}
        >
          {loading ? <LoadingSpinner size="sm" /> : '🔄'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading && !assessment ? (
        <div className="py-8">
          <LoadingSpinner />
        </div>
      ) : assessment ? (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Average Risk</span>
              <div
                className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: avgRiskInfo?.color }}
              >
                {avgRiskInfo?.label}
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-800">
              {assessment.summary.average_risk.toFixed(1)}%
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${assessment.summary.average_risk}%`,
                  backgroundColor: avgRiskInfo?.color
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-1">Total Stations</p>
              <p className="text-2xl font-bold text-gray-800">{assessment.total_stations}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-1">High Risk</p>
              <p className="text-2xl font-bold text-orange-600">{assessment.high_risk_count}</p>
            </div>
          </div>

          {assessment.summary.highest_risk && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <p className="text-xs font-medium text-red-600 mb-1">Highest Risk Station</p>
              <p className="font-semibold text-gray-800">
                {assessment.summary.highest_risk.station_name}
              </p>
              <p className="text-sm text-red-600 mt-1">
                Risk Score: {assessment.summary.highest_risk.risk_score.toFixed(1)}%
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Last updated: {formatTimestamp(assessment.assessment_time)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DataPanel;
