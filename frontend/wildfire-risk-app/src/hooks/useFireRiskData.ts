import { useState, useEffect, useCallback } from 'react';
import { FireRiskAssessment } from '../types';
import apiService from '../services/apiService';
import { UPDATE_INTERVAL } from '../utils/constants';

export const useFireRiskData = () => {
  const [assessment, setAssessment] = useState<FireRiskAssessment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.fetchFireRiskAssessment();
      setAssessment(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch fire risk data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { assessment, loading, error, refreshData: fetchData };
};
