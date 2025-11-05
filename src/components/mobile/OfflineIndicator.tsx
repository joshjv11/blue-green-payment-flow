import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useOfflineCache } from '@/hooks/useOfflineCache';
import { t } from '@/utils/locale';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Locale } from '@/utils/locale';

export function OfflineIndicator() {
  const { isOnline, syncStatus } = useOfflineCache();
  const [locale] = useLocalStorage<Locale>('invoiceflow_locale', 'en-IN');

  if (isOnline && syncStatus === 'idle') {
    return null; // Don't show when online and idle
  }

  const getStatus = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        text: t('offline', locale),
        variant: 'destructive' as const,
      };
    }

    switch (syncStatus) {
      case 'syncing':
        return {
          icon: Loader2,
          text: t('syncing', locale),
          variant: 'secondary' as const,
          spinning: true,
        };
      case 'synced':
        return {
          icon: CheckCircle,
          text: 'Synced',
          variant: 'default' as const,
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Sync Failed',
          variant: 'destructive' as const,
        };
      default:
        return {
          icon: Wifi,
          text: t('online', locale),
          variant: 'default' as const,
        };
    }
  };

  const status = getStatus();
  const Icon = status.icon;

  return (
    <Badge
      variant={status.variant}
      className="fixed top-16 right-4 z-50 flex items-center gap-2 min-h-[32px]"
    >
      <Icon className={`h-4 w-4 ${status.spinning ? 'animate-spin' : ''}`} />
      <span className="text-xs">{status.text}</span>
    </Badge>
  );
}

