import React, { createContext, useState, ReactNode } from 'react';
import { FireRiskAssessment, FireRiskStation, FireLocation, UserLocation, WildfireOverview } from '../types';
import { useFireRiskData } from '../hooks/useFireRiskData';
import { NY_CONFIG } from '../utils/constants';

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
  userLocation: UserLocation;
  setUserLocation: (location: UserLocation) => void;
  wildfireOverview: WildfireOverview | null;
  loadingWildfire: boolean;
  refreshWildfireData: () => void;
  showActiveFires: boolean;
  setShowActiveFires: (show: boolean) => void;
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
  clearFireLocations: () => {},
  userLocation: { latitude: NY_CONFIG.center.lat, longitude: NY_CONFIG.center.lng },
  setUserLocation: () => {},
  wildfireOverview: null,
  loadingWildfire: false,
  refreshWildfireData: () => {},
  showActiveFires: true,
  setShowActiveFires: () => {}
});

interface FireRiskProviderProps {
  children: ReactNode;
}

export const FireRiskProvider: React.FC<FireRiskProviderProps> = ({ children }) => {
  const { assessment, loading, error, refreshData } = useFireRiskData();
  const [selectedStation, setSelectedStation] = useState<FireRiskStation | null>(null);
  const [fireLocations, setFireLocations] = useState<FireLocation[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation>({ 
    latitude: NY_CONFIG.center.lat, 
    longitude: NY_CONFIG.center.lng 
  });
  const [wildfireOverview, setWildfireOverview] = useState<WildfireOverview | null>(null);
  const [loadingWildfire, setLoadingWildfire] = useState(false);
  const [showActiveFires, setShowActiveFires] = useState(true);

  const addFireLocation = (location: FireLocation) => {
    setFireLocations(prev => [...prev, location]);
  };

  const clearFireLocations = () => {
    setFireLocations([]);
  };

  const refreshWildfireData = async () => {
    setLoadingWildfire(true);
    try {
      const apiService = (await import('../services/apiService')).default;
      const data = await apiService.getWildfireOverview(userLocation, 500);
      setWildfireOverview(data);
    } catch (error) {
      console.error('Failed to refresh wildfire data:', error);
    } finally {
      setLoadingWildfire(false);
    }
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
        clearFireLocations,
        userLocation,
        setUserLocation,
        wildfireOverview,
        loadingWildfire,
        refreshWildfireData,
        showActiveFires,
        setShowActiveFires
      }}
    >
      {children}
    </FireRiskContext.Provider>
  );
};
