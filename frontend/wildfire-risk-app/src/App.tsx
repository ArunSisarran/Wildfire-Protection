import React, { useState, useContext } from 'react';
import { FireRiskProvider, FireRiskContext } from './context/FireRiskContext';
import EnhancedMap from './components/EnhancedMap';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import FireRiskLegend from './components/FireRiskLegend';
import ChatPanel from './components/ChatPanel';
import MissionPopup from './components/MissionPopup';
import SimpleLocationInput from './components/SimpleLocationInput';
import DebugPanel from './components/DebugPanel';

const AppContent: React.FC = () => {
  const { 
    fireLocations, 
    addFireLocation, 
    clearFireLocations,
    userLocation,
    setUserLocation,
    wildfireOverview,
    showActiveFires,
    setShowActiveFires
  } = useContext(FireRiskContext);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPlumes, setShowPlumes] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMissionOpen, setIsMissionOpen] = useState(true);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-800">
      <Header />
      
      <Sidebar onShowMission={() => setIsMissionOpen(true)} />
      
      <main className="w-full h-full">
        <EnhancedMap
          showHeatmap={showHeatmap}
          showPlumes={showPlumes}
          fireLocations={fireLocations}
          onFireLocationAdd={addFireLocation}
        />
      </main>
      <FireRiskLegend />
      <ControlPanel
        showHeatmap={showHeatmap}
        setShowHeatmap={setShowHeatmap}
        showPlumes={showPlumes}
        setShowPlumes={setShowPlumes}
        onOpenChat={() => setIsChatOpen(true)}
        onClearFires={clearFireLocations}
        fireCount={fireLocations.length}
        showActiveFires={showActiveFires}
        setShowActiveFires={setShowActiveFires}
        activeFireCount={wildfireOverview?.fires?.length || 0}
      />
      
      <SimpleLocationInput
        userLocation={userLocation}
        onLocationChange={setUserLocation}
        className="absolute bottom-20 right-5 max-w-sm z-10"
      />
      <DebugPanel />
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <MissionPopup isOpen={isMissionOpen} onClose={() => setIsMissionOpen(false)} />
    </div>
  );
};

const App: React.FC = () => (
  <FireRiskProvider>
    <AppContent />
  </FireRiskProvider>
);

export default App;
