import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  isPro?: boolean;
}

export const SettingsDrawer = ({ 
  open, 
  onOpenChange, 
  children,
  title = "Settings",
  description,
  isPro = false
}: SettingsDrawerProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className={cn(
          "w-full sm:max-w-md glass-strong backdrop-blur-2xl border-l border-border/50 shadow-float",
          isPro && "glass-pro border-[hsl(45,100%,60%)]/30"
        )}
      >
        <SheetHeader className="space-y-2">
          <SheetTitle className={cn(
            "text-2xl font-bold",
            isPro && "pro-gradient-text"
          )}>
            {title}
          </SheetTitle>
          {description && (
            <SheetDescription className="text-muted-foreground">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
};
