import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  isPro?: boolean;
}

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className,
  isPro = false 
}: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        "flex flex-col items-center justify-center p-8 md:p-12 text-center",
        "rounded-2xl border border-border/50 glass shadow-glass",
        "transition-all duration-300 hover:shadow-float",
        isPro && "glass-pro border-[hsl(45,100%,60%)]/30 shadow-pro-strong",
        className
      )}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.1 
        }}
        className={cn(
          "mb-4 p-4 rounded-full",
          isPro 
            ? "bg-gradient-to-br from-[hsl(45,100%,60%)]/20 to-[hsl(35,100%,55%)]/10 shadow-pro-glow"
            : "bg-primary/10 shadow-glow"
        )}
      >
        <Icon className={cn(
          "h-12 w-12 md:h-16 md:w-16",
          isPro ? "text-[hsl(45,100%,60%)]" : "text-primary"
        )} />
      </motion.div>
      
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={cn(
          "text-lg md:text-xl font-bold mb-2",
          isPro && "pro-gradient-text"
        )}
      >
        {title}
      </motion.h3>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-sm md:text-base text-muted-foreground max-w-md mb-6"
      >
        {description}
      </motion.p>
      
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
};
