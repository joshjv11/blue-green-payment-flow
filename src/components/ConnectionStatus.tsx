import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

type ConnectionState = 'connected' | 'disconnected' | 'syncing' | 'error';

const ConnectionStatus = () => {
  const { syncing, syncLocalStorageData } = useSupabaseData();
  const { toast } = useToast();
  const [connectionState, setConnectionState] = useState<ConnectionState>('connected');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Check initial connection
    checkConnection();

    // Set up connection monitoring
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds

    // Listen for Supabase realtime connection changes
    const subscription = supabase.channel('connection-status')
      .on('presence', { event: 'sync' }, () => {
        setConnectionState('connected');
        setRetryCount(0);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionState('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionState('error');
        }
      });

    return () => {
      clearInterval(interval);
      supabase.removeChannel(subscription);
    };
  }, []);

  useEffect(() => {
    if (syncing) {
      setConnectionState('syncing');
    } else if (connectionState === 'syncing' && !syncing) {
      setConnectionState('connected');
      setLastSync(new Date());
    }
  }, [syncing]);

  const checkConnection = async () => {
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) {
        setConnectionState('error');
        setRetryCount(prev => prev + 1);
      } else {
        setConnectionState('connected');
        setRetryCount(0);
      }
    } catch (error) {
      setConnectionState('disconnected');
      setRetryCount(prev => prev + 1);
    }
  };

  const handleRetryConnection = async () => {
    setConnectionState('syncing');
    try {
      await checkConnection();
      if (connectionState === 'connected') {
        await syncLocalStorageData();
        toast({
          title: "Connection Restored",
          description: "Successfully reconnected to cloud database",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Unable to reconnect. Please check your internet connection.",
        variant: "destructive",
      });
    }
  };

  const handleForceSync = async () => {
    try {
      await syncLocalStorageData();
      setLastSync(new Date());
      toast({
        title: "Sync Complete",
        description: "Data has been synchronized with cloud database",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync data with cloud database",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = () => {
    switch (connectionState) {
      case 'connected':
        return <Wifi className="h-4 w-4" />;
      case 'disconnected':
      case 'error':
        return <WifiOff className="h-4 w-4" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      default:
        return <Wifi className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'disconnected':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'syncing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Offline';
      case 'error':
        return `Connection Error ${retryCount > 0 ? `(${retryCount})` : ''}`;
      case 'syncing':
        return 'Syncing...';
      default:
        return 'Unknown';
    }
  };

  // Only show connection status if there are issues or during sync
  if (connectionState === 'connected' && !syncing) {
    return (
      <div className="fixed top-4 right-4 z-[45]">
        <Badge className={`flex items-center gap-2 ${getStatusColor()}`}>
          {getStatusIcon()}
          Cloud Connected
        </Badge>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-[45]">
      <Card className="w-80 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge className={`flex items-center gap-2 ${getStatusColor()}`}>
                {getStatusIcon()}
                {getStatusText()}
              </Badge>
            </div>
            
            {(connectionState === 'disconnected' || connectionState === 'error') && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleRetryConnection}
                disabled={false}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
          </div>

          <div className="space-y-2 text-sm">
            {connectionState === 'connected' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Cloud database connected</span>
              </div>
            )}

            {connectionState === 'syncing' && (
              <div className="flex items-center gap-2 text-blue-600">
                <Clock className="h-4 w-4" />
                <span>Synchronizing data...</span>
              </div>
            )}

            {connectionState === 'disconnected' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>Working offline</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your data is saved locally and will sync when connection is restored.
                </p>
              </div>
            )}

            {connectionState === 'error' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>Connection error</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Unable to connect to cloud database. Check your internet connection.
                </p>
              </div>
            )}

            {lastSync && (
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  Last sync: {lastSync.toLocaleTimeString()}
                </span>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={handleForceSync}
                  disabled={connectionState !== 'connected'}
                  className="h-6 px-2 text-xs"
                >
                  Sync Now
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectionStatus;