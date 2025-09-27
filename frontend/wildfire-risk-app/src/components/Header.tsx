import React from 'react';

interface HeaderProps {
  onShowMission: () => void;
}

const Header: React.FC<HeaderProps> = ({ onShowMission }) => {
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
      <div className="pointer-events-auto">
        <button
          onClick={onShowMission}
          className="bg-white/90 text-gray-800 font-semibold px-4 py-2 rounded-lg shadow-lg hover:bg-white transition"
        >
          Our Mission
        </button>
      </div>
    </header>
  );
};

export default Header;