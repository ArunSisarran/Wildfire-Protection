import React from 'react';
import { FireRiskStation } from '../types';

interface HeatMapLayerProps {
  stations: FireRiskStation[];
  map: google.maps.Map | null;
  visible: boolean;
}

const HeatMapLayer: React.FC<HeatMapLayerProps> = ({ stations, map, visible }) => {
  React.useEffect(() => {
    if (!map || !visible) return;

    const heatmapData = stations.map(station => ({
      location: new google.maps.LatLng(station.latitude, station.longitude),
      weight: station.risk_score / 10
    }));

    const heatmap = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map: map,
      radius: 50,
      opacity: 0.7
    });

    return () => {
      heatmap.setMap(null);
    };
  }, [stations, map, visible]);

  return null;
};

export default HeatMapLayer;
