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
    console.log('useGoogleMaps: Checking Google Maps', {
      hasGoogle: !!window.google,
      hasMaps: !!window.google?.maps,
      hasVisualization: !!window.google?.maps?.visualization,
      apiKey: GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing'
    });

    if (window.google?.maps?.visualization) {
      console.log('Google Maps already loaded');
      setIsLoaded(true);
      return;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      setLoadError('Google Maps API key is missing');
      return;
    }

    // Create callback function
    window.initGoogleMaps = () => {
      console.log('Google Maps callback triggered', {
        hasGoogle: !!window.google,
        hasMaps: !!window.google?.maps,
        hasVisualization: !!window.google?.maps?.visualization
      });
      // Ensure visualization library is loaded
      if (window.google?.maps?.visualization) {
        console.log('Google Maps loaded successfully');
        setIsLoaded(true);
      } else {
        console.error('Visualization library failed to load');
        setLoadError('Visualization library failed to load');
      }
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=visualization,drawing&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;

    console.log('Loading Google Maps script:', script.src);
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      setLoadError('Failed to load Google Maps');
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return { isLoaded, loadError };
};
