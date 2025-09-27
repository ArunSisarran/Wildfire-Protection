import React, { useEffect, useRef, useState, useCallback, useContext } from 'react';
import { FireRiskContext } from '../context/FireRiskContext';
import { FireLocation, PlumeData } from '../types';
import { NY_CONFIG, HEATMAP_GRADIENT, RISK_LEVELS } from '../utils/constants';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import apiService from '../services/apiService';
import { v4 as uuidv4 } from 'uuid';

interface EnhancedMapProps {
  showHeatmap: boolean;
  showPlumes: boolean;
  fireLocations: FireLocation[];
  onFireLocationAdd: (location: FireLocation) => void;
}

const EnhancedMap: React.FC<EnhancedMapProps> = ({
  showHeatmap,
  showPlumes,
  fireLocations,
  onFireLocationAdd
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const heatmapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const fireMarkersRef = useRef<any[]>([]);
  const plumeOverlaysRef = useRef<any[]>([]);
  
  const { assessment, setSelectedStation } = useContext(FireRiskContext);
  const { isLoaded, loadError } = useGoogleMaps();
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [plumes, setPlumes] = useState<Map<string, PlumeData>>(new Map());

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || googleMapRef.current || !window.google?.maps) {
      console.debug('Map initialization skipped:', {
        isLoaded,
        hasMapRef: !!mapRef.current,
        hasGoogleMapRef: !!googleMapRef.current,
        hasGoogleMaps: !!window.google?.maps
      });
      return;
    }

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
          stylers: [{ color: '#1e40af', lightness: 50 }]
        }
      ]
    });

    map.addListener('click', (event: any) => {
      if (isDrawingMode) {
        const fireLocation: FireLocation = {
          id: uuidv4(),
          coordinates: {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          },
          timestamp: new Date().toISOString(),
          area_m2: 10000
        };
        onFireLocationAdd(fireLocation);
        setIsDrawingMode(false);
      }
    });

    googleMapRef.current = map;
  }, [isLoaded, isDrawingMode, onFireLocationAdd]);

  // Create markers and heatmap with robust cleanup
  useEffect(() => {
    // Exit if map or data isn't ready
    if (!googleMapRef.current || !assessment?.assessments) {
        return;
    }

    // ** Ensure the visualization library is loaded before creating a heatmap **
    if (showHeatmap && !window.google?.maps?.visualization) {
        console.warn("Google Maps visualization library not loaded yet.");
        return;
    }

    // Clear previous markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Clear previous heatmap
    if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
        heatmapRef.current = null;
    }

    // Create new heatmap if enabled
    if (showHeatmap) {
        const heatmapData = assessment.assessments
            .filter(station => station.latitude != null && station.longitude != null)
            .flatMap(station => {
                const weight = Math.max(0.1, Math.min(1.0, station.risk_score / 100));
                const points = [{
                    location: new window.google.maps.LatLng(station.latitude, station.longitude),
                    weight: weight
                }];

                const radius = 0.25;
                const numInterpolated = 12;
                for (let i = 0; i < numInterpolated; i++) {
                    const angle = (2 * Math.PI * i) / numInterpolated;
                    const offsetLat = station.latitude + radius * Math.cos(angle);
                    const offsetLng = station.longitude + radius * Math.sin(angle);
                    points.push({
                        location: new window.google.maps.LatLng(offsetLat, offsetLng),
                        weight: weight * 0.6
                    });
                }
                return points;
            });

        heatmapRef.current = new window.google.maps.visualization.HeatmapLayer({
            data: heatmapData,
            map: googleMapRef.current,
            radius: 100,
            opacity: 0.8,
            gradient: HEATMAP_GRADIENT,
            maxIntensity: 2.0,
            dissipating: false
        });
    }

    // Create new station markers
    assessment.assessments.forEach((station: any) => {
        if (station.latitude == null || station.longitude == null) return;
        
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

        marker.addListener('click', () => setSelectedStation(station));
        markersRef.current.push(marker);
    });

    // ** Return a cleanup function to run when the effect re-triggers **
    return () => {
        markersRef.current.forEach(marker => marker.setMap(null));
        if (heatmapRef.current) {
            heatmapRef.current.setMap(null);
        }
    };
}, [assessment, showHeatmap, setSelectedStation]); // Dependencies are correct

  // Render fire markers
  useEffect(() => {
    if (!googleMapRef.current || !window.google?.maps) return;

    fireMarkersRef.current.forEach(marker => marker.setMap(null));
    fireMarkersRef.current = [];

    fireLocations.forEach(fire => {
      const marker = new window.google.maps.Marker({
        position: fire.coordinates,
        map: googleMapRef.current,
        icon: {
          url: 'data:image/svg+xml;base64,' + btoa(`
            <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
              <circle cx="15" cy="15" r="12" fill="#ef4444" opacity="0.3"/>
              <circle cx="15" cy="15" r="8" fill="#dc2626" opacity="0.8"/>
              <circle cx="15" cy="15" r="4" fill="#fbbf24"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(30, 30)
        },
        animation: window.google.maps.Animation.DROP
      });
      
      fireMarkersRef.current.push(marker);
    });
  }, [fireLocations]);

  // Calculate plumes
  const calculatePlumes = useCallback(async () => {
    for (const fire of fireLocations) {
      if (!plumes.has(fire.id)) {
        try {
          const plumeData = await apiService.calculateDynamicPlume(fire, 6);
          setPlumes(prev => new Map(prev).set(fire.id, plumeData));
        } catch (error) {
          console.error('Plume calculation failed:', error);
        }
      }
    }
  }, [fireLocations, plumes]);

  useEffect(() => {
    if (showPlumes) {
      calculatePlumes();
    }
  }, [showPlumes, calculatePlumes]);

  // Render plume overlays
  useEffect(() => {
    if (!googleMapRef.current || !window.google?.maps) return;

    plumeOverlaysRef.current.forEach(overlay => overlay.setMap(null));
    plumeOverlaysRef.current = [];

    if (!showPlumes) return;

    plumes.forEach((plumeData) => {
      plumeData.frames.forEach((frame, index) => {
        if (frame.geojson && frame.geojson.coordinates) {
          const coordinates = frame.geojson.coordinates[0].map((coord: number[]) => ({
            lat: coord[1],
            lng: coord[0]
          }));

          const opacity = Math.max(0.2, 0.5 - (index * 0.05));
          
          const plumePolygon = new window.google.maps.Polygon({
            paths: coordinates,
            strokeColor: '#6B7280',
            strokeOpacity: 0.6,
            strokeWeight: 1,
            fillColor: '#6B7280',
            fillOpacity: opacity,
            map: googleMapRef.current
          });

          plumeOverlaysRef.current.push(plumePolygon);
        }
      });
    });
  }, [plumes, showPlumes]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <p className="text-red-600">Failed to load map. Please check your API key.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      
      <button
        onClick={() => setIsDrawingMode(!isDrawingMode)}
        className={`absolute top-20 right-5 px-4 py-2 rounded-lg shadow-lg transition-all ${
          isDrawingMode
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-white text-gray-700 hover:bg-gray-100'
        }`}
      >
        {isDrawingMode ? 'Click Map to Place Fire' : 'Add Fire Location'}
      </button>
      
      {fireLocations.length > 0 && (
        <div className="absolute top-32 right-5 bg-white rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold">Active Fires: {fireLocations.length}</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedMap;
