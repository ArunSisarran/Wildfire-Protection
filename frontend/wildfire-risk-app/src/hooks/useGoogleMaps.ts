import { useState, useEffect } from 'react';
import { GOOGLE_MAPS_API_KEY } from '../utils/constants';

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

export const useGoogleMaps = () => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (window.google?.maps?.visualization) {
      setIsLoaded(true);
      return;
    }

    // Create callback function
    window.initGoogleMaps = () => {
      // Ensure visualization library is loaded
      if (window.google?.maps?.visualization) {
        setIsLoaded(true);
      } else {
        setLoadError('Visualization library failed to load');
      }
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=visualization,drawing&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;

    script.onerror = () => setLoadError('Failed to load Google Maps');

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return { isLoaded, loadError };
};
