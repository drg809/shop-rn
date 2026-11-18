import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    // Estado inicial
    Network.getNetworkStateAsync().then((state) => {
      setIsOnline(!!state.isInternetReachable);
    });

    // Escuchar cambios
    const subscription = Network.addNetworkStateListener((state) => {
      setIsOnline(!!state.isInternetReachable);
    });

    return () => subscription.remove();
  }, []);

  return { isOnline };
}