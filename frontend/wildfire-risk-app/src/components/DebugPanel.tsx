import React from 'react';
import { GOOGLE_MAPS_API_KEY } from '../utils/constants';

const DebugPanel: React.FC = () => {
  return (
    <div className="absolute top-4 right-4 bg-white/90 p-4 rounded-lg shadow-lg text-xs font-mono max-w-md z-50">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <div className="space-y-1">
        <div>API Key: {GOOGLE_MAPS_API_KEY ? `${GOOGLE_MAPS_API_KEY.substring(0, 10)}...` : 'MISSING'}</div>
        <div>Google Maps: {window.google ? 'Loaded' : 'Not Loaded'}</div>
        <div>Maps API: {window.google?.maps ? 'Available' : 'Not Available'}</div>
        <div>Visualization: {window.google?.maps?.visualization ? 'Available' : 'Not Available'}</div>
      </div>
    </div>
  );
};

export default DebugPanel;