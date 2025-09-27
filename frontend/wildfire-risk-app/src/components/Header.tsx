import React from 'react';

// The onShowMission prop is no longer needed here
const Header: React.FC = () => {
  return (
    <header className="absolute top-0 left-0 w-full flex justify-between items-center p-4 z-20 pointer-events-none">
      <div className="pointer-events-auto">
        <h1 className="text-3xl font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Respira
        </h1>
        <p className="text-white/80 text-sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
          Wildfire Intelligence Platform
        </p>
      </div>
      {/* The button has been removed from this component */}
    </header>
  );
};

export default Header;