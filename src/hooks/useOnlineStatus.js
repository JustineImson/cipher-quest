import { useState, useEffect } from 'react';

/**
 * Returns true when the browser has a working network connection,
 * false when offline. Reacts to online/offline events in real-time.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);

    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);

    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  return isOnline;
}
