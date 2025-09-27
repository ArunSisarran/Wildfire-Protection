import React, { useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import MapContainer from './components/MapContainer';
import DataPanel from './components/DataPanel';
import FireRiskLegend from './components/FireRiskLegend';
import ControlsPanel from './components/ControlsPanel';
import StationInfoPopup from './components/StationInfoPopup';
import { FireRiskProvider } from './context/FireRiskContext';
import './styles/App.css';

const App: React.FC = () => {
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);

  return (
    <ErrorBoundary>
      <FireRiskProvider>
        <div className="relative h-screen w-full">
          <MapContainer showHeatmap={showHeatmap} />
          <DataPanel />
          <FireRiskLegend />
          <ControlsPanel showHeatmap={showHeatmap} setShowHeatmap={setShowHeatmap} />
          <StationInfoPopup />
        </div>
      </FireRiskProvider>
    </ErrorBoundary>
  );
};

export default App;
