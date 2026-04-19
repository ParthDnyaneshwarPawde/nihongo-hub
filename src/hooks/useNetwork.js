import { useState, useEffect } from 'react';

export function useNetwork() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isUnstable, setIsUnstable] = useState(false);

  useEffect(() => {
    // 1. Handle strict Online/Offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 2. Handle "Unstable" / Slow connections (Supported in Chrome/Edge/Android)
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    const checkConnection = () => {
      if (connection) {
        // If the effective type is 2g or slow-2g, or downlink is severely limited
        const isSlow = connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g';
        setIsUnstable(isSlow);
      }
    };

    if (connection) {
      connection.addEventListener('change', checkConnection);
      checkConnection(); // Initial check on mount
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', checkConnection);
      }
    };
  }, []);

  return { isOnline, isUnstable };
}