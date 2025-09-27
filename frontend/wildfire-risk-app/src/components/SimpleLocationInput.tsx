import React, { useState } from 'react';
import { UserLocation } from '../types';

interface SimpleLocationInputProps {
  userLocation: UserLocation;
  onLocationChange: (location: UserLocation) => void;
  className?: string;
}

const SimpleLocationInput: React.FC<SimpleLocationInputProps> = ({
  userLocation,
  onLocationChange,
  className = ''
}) => {
  const [lat, setLat] = useState(userLocation.latitude.toString());
  const [lng, setLng] = useState(userLocation.longitude.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (!isNaN(latitude) && !isNaN(longitude)) {
      onLocationChange({ latitude, longitude });
    }
  };

  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Test Location</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="42.7"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="-75.8"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          Update Location
        </button>
      </form>
      <div className="mt-2 text-xs text-gray-600">
        Current: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
      </div>
    </div>
  );
};

export default SimpleLocationInput;