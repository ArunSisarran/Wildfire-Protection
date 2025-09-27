import React from 'react';

interface MissionPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const MissionPopup: React.FC<MissionPopupProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg text-center">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Our Mission</h2>
        <p className="text-gray-600 mb-6">
          At Respira, our mission is to provide accessible, real-time wildfire intelligence to communities, first responders, and researchers. We leverage cutting-edge data and predictive modeling to foster a deeper understanding of fire risk, helping to protect lives, property, and our natural ecosystems.
        </p>
        <button
          onClick={onClose}
          className="bg-orange-500 text-white font-semibold px-6 py-2 rounded-lg hover:bg-orange-600 transition"
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

export default MissionPopup;