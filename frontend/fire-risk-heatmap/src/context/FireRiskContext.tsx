import React, { createContext, useState, ReactNode } from 'react';
import { FireRiskAssessment, FireRiskStation } from '../types';
import { useFireRiskData } from '../hooks/useFireRiskData';

interface FireRiskContextType {
  assessment: FireRiskAssessment | null;
  loading: boolean;
  error: string | null;
  refreshData: () => void;
  selectedStation: FireRiskStation | null;
  setSelectedStation: (station: FireRiskStation | null) => void;
}

export const FireRiskContext = createContext<FireRiskContextType>({
  assessment: null,
  loading: false,
  error: null,
  refreshData: () => {},
  selectedStation: null,
  setSelectedStation: () => {}
});

interface FireRiskProviderProps {
  children: ReactNode;
}

export const FireRiskProvider: React.FC<FireRiskProviderProps> = ({ children }) => {
  const { assessment, loading, error, refreshData } = useFireRiskData();
  const [selectedStation, setSelectedStation] = useState<FireRiskStation | null>(null);

  return (
    <FireRiskContext.Provider
      value={{
        assessment,
        loading,
        error,
        refreshData,
        selectedStation,
        setSelectedStation
      }}
    >
      {children}
    </FireRiskContext.Provider>
  );
};
