import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

const CACHE_KEY = 'invoiceflow_offline_bills';
const CACHE_EXPIRY_DAYS = 30;

interface CachedBill {
  id: string;
  data: any;
  timestamp: number;
}

export function useOfflineCache() {
  const [cachedBills, setCachedBills] = useLocalStorage<CachedBill[]>(CACHE_KEY, []);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Clean up old cache entries
  useEffect(() => {
    const now = Date.now();
    const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    
    const validBills = cachedBills.filter(
      bill => (now - bill.timestamp) < expiryTime
    );
    
    if (validBills.length !== cachedBills.length) {
      setCachedBills(validBills);
    }
  }, [cachedBills, setCachedBills]);

  const addToCache = (bills: any[]) => {
    const now = Date.now();
    const newCachedBills: CachedBill[] = bills.map(bill => ({
      id: bill.id || `temp_${now}_${Math.random()}`,
      data: bill,
      timestamp: now,
    }));

    // Keep only last 30 bills
    const allBills = [...cachedBills, ...newCachedBills];
    const sortedBills = allBills.sort((a, b) => b.timestamp - a.timestamp);
    const limitedBills = sortedBills.slice(0, 30);

    setCachedBills(limitedBills);
  };

  const getCachedBills = (): any[] => {
    return cachedBills.map(bill => bill.data);
  };

  const clearCache = () => {
    setCachedBills([]);
  };

  const syncWithServer = async (syncFunction: (bills: any[]) => Promise<void>) => {
    if (!isOnline) {
      setSyncStatus('error');
      return;
    }

    setSyncStatus('syncing');
    try {
      const bills = getCachedBills();
      await syncFunction(bills);
      setSyncStatus('synced');
      
      // Clear cache after successful sync
      setTimeout(() => {
        clearCache();
        setSyncStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
    }
  };

  return {
    isOnline,
    syncStatus,
    cachedBills: getCachedBills(),
    addToCache,
    clearCache,
    syncWithServer,
  };
}

