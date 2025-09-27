import React from 'react';

interface ControlsPanelProps {
  showHeatmap: boolean;
  setShowHeatmap: (show: boolean) => void;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({ showHeatmap, setShowHeatmap }) => {
  return (
    <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-lg rounded-full shadow-xl px-6 py-3 flex items-center space-x-4 z-10">
      <span className="text-sm font-medium text-gray-700">Heat Map</span>
      <button
        onClick={() => setShowHeatmap(!showHeatmap)}
        className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
          showHeatmap ? 'bg-blue-500' : 'bg-gray-300'
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-md ${
            showHeatmap ? 'transform translate-x-7' : ''
          }`}
        />
      </button>
      <span className="text-xs text-gray-500">
        {showHeatmap ? 'Visible' : 'Hidden'}
      </span>
    </div>
  );
};

export default ControlsPanel;
