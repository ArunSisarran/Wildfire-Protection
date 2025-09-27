import React from 'react';

interface ControlPanelProps {
  showHeatmap: boolean;
  setShowHeatmap: (show: boolean) => void;
  showPlumes: boolean;
  setShowPlumes: (show: boolean) => void;
  onOpenChat: () => void;
  onClearFires: () => void;
  fireCount: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  showHeatmap,
  setShowHeatmap,
  showPlumes,
  setShowPlumes,
  onOpenChat,
  onClearFires,
  fireCount
}) => {
  return (
    <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-lg rounded-full shadow-xl px-8 py-4 flex items-center space-x-6 z-10">
      <div className="flex items-center space-x-3">
        <span className="text-sm font-medium text-gray-700">🗺️ Heat Map</span>
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
            showHeatmap ? 'bg-green-500' : 'bg-gray-300'
          }`}
        >
          <div
            className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-md ${
              showHeatmap ? 'transform translate-x-7' : ''
            }`}
          />
        </button>
      </div>

      <div className="w-px h-8 bg-gray-300" />

      <div className="flex items-center space-x-3">
        <span className="text-sm font-medium text-gray-700">💨 Plumes</span>
        <button
          onClick={() => setShowPlumes(!showPlumes)}
          className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
            showPlumes ? 'bg-blue-500' : 'bg-gray-300'
          }`}
        >
          <div
            className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-md ${
              showPlumes ? 'transform translate-x-7' : ''
            }`}
          />
        </button>
      </div>

      {fireCount > 0 && (
        <>
          <div className="w-px h-8 bg-gray-300" />
          <button
            onClick={onClearFires}
            className="flex items-center space-x-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
          >
            <span className="text-sm font-medium">Clear ({fireCount})</span>
          </button>
        </>
      )}

      <div className="w-px h-8 bg-gray-300" />

      <button
        onClick={onOpenChat}
        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-lg transition"
      >
        <span className="text-sm font-medium">💬 AI Assistant</span>
      </button>
    </div>
  );
};

export default ControlPanel;
