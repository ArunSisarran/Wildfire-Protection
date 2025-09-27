import React from 'react';
import { RISK_LEVELS } from '../utils/constants';

const FireRiskLegend: React.FC = () => {
  return (
    <div className="absolute top-5 right-5 bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl p-6 min-w-[220px] z-10">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Fire Risk Levels</h3>
      <div
        className="h-6 rounded-md mb-4 shadow-inner"
        style={{
          background: 'linear-gradient(90deg, #10b981 0%, #84cc16 25%, #eab308 50%, #f97316 75%, #dc2626 100%)'
        }}
      />
      <div className="space-y-2">
        {Object.entries(RISK_LEVELS).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <div
                className="w-4 h-4 rounded-full mr-2 shadow-sm"
                style={{ backgroundColor: value.color }}
              />
              <span className="font-medium">{value.label}</span>
            </div>
            <span className="text-gray-500">{value.range[0]}-{value.range[1]}%</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">Data updates every 60 seconds</p>
      </div>
    </div>
  );
};

export default FireRiskLegend;
