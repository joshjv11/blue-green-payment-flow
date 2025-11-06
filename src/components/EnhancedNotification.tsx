import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface EnhancedNotificationProps {
  type: NotificationType;
  title: string;
  description?: string;
  onClose?: () => void;
  duration?: number;
  className?: string;
}

const notificationConfig = {
  success: {
    icon: CheckCircle2,
    borderColor: 'border-l-success',
    bgColor: 'bg-success/10',
    iconColor: 'text-success',
    borderGlow: 'shadow-[0_0_20px_rgba(132,204,22,0.3)]',
  },
  error: {
    icon: XCircle,
    borderColor: 'border-l-destructive',
    bgColor: 'bg-destructive/10',
    iconColor: 'text-destructive',
    borderGlow: 'shadow-[0_0_20px_rgba(248,113,113,0.3)]',
  },
  info: {
    icon: Info,
    borderColor: 'border-l-primary',
    bgColor: 'bg-primary/10',
    iconColor: 'text-primary',
    borderGlow: 'shadow-[0_0_20px_rgba(139,92,246,0.3)]',
  },
  warning: {
    icon: AlertTriangle,
    borderColor: 'border-l-amber-500',
    bgColor: 'bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderGlow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
  },
};

export function EnhancedNotification({
  type,
  title,
  description,
  onClose,
  duration = 5000,
  className,
}: EnhancedNotificationProps) {
  const config = notificationConfig[type];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30,
          duration: 0.3 
        }}
        className={cn(
          "glass-card border-l-4 rounded-lg p-4 mb-4 min-w-[320px] max-w-[420px]",
          config.borderColor,
          config.bgColor,
          config.borderGlow,
          className
        )}
      >
        <div className="flex items-start gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className={cn("flex-shrink-0", config.iconColor)}
          >
            <Icon className="h-5 w-5" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <motion.h4
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="font-semibold text-sm mb-1"
            >
              {title}
            </motion.h4>
            {description && (
              <motion.p
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-muted-foreground"
              >
                {description}
              </motion.p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook for using enhanced notifications
export function useEnhancedNotification() {
  const showNotification = (
    type: NotificationType,
    title: string,
    description?: string,
    duration?: number
  ) => {
    // This would integrate with your toast system
    // For now, return a function that can be called
    return { type, title, description, duration };
  };

  return { showNotification };
}

