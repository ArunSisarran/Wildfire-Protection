import React, { useEffect, useRef, useContext } from 'react';
import { FireRiskContext } from '../context/FireRiskContext';
import { NY_CONFIG, RISK_LEVELS } from '../utils/constants';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

interface MapContainerProps {
  showHeatmap: boolean;
}

declare global {
  interface Window {
    google: any;
  }
}

const MapContainer: React.FC<MapContainerProps> = ({ showHeatmap }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const heatmapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  
  const { assessment, setSelectedStation } = useContext(FireRiskContext);
  const { isLoaded, loadError } = useGoogleMaps();

  useEffect(() => {
    if (!isLoaded || !mapRef.current || googleMapRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: NY_CONFIG.center,
      zoom: NY_CONFIG.defaultZoom,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#e9f3ff' }]
        },
        {
          featureType: 'landscape',
          elementType: 'geometry',
          stylers: [{ color: '#f5f8fa' }]
        }
      ]
    });

    googleMapRef.current = map;
  }, [isLoaded]);

  useEffect(() => {
    if (!googleMapRef.current || !assessment || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Clear existing heatmap
    if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
    }

    if (showHeatmap && assessment.assessments) {
      // Create heatmap data
      const heatmapData = assessment.assessments.map(station => ({
        location: new window.google.maps.LatLng(station.latitude, station.longitude),
        weight: station.risk_score / 10
      }));

      // Create heatmap layer
      const heatmap = new window.google.maps.visualization.HeatmapLayer({
        data: heatmapData,
        map: googleMapRef.current,
        radius: 50,
        opacity: 0.7,
        gradient: [
          'rgba(0, 255, 0, 0)',
          'rgba(0, 255, 0, 1)',
          'rgba(132, 204, 22, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(249, 115, 22, 1)',
          'rgba(220, 38, 38, 1)'
        ]
      });

      heatmapRef.current = heatmap;

      // Add station markers
      assessment.assessments.forEach(station => {
        const riskInfo = Object.values(RISK_LEVELS).find(
          level => station.risk_score >= level.range[0] && station.risk_score < level.range[1]
        ) || RISK_LEVELS.EXTREME;

        const marker = new window.google.maps.Marker({
          position: { lat: station.latitude, lng: station.longitude },
          map: googleMapRef.current,
          title: station.station_name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: riskInfo.color,
            fillOpacity: 0.8,
            strokeColor: 'white',
            strokeWeight: 2
          }
        });

        marker.addListener('click', () => {
          setSelectedStation(station);
        });

        markersRef.current.push(marker);
      });
    }
  }, [assessment, showHeatmap, setSelectedStation]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load Google Maps</p>
          <p className="text-gray-600 text-sm">Please check your API key configuration</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="w-full h-full" />;
};

export default MapContainer;
