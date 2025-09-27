import React, { createContext, useState, ReactNode } from 'react';
import { FireRiskAssessment, FireRiskStation, FireLocation } from '../types';
import { useFireRiskData } from '../hooks/useFireRiskData';

interface FireRiskContextType {
  assessment: FireRiskAssessment | null;
  loading: boolean;
  error: string | null;
  refreshData: () => void;
  selectedStation: FireRiskStation | null;
  setSelectedStation: (station: FireRiskStation | null) => void;
  fireLocations: FireLocation[];
  addFireLocation: (location: FireLocation) => void;
  clearFireLocations: () => void;
}

export const FireRiskContext = createContext<FireRiskContextType>({
  assessment: null,
  loading: false,
  error: null,
  refreshData: () => {},
  selectedStation: null,
  setSelectedStation: () => {},
  fireLocations: [],
  addFireLocation: () => {},
  clearFireLocations: () => {}
});

interface FireRiskProviderProps {
  children: ReactNode;
}

export const FireRiskProvider: React.FC<FireRiskProviderProps> = ({ children }) => {
  const { assessment, loading, error, refreshData } = useFireRiskData();
  const [selectedStation, setSelectedStation] = useState<FireRiskStation | null>(null);
  const [fireLocations, setFireLocations] = useState<FireLocation[]>([]);

  const addFireLocation = (location: FireLocation) => {
    setFireLocations(prev => [...prev, location]);
  };

  const clearFireLocations = () => {
    setFireLocations([]);
  };

  return (
    <FireRiskContext.Provider
      value={{
        assessment,
        loading,
        error,
        refreshData,
        selectedStation,
        setSelectedStation,
        fireLocations,
        addFireLocation,
        clearFireLocations
      }}
    >
      {children}
    </FireRiskContext.Provider>
  );
};
