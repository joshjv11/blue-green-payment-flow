import { Button } from '@/components/ui/button';
import { Plus, Download, Settings, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 flex flex-col gap-3 z-40">
        {/* Add Bill Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              onClick={onAddBill}
              className={cn(
                "h-14 w-14 rounded-2xl shadow-float hover:scale-110 transition-all duration-300",
                isPro 
                  ? "bg-gradient-to-br from-[hsl(45,100%,60%)] to-[hsl(35,100%,55%)] hover:shadow-pro-glow text-[hsl(230,35%,7%)]" 
                  : "bg-primary hover:shadow-button-hover",
                !canAddBill && "opacity-60"
              )}
            >
              <Plus className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{canAddBill ? 'Add New Bill' : 'Upgrade to add more'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Export Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              onClick={onExport}
              className={cn(
                "h-12 w-12 rounded-xl shadow-glass hover:scale-110 transition-all duration-300",
                isPro && "glass-pro border-[hsl(45,100%,60%)]/30 hover:shadow-pro-glow"
              )}
            >
              <Download className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Export/Import</p>
          </TooltipContent>
        </Tooltip>

        {/* Settings Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              onClick={onSettings}
              className={cn(
                "h-12 w-12 rounded-xl shadow-glass hover:scale-110 transition-all duration-300",
                isPro && "glass-pro border-[hsl(45,100%,60%)]/30 hover:shadow-pro-glow"
              )}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Settings</p>
          </TooltipContent>
        </Tooltip>

        {/* Upgrade Button (Free Users Only) */}
        {showUpgrade && onUpgrade && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={onUpgrade}
                className="h-12 w-12 rounded-xl bg-gradient-to-br from-[hsl(45,100%,60%)] to-[hsl(35,100%,55%)] hover:shadow-pro-glow text-[hsl(230,35%,7%)] hover:scale-110 transition-all duration-300 shimmer"
              >
                <Crown className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Upgrade to Pro</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
