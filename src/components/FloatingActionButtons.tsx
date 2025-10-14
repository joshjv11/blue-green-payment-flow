import { Button } from '@/components/ui/button';
import { Plus, Download, Settings, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

interface FloatingActionButtonsProps {
  onAddBill: () => void;
  onExport: () => void;
  onSettings: () => void;
  onUpgrade?: () => void;
  canAddBill: boolean;
  showUpgrade?: boolean;
  isPro?: boolean;
}

export const FloatingActionButtons = ({
  onAddBill,
  onExport,
  onSettings,
  onUpgrade,
  canAddBill,
  showUpgrade = false,
  isPro = false,
}: FloatingActionButtonsProps) => {
  return (
    <TooltipProvider>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.2 
        }}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 flex flex-col gap-3 z-40"
      >
        {/* Add Bill Button - Primary Action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                size="icon"
                onClick={onAddBill}
                className={cn(
                  "h-14 w-14 rounded-2xl shadow-float hover:shadow-premium-glow transition-all duration-300 relative",
                  isPro 
                    ? "bg-gradient-to-br from-[hsl(45,100%,60%)] to-[hsl(35,100%,55%)] hover:shadow-pro-strong text-[hsl(230,35%,7%)]" 
                    : "bg-gradient-to-br from-primary to-primary-hover shadow-glow",
                  !canAddBill && "opacity-60"
                )}
              >
                <Plus className="h-6 w-6" />
                
                {/* Ambient glow pulse effect */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.15, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className={cn(
                    "absolute inset-0 rounded-2xl blur-xl -z-10",
                    isPro 
                      ? "bg-gradient-to-br from-[hsl(45,100%,60%)] to-[hsl(35,100%,55%)]"
                      : "bg-gradient-to-br from-primary to-accent"
                  )}
                />
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="left" className="glass backdrop-blur-xl">
            <p className="font-medium">{canAddBill ? 'Add New Bill' : 'Upgrade to add more'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Export Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                size="icon"
                variant="secondary"
                onClick={onExport}
                className={cn(
                  "h-12 w-12 rounded-xl shadow-glass hover:shadow-float transition-all duration-300",
                  isPro && "glass-pro border-[hsl(45,100%,60%)]/30 hover:shadow-pro-glow"
                )}
              >
                <Download className="h-5 w-5" />
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="left" className="glass backdrop-blur-xl">
            <p className="font-medium">Export/Import</p>
          </TooltipContent>
        </Tooltip>

        {/* Settings Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              whileHover={{ scale: 1.08, rotate: 45 }}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                size="icon"
                variant="secondary"
                onClick={onSettings}
                className={cn(
                  "h-12 w-12 rounded-xl shadow-glass hover:shadow-float transition-all duration-300",
                  isPro && "glass-pro border-[hsl(45,100%,60%)]/30 hover:shadow-pro-glow"
                )}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="left" className="glass backdrop-blur-xl">
            <p className="font-medium">Settings</p>
          </TooltipContent>
        </Tooltip>

        {/* Upgrade Button (Free Users Only) */}
        {showUpgrade && onUpgrade && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                animate={{
                  y: [0, -4, 0],
                }}
                transition={{
                  y: {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }
                }}
              >
                <Button
                  size="icon"
                  onClick={onUpgrade}
                  className="h-12 w-12 rounded-xl bg-gradient-to-br from-[hsl(45,100%,60%)] to-[hsl(35,100%,55%)] hover:shadow-pro-glow text-[hsl(230,35%,7%)] transition-all duration-300 shimmer relative"
                >
                  <Crown className="h-5 w-5" />
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="left" className="glass backdrop-blur-xl">
              <p className="font-medium">Upgrade to Pro</p>
            </TooltipContent>
          </Tooltip>
        )}
      </motion.div>
    </TooltipProvider>
  );
};
