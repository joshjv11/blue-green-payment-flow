import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProBadgeProps {
  variant?: 'default' | 'compact' | 'icon-only';
  className?: string;
}

export const ProBadge = ({ variant = 'default', className }: ProBadgeProps) => {
  if (variant === 'icon-only') {
    return (
      <div className={cn(
        "inline-flex items-center justify-center h-5 w-5 rounded-full",
        "bg-gradient-to-br from-[hsl(45,100%,60%)] to-[hsl(35,100%,55%)]",
        "shadow-pro-glow",
        className
      )}>
        <Sparkles className="h-3 w-3 text-[hsl(230,35%,7%)]" />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        "bg-gradient-to-r from-[hsl(45,100%,60%)] to-[hsl(35,100%,55%)]",
        "text-[hsl(230,35%,7%)] shadow-pro-glow",
        "animate-pulse-slow",
        className
      )}>
        <Sparkles className="h-3 w-3" />
        <span>Pro</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold",
      "bg-gradient-to-r from-[hsl(45,100%,60%)] to-[hsl(35,100%,55%)]",
      "text-[hsl(230,35%,7%)] shadow-pro-glow shimmer",
      className
    )}>
      <Sparkles className="h-4 w-4" />
      <span>Pro Member</span>
    </div>
  );
};
