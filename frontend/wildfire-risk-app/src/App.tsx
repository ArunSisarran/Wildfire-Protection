import React, { useState, useContext } from 'react';
import { FireRiskProvider, FireRiskContext } from './context/FireRiskContext';
import EnhancedMap from './components/EnhancedMap';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import FireRiskLegend from './components/FireRiskLegend';
import ChatPanel from './components/ChatPanel';
import MissionPopup from './components/MissionPopup';

const AppContent: React.FC = () => {
  const { fireLocations, addFireLocation, clearFireLocations } = useContext(FireRiskContext);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPlumes, setShowPlumes] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMissionOpen, setIsMissionOpen] = useState(true); // Open by default on first visit

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-800">
      <Header onShowMission={() => setIsMissionOpen(true)} />
      <Sidebar />
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
      />
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
