import React, { useEffect, useRef, useState, useCallback, useContext } from 'react';
import { FireRiskContext } from '../context/FireRiskContext';
import { FireLocation, PlumeData, ActiveFire } from '../types';
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
  
  const { 
    assessment, 
    setSelectedStation, 
    userLocation, 
    wildfireOverview, 
    loadingWildfire,
    refreshWildfireData,
    showActiveFires 
  } = useContext(FireRiskContext);
  const { isLoaded, loadError } = useGoogleMaps();
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [plumes, setPlumes] = useState<Map<string, PlumeData>>(new Map());
  const fireMarkersRealRef = useRef<any[]>([]);
  const firePlumeOverlaysRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  const [stationPlume, setStationPlume] = useState<StationPlume | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const animatedPlumeRef = useRef<any>(null);
  const animationFrameIdRef = useRef<number | null>(null);


  // Initialize map
  useEffect(() => {
    console.log('Map initialization effect', {
      isLoaded,
      hasMapRef: !!mapRef.current,
      hasGoogleMapRef: !!googleMapRef.current,
      hasGoogleMaps: !!window.google?.maps
    });

    if (!isLoaded || !mapRef.current || googleMapRef.current || !window.google?.maps) return;

    try {
      console.log('Creating Google Map instance');
      const map = new window.google.maps.Map(mapRef.current, {
        center: NY_CONFIG.center,
        zoom: NY_CONFIG.defaultZoom,
        mapTypeControl: true, 
        streetViewControl: false, 
        fullscreenControl: true,
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
      console.log('Google Map created successfully', map);
      
      // Small delay to ensure map is fully initialized
      setTimeout(() => {
        console.log('Map initialization delay complete');
      }, 100);
    } catch (error) {
      console.error('Error creating Google Map:', error);
    }
  }, [isLoaded, isDrawingMode, onFireLocationAdd]);

  // Create markers and heatmap
  useEffect(() => {
    console.log('Creating markers and heatmap', {
      hasMap: !!googleMapRef.current,
      mapInstance: googleMapRef.current,
      hasAssessment: !!assessment?.assessments,
      assessmentCount: assessment?.assessments?.length,
      showHeatmap,
      hasVisualization: !!window.google?.maps?.visualization
    });
    
    if (!googleMapRef.current || !assessment?.assessments) {
      console.log('Skipping marker/heatmap creation - missing map or assessment data');
      return;
    }
    
    // Verify the map is actually a Google Maps instance
    if (!(googleMapRef.current instanceof window.google.maps.Map)) {
      console.error('googleMapRef.current is not a valid Google Maps instance:', googleMapRef.current);
      return;
    }
    
    if (showHeatmap && !window.google?.maps?.visualization) {
      console.warn('Heatmap requested but visualization library not loaded');
      return;
    }

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
        heatmapRef.current = null;
    }

    if (showHeatmap) {
        console.log('Creating heatmap for', assessment.assessments.length, 'stations');
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

        console.log('Created heatmap data points:', heatmapData.length);
        heatmapRef.current = new window.google.maps.visualization.HeatmapLayer({
            data: heatmapData, map: googleMapRef.current,
            radius: 100, opacity: 0.8, gradient: HEATMAP_GRADIENT,
            maxIntensity: 2.0, dissipating: false
        });
        console.log('Heatmap layer created and added to map');
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

  // User location marker
  useEffect(() => {
    console.log('User location marker effect', {
      hasMap: !!googleMapRef.current,
      hasGoogleMaps: !!window.google?.maps,
      userLocation
    });

    if (!googleMapRef.current || !window.google?.maps) return;
    
    // Verify the map is actually a Google Maps instance
    if (!(googleMapRef.current instanceof window.google.maps.Map)) {
      console.error('Cannot create user marker - invalid map instance');
      return;
    }

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    userMarkerRef.current = new window.google.maps.Marker({
      position: { lat: userLocation.latitude, lng: userLocation.longitude },
      map: googleMapRef.current,
      title: 'Your Location',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#4285f4',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 3
      },
      zIndex: 1000
    });

    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
      }
    };
  }, [userLocation, isLoaded]);

  // Active fires and plumes
  useEffect(() => {
    if (!googleMapRef.current || !showActiveFires || !wildfireOverview?.fires) return;

    // Clear existing fire markers and plumes
    fireMarkersRealRef.current.forEach(marker => marker.setMap(null));
    fireMarkersRealRef.current = [];
    firePlumeOverlaysRef.current.forEach(overlay => overlay.setMap(null));
    firePlumeOverlaysRef.current = [];

    wildfireOverview.fires.forEach((fire: ActiveFire) => {
      // Fire marker
      const fireMarker = new window.google.maps.Marker({
        position: { lat: fire.latitude, lng: fire.longitude },
        map: googleMapRef.current,
        title: `Active Fire - ${fire.distance_km}km away`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: Math.max(8, Math.min(20, (fire.frp || 10) / 5)),
          fillColor: fire.confidence && fire.confidence > 80 ? '#ff4444' : '#ff8844',
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2
        },
        zIndex: 500
      });

      // Add info window for fire details
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="p-3">
            <h3 class="font-bold text-lg mb-2">Active Fire</h3>
            <p><strong>Distance:</strong> ${fire.distance_km} km</p>
            <p><strong>Confidence:</strong> ${fire.confidence || 'N/A'}%</p>
            <p><strong>Fire Power:</strong> ${fire.frp?.toFixed(1) || 'N/A'} MW</p>
            <p><strong>Acquired:</strong> ${fire.acquired_at ? new Date(fire.acquired_at).toLocaleString() : 'N/A'}</p>
            <p><strong>Collection:</strong> ${fire.collection}</p>
            ${fire.plume_frames.length > 0 ? `<p class="mt-2 text-blue-600"><strong>Plume frames:</strong> ${fire.plume_frames.length}</p>` : ''}
          </div>
        `
      });

      fireMarker.addListener('click', () => {
        infoWindow.open(googleMapRef.current, fireMarker);
      });

      fireMarkersRealRef.current.push(fireMarker);

      // Show plumes if available
      if (showPlumes && fire.plume_frames.length > 0) {
        fire.plume_frames.forEach((frame, index) => {
          const coordinates = frame.geojson?.coordinates?.[0];
          if (coordinates && coordinates.length > 0) {
            const path = coordinates.map((coord: [number, number]) => ({
              lat: coord[1],
              lng: coord[0]
            }));

            const polygon = new window.google.maps.Polygon({
              paths: path,
              strokeColor: '#ff6600',
              strokeOpacity: 0.6,
              strokeWeight: 2,
              fillColor: '#ff6600',
              fillOpacity: Math.max(0.1, 0.4 - (index * 0.1)),
              map: googleMapRef.current,
              zIndex: 100 + index
            });

            // Add plume info window
            const plumeInfoWindow = new window.google.maps.InfoWindow({
              content: `
                <div class="p-2">
                  <h4 class="font-bold">Smoke Plume - ${frame.hours}h</h4>
                  <p><strong>Length:</strong> ${(frame.meta.plume_length_m / 1000).toFixed(1)} km</p>
                  <p><strong>Width:</strong> ${(frame.meta.plume_width_m / 1000).toFixed(1)} km</p>
                  <p><strong>Wind Speed:</strong> ${frame.meta.wind_speed_m_s?.toFixed(1) || 'N/A'} m/s</p>
                </div>
              `
            });

            polygon.addListener('click', (event: any) => {
              plumeInfoWindow.setPosition(event.latLng);
              plumeInfoWindow.open(googleMapRef.current);
            });

            firePlumeOverlaysRef.current.push(polygon);
          }
        });
      }
    });

    return () => {
      fireMarkersRealRef.current.forEach(marker => marker.setMap(null));
      firePlumeOverlaysRef.current.forEach(overlay => overlay.setMap(null));
    };
  }, [wildfireOverview, showActiveFires, showPlumes, isLoaded]);

  // Refresh wildfire data when user location changes
  useEffect(() => {
    if (isLoaded) {
      refreshWildfireData();
    }
  }, [userLocation, isLoaded]);

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
