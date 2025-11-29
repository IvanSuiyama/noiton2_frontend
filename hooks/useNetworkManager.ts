// src/hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react';
import { networkMonitor, NetworkStatus } from '../services/networkinManager';

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(networkMonitor.getCurrentStatus());
  const [isConnected, setIsConnected] = useState(networkMonitor.getCurrentStatus().isOnline);

  useEffect(() => {
    const networkListener = {
      onNetworkChange: (status: NetworkStatus) => {
        setNetworkStatus(status);
        setIsConnected(status.isOnline);
      },
      onOnline: () => {
        setIsConnected(true);
        setNetworkStatus(prev => ({ ...prev, isOnline: true }));
      },
      onOffline: () => {
        setIsConnected(false);
        setNetworkStatus(prev => ({ ...prev, isOnline: false }));
      }
    };

    // Adiciona listener
    networkMonitor.addListener(networkListener);

    // Verifica status inicial
    networkMonitor.checkNetworkStatus();

    // Cleanup
    return () => {
      networkMonitor.removeListener(networkListener);
    };
  }, []);

  return {
    isConnected,
    networkStatus,
    isWifi: networkStatus.isWifi,
    isCellular: networkStatus.isCellular,
    connectionType: networkStatus.connectionType
  };
};