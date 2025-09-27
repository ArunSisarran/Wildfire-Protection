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

interface StationPlume {
  stationId: number;
  stationName: string;
  plume: PlumeData;
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

  const [stationPlume, setStationPlume] = useState<StationPlume | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const animatedPlumeRef = useRef<any>(null);
  const animationFrameIdRef = useRef<number | null>(null);


  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || googleMapRef.current || !window.google?.maps) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: NY_CONFIG.center,
      zoom: NY_CONFIG.defaultZoom,
      mapTypeControl: true, streetViewControl: false, fullscreenControl: true,
      styles: [{ featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1e40af' }] }]
    });

    map.addListener('click', (event: any) => {
      if (isDrawingMode) {
        const fireLocation: FireLocation = {
          id: uuidv4(),
          coordinates: { lat: event.latLng.lat(), lng: event.latLng.lng() },
          timestamp: new Date().toISOString(),
          area_m2: 10000
        };
        onFireLocationAdd(fireLocation);
        setIsDrawingMode(false);
      }
    });
    googleMapRef.current = map;
  }, [isLoaded, isDrawingMode, onFireLocationAdd]);

  // Create markers and heatmap
  useEffect(() => {
    if (!googleMapRef.current || !assessment?.assessments) return;
    if (showHeatmap && !window.google?.maps?.visualization) return;

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
        heatmapRef.current = null;
    }

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
                    points.push({
                        location: new window.google.maps.LatLng(
                            station.latitude + radius * Math.cos(angle),
                            station.longitude + radius * Math.sin(angle)
                        ),
                        weight: weight * 0.6
                    });
                }
                return points;
            });

        heatmapRef.current = new window.google.maps.visualization.HeatmapLayer({
            data: heatmapData, map: googleMapRef.current,
            radius: 100, opacity: 0.8, gradient: HEATMAP_GRADIENT,
            maxIntensity: 2.0, dissipating: false
        });
    }

    assessment.assessments.forEach((station: any) => {
        if (station.latitude == null || station.longitude == null) return;
        const riskInfo = Object.values(RISK_LEVELS).find(
            level => station.risk_score >= level.range[0] && station.risk_score < level.range[1]
        ) || RISK_LEVELS.EXTREME;
        const marker = new window.google.maps.Marker({
            position: { lat: station.latitude, lng: station.longitude },
            map: googleMapRef.current, title: station.station_name,
            icon: {
                path: window.google.maps.SymbolPath.CIRCLE, scale: 8,
                fillColor: riskInfo.color, fillOpacity: 0.8,
                strokeColor: 'white', strokeWeight: 2
            }
        });

        marker.addListener('click', async () => {
          setSelectedStation(station);
          try {
            const plumeData = await apiService.getPlumeForStation(station.station_id);
            if (plumeData && plumeData.frames.length > 0) {
              setStationPlume({
                stationId: station.station_id,
                stationName: station.station_name,
                plume: plumeData
              });
              setIsAnimating(true);
            } else {
              setStationPlume(null);
              setIsAnimating(false);
            }
          } catch (error) {
            console.error('Failed to fetch plume data:', error);
          }
        });
        markersRef.current.push(marker);
    });

    return () => {
        markersRef.current.forEach(marker => marker.setMap(null));
        if (heatmapRef.current) heatmapRef.current.setMap(null);
    };
  }, [assessment, showHeatmap, setSelectedStation]);

  // Smooth Polygon Animation
  useEffect(() => {
    const cleanupAnimation = () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      if (animatedPlumeRef.current) {
        animatedPlumeRef.current.setMap(null);
        animatedPlumeRef.current = null;
      }
    };
    
    if (!isAnimating || !stationPlume || !googleMapRef.current || !window.google?.maps) {
      cleanupAnimation();
      return;
    }

    const frames = stationPlume.plume.frames;
    if (frames.length === 0) return;

    if (!animatedPlumeRef.current) {
      animatedPlumeRef.current = new window.google.maps.Polygon({
        strokeColor: '#f97316', strokeOpacity: 0.8,
        strokeWeight: 2, fillColor: '#f97316', fillOpacity: 0.35,
        map: googleMapRef.current,
      });
    }

    const duration = 8000;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsedTime = timestamp - startTime;
      const progress = Math.min(elapsedTime / duration, 1);

      const maxHour = frames[frames.length - 1].hours;
      const targetHour = progress * maxHour;
      
      let frame1 = frames[0];
      let frame2 = frames[0];
      for (let i = 0; i < frames.length - 1; i++) {
        if (frames[i].hours <= targetHour && frames[i+1].hours >= targetHour) {
          frame1 = frames[i];
          frame2 = frames[i+1];
          break;
        }
      }
       if (progress === 1) {
        frame1 = frame2 = frames[frames.length-1];
      }

      const frame1Coords = frame1.geojson.coordinates[0];
      const frame2Coords = frame2.geojson.coordinates[0];
      const hourRange = frame2.hours - frame1.hours;
      const interpFactor = hourRange === 0 ? 1 : (targetHour - frame1.hours) / hourRange;

      // --- THIS IS THE FIX ---
      // Replaced the faulty .map() with a safer for loop.
      const interpolatedPath = [];
      const pathLength = Math.min(frame1Coords.length, frame2Coords.length);

      for (let i = 0; i < pathLength; i++) {
        const coord1 = frame1Coords[i];
        const coord2 = frame2Coords[i];

        const lat = coord1[1] + (coord2[1] - coord1[1]) * interpFactor;
        const lng = coord1[0] + (coord2[0] - coord1[0]) * interpFactor;
        interpolatedPath.push({ lat, lng });
      }
      
      animatedPlumeRef.current.setPaths(interpolatedPath);

      if (progress < 1) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationFrameIdRef.current = requestAnimationFrame(animate);

    return cleanupAnimation;
  }, [isAnimating, stationPlume]);


  if (loadError) return <div className="flex items-center justify-center h-full"><p>Failed to load map.</p></div>;
  if (!isLoaded) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2"></div></div>;

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      
      <button
        onClick={() => setIsDrawingMode(!isDrawingMode)}
        className={`absolute top-24 right-5 px-4 py-2 rounded-lg shadow-lg transition-all z-10 ${
          isDrawingMode ? 'bg-red-500 text-white animate-pulse' : 'bg-white/90 text-gray-700 hover:bg-white'
        }`}
      >
        {isDrawingMode ? 'Click Map to Place Fire' : 'Add Fire Location'}
      </button>

    </div>
  );
}


export default EnhancedMap;
