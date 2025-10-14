import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5] active:scale-[0.97] touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-button-hover shadow-medium rounded-xl",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-medium hover:shadow-strong rounded-xl",
        outline: "border border-border/50 glass text-foreground hover:bg-secondary/50 hover:text-foreground shadow-soft hover:shadow-medium rounded-xl",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-soft hover:shadow-medium rounded-xl",
        ghost: "hover:bg-accent/10 hover:text-accent-foreground rounded-xl",
        link: "text-primary underline-offset-4 hover:underline",
        pro: "bg-gradient-to-r from-[hsl(45,100%,60%)] to-[hsl(35,100%,55%)] text-[hsl(230,35%,7%)] hover:shadow-pro-glow shadow-pro-strong rounded-xl font-semibold shimmer",
      },
      size: {
        default: "h-11 px-5 py-2.5 md:h-10",
        sm: "h-10 px-4 text-xs md:h-9",
        lg: "h-12 px-7 md:h-11",
        icon: "h-11 w-11 md:h-10 md:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
