import React from 'react';

// You might need to install a library like react-icons: npm install react-icons
import { FiCloud, FiMessageSquare, FiTrash2, FiThermometer } from 'react-icons/fi';
import { FaFire } from 'react-icons/fa'; 

interface ControlPanelProps {
  showHeatmap: boolean;
  setShowHeatmap: (show: boolean) => void;
  showPlumes: boolean;
  setShowPlumes: (show: boolean) => void;
  onOpenChat: () => void;
  onClearFires: () => void;
  fireCount: number;
  showActiveFires: boolean;
  setShowActiveFires: (show: boolean) => void;
  activeFireCount: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  showHeatmap, setShowHeatmap,
  showPlumes, setShowPlumes,
  onOpenChat, onClearFires, fireCount,
  showActiveFires, setShowActiveFires, activeFireCount
}) => {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-gray-900/80 backdrop-blur-lg rounded-full shadow-2xl p-2 z-20">
      <ControlButton
        label="Heatmap"
        icon={<FiThermometer size={20} />}
        isActive={showHeatmap}
        onClick={() => setShowHeatmap(!showHeatmap)}
        activeColor="bg-orange-500"
      />
      <ControlButton
        label="Plumes"
        icon={<FiCloud size={20} />}
        isActive={showPlumes}
        onClick={() => setShowPlumes(!showPlumes)}
        activeColor="bg-blue-500"
      />
      <ControlButton
        label={`Active Fires ${activeFireCount > 0 ? `(${activeFireCount})` : ''}`}
        icon={<FaFire size={20} />}
        isActive={showActiveFires}
        onClick={() => setShowActiveFires(!showActiveFires)}
        activeColor="bg-red-500"
      />
      
      {fireCount > 0 && (
        <ControlButton
          label={`Clear Fires (${fireCount})`}
          icon={<FiTrash2 size={20} />}
          onClick={onClearFires}
          isAction={true}
        />
      )}

      <div className="w-px h-8 bg-white/20 mx-2" />

      <ControlButton
        label="AI Assistant"
        icon={<FiMessageSquare size={20} />}
        onClick={onOpenChat}
        isAction={true}
      />
    </div>
  );
};

// --- FIX: DEFINED PROPS INTERFACE FOR THE HELPER COMPONENT ---
interface ControlButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean; // Made isActive optional to support action buttons
  activeColor?: string;
  isAction?: boolean;
}

// --- FIX: APPLIED THE PROPS INTERFACE TO THE COMPONENT ---
const ControlButton: React.FC<ControlButtonProps> = ({ 
  label, icon, isActive, onClick, activeColor = 'bg-blue-500', isAction = false 
}) => (
  <button
    onClick={onClick}
    className={`group relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300
      ${isActive ? `${activeColor} text-white shadow-lg` : 'text-white/70 hover:bg-white/20'}
      ${isAction ? 'hover:bg-white/20' : ''}
    `}
  >
    {icon}
    <div className="absolute bottom-full mb-2 hidden group-hover:block whitespace-nowrap">
      <div className="bg-gray-800 text-white text-xs rounded py-1 px-2">
        {label}
      </div>
    </div>
  </button>
);

export default ControlPanel;
