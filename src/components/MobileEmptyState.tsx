import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MobileEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  isPro?: boolean;
}

export const MobileEmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  isPro = false 
}: MobileEmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.5,
        ease: [0.25, 0.4, 0.25, 1]
      }}
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
    >
      {/* Glowing animated icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: "spring",
          stiffness: 200,
          damping: 20,
          delay: 0.1 
        }}
        className="relative mb-6"
      >
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={cn(
            "absolute inset-0 rounded-full blur-2xl",
            isPro 
              ? "bg-gradient-to-br from-[hsl(45,100%,60%)] to-[hsl(35,100%,55%)]"
              : "bg-gradient-to-br from-primary to-accent"
          )}
        />
        
        <div className={cn(
          "relative p-6 rounded-full",
          isPro 
            ? "bg-gradient-to-br from-[hsl(45,100%,60%)]/10 to-[hsl(35,100%,55%)]/5"
            : "bg-gradient-to-br from-primary/10 to-accent/5"
        )}>
          <Icon className={cn(
            "h-16 w-16 md:h-20 md:w-20",
            isPro ? "text-[hsl(45,100%,60%)]" : "text-primary"
          )} strokeWidth={1.5} />
        </div>
      </motion.div>
      
      {/* Content with stagger animation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <h3 className={cn(
          "text-xl md:text-2xl font-bold",
          isPro && "pro-gradient-text"
        )}>
          {title}
        </h3>
        
        <p className="text-sm md:text-base text-muted-foreground max-w-sm leading-relaxed">
          {description}
        </p>
      </motion.div>
      
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
};
