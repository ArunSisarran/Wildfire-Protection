import { useEffect, useRef } from 'react';

const GOOGLE_MAPS_API_KEY = "AIzaSyA4DT2xWZNTMuzN9MozXHHu2VgE4GKaOWU";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function WildfireMap() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: google.maps.Map | null = null;
    let markers: google.maps.Marker[] = [];
    let script: HTMLScriptElement | null = null;
    let isMounted = true;

    // Helper to get marker color by risk level
    const getMarkerIcon = (riskLevel: string | undefined) => {
      if (!riskLevel) return 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';
      switch (riskLevel.toLowerCase()) {
        case 'high':
          return 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
        case 'moderate':
        case 'medium':
          return 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png';
        case 'low':
          return 'https://maps.google.com/mapfiles/ms/icons/green-dot.png';
        default:
          return 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';
      }
    };

    // Helper to add markers and fit bounds
    const addMarkers = (stations: any[], showRisk = true) => {
      if (!map) return;
      // Remove old markers
      markers.forEach(marker => marker.setMap(null));
      markers = stations.map((station, idx) => {
        // Always assign risk level by index for demo
        let riskLevel;
        if (idx % 3 === 0) riskLevel = 'HIGH';
        else if (idx % 3 === 1) riskLevel = 'MODERATE';
        else riskLevel = 'LOW';
        const marker = new window.google.maps.Marker({
          position: { lat: station.latitude, lng: station.longitude },
          map,
          title: station.station_name,
          icon: {
            url: getMarkerIcon(showRisk ? riskLevel : undefined),
            scaledSize: new window.google.maps.Size(40, 40),
          },
        });
        let infoContent = `<strong>${station.station_name}</strong>`;
        if (showRisk && riskLevel !== undefined && station.risk_score !== undefined) {
          infoContent += `<br/>Risk Level: ${riskLevel}<br/>Risk Score: ${station.risk_score}`;
        }
        const info = new window.google.maps.InfoWindow({
          content: infoContent
        });
        marker.addListener('click', () => info.open(map, marker));
        return marker;
      });
      // Fit map to markers
      if (stations.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        stations.forEach(station => {
          bounds.extend({ lat: station.latitude, lng: station.longitude });
        });
        map.fitBounds(bounds);
      }
      console.log('[WildfireMap] Markers added:', stations);
    };

    // Load Google Maps script
    script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=visualization,drawing`;
    script.setAttribute('async', '');
    script.setAttribute('defer', '');
    script.onload = async () => {
      if (window.google && mapRef.current && isMounted) {
        map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 42.9, lng: -75.5 }, // NY State center
          zoom: 6,
        });
        // Fetch fire risk assessment data and add markers
        try {
          const res = await fetch(`${API_BASE_URL}/api/fire-risk/assessment?limit=10`);
          const data = await res.json();
          console.log('[WildfireMap] Assessment API data:', data);
          if (data && Array.isArray(data.assessments) && data.assessments.length > 0) {
            addMarkers(data.assessments, true);
          } else {
            // Fallback: fetch all NY stations
            const stationsRes = await fetch(`${API_BASE_URL}/api/stations/ny`);
            const stations = await stationsRes.json();
            console.log('[WildfireMap] NY Stations fallback data:', stations);
            if (Array.isArray(stations) && stations.length > 0) {
              addMarkers(stations, false);
            } else {
              console.warn('[WildfireMap] No station data available for markers.');
            }
          }
        } catch (err) {
          console.error('[WildfireMap] Error fetching or plotting markers:', err);
        }
      }
    };
    document.body.appendChild(script);
    return () => {
      isMounted = false;
      if (script) document.body.removeChild(script);
      markers.forEach(marker => marker.setMap(null));
    };
  }, []);

  return (
    <div>
      <div ref={mapRef} style={{ width: '100%', height: '500px', borderRadius: '12px', border: '1px solid #fbbf24', margin: '24px 0' }} />
    </div>
  );
}
