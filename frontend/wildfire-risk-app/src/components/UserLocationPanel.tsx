import React, { useState, useEffect } from 'react';
import { UserLocation } from '../types';
import { FaMapMarkerAlt, FaCrosshairs, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';

interface UserLocationPanelProps {
  userLocation: UserLocation;
  onLocationChange: (location: UserLocation) => void;
  className?: string;
}

const UserLocationPanel: React.FC<UserLocationPanelProps> = ({
  userLocation,
  onLocationChange,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editLat, setEditLat] = useState(userLocation.latitude.toString());
  const [editLng, setEditLng] = useState(userLocation.longitude.toString());
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    setEditLat(userLocation.latitude.toString());
    setEditLng(userLocation.longitude.toString());
  }, [userLocation]);

  const handleSave = () => {
    const lat = parseFloat(editLat);
    const lng = parseFloat(editLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid coordinates');
      return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Please enter valid coordinate ranges (Lat: -90 to 90, Lng: -180 to 180)');
      return;
    }
    
    onLocationChange({ latitude: lat, longitude: lng });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditLat(userLocation.latitude.toString());
    setEditLng(userLocation.longitude.toString());
    setIsEditing(false);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        onLocationChange(newLocation);
        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Failed to get current location. Please check your browser permissions.');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const presetLocations = [
    { name: 'New York City', lat: 40.7128, lng: -74.0060 },
    { name: 'Albany, NY', lat: 42.6526, lng: -73.7562 },
    { name: 'Buffalo, NY', lat: 42.8864, lng: -78.8784 },
    { name: 'Syracuse, NY', lat: 43.0481, lng: -76.1474 },
    { name: 'Rochester, NY', lat: 43.1566, lng: -77.6088 },
    { name: 'Adirondack Park', lat: 43.8041, lng: -74.2973 }
  ];

  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <FaMapMarkerAlt className="text-red-500" />
          Your Location
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
            title="Get current location"
          >
            <FaCrosshairs className={isLocating ? 'animate-spin' : ''} />
          </button>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              title="Edit coordinates"
            >
              <FaEdit />
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={editLat}
                onChange={(e) => setEditLat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 42.7128"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={editLng}
                onChange={(e) => setEditLng(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. -75.8"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            >
              <FaCheck /> Save
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
            >
              <FaTimes /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            <div><strong>Lat:</strong> {userLocation.latitude.toFixed(4)}</div>
            <div><strong>Lng:</strong> {userLocation.longitude.toFixed(4)}</div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Locations:
            </label>
            <select 
              onChange={(e) => {
                const location = presetLocations[parseInt(e.target.value)];
                if (location) {
                  onLocationChange({ latitude: location.lat, longitude: location.lng });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue=""
            >
              <option value="">Select a location...</option>
              {presetLocations.map((location, index) => (
                <option key={index} value={index}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserLocationPanel;