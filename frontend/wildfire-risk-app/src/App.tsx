import React, { useState, useContext } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import EnhancedMap from './components/EnhancedMap';
import DataPanel from './components/DataPanel';
import FireRiskLegend from './components/FireRiskLegend';
import ControlPanel from './components/ControlPanel';
import StationInfoPopup from './components/StationInfoPopup';
import ChatPanel from './components/ChatPanel';
import { FireRiskProvider, FireRiskContext } from './context/FireRiskContext';
import './styles/App.css';

const AppContent: React.FC = () => {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPlumes, setShowPlumes] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const { fireLocations, addFireLocation, clearFireLocations } = useContext(FireRiskContext);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <EnhancedMap 
        showHeatmap={showHeatmap}
        showPlumes={showPlumes}
        fireLocations={fireLocations}
        onFireLocationAdd={addFireLocation}
      />
      <DataPanel />
      <FireRiskLegend />
      <ControlPanel 
        showHeatmap={showHeatmap}
        setShowHeatmap={setShowHeatmap}
        showPlumes={showPlumes}
        setShowPlumes={setShowPlumes}
        onOpenChat={() => setIsChatOpen(true)}
        onClearFires={clearFireLocations}
        fireCount={fireLocations.length}
      />
      <StationInfoPopup />
      <ChatPanel 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <FireRiskProvider>
        <AppContent />
      </FireRiskProvider>
    </ErrorBoundary>
  );
};

export default App;
