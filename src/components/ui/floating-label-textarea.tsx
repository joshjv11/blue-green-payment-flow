import * as React from "react";
import { cn } from "@/lib/utils";

export interface FloatingLabelTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

const FloatingLabelTextarea = React.forwardRef<HTMLTextAreaElement, FloatingLabelTextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);
    const textareaId = id || `floating-textarea-${React.useId()}`;

    const handleFocus = () => setIsFocused(true);
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      setHasValue(!!e.target.value);
      props.onBlur?.(e);
    };

    return (
      <div className="relative">
        <textarea
          id={textareaId}
          className={cn(
            "peer flex min-h-[120px] w-full rounded-xl border border-border/50 glass bg-background/50 px-4 pt-6 pb-2 text-base ring-offset-background transition-all duration-300 ease-out",
            "placeholder:text-transparent resize-none",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0 focus-visible:border-primary/50 focus-visible:shadow-glow focus-visible:scale-[1.01]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive/50 focus-visible:ring-destructive/30",
            className
          )}
          ref={ref}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={(e) => {
            setHasValue(!!e.target.value);
            props.onChange?.(e);
          }}
          placeholder={label}
          {...props}
        />
        <label
          htmlFor={textareaId}
          className={cn(
            "absolute left-4 top-4 text-muted-foreground transition-all duration-300 pointer-events-none",
            "peer-focus:top-3 peer-focus:text-xs peer-focus:text-primary peer-focus:font-medium",
            (isFocused || hasValue || props.value) && "top-3 text-xs font-medium text-primary"
          )}
        >
          {label}
        </label>
        {error && (
          <p className="mt-1.5 text-xs text-destructive font-medium animate-fade-in">
            {error}
          </p>
        )}
      </div>
    );
  }
);
FloatingLabelTextarea.displayName = "FloatingLabelTextarea";

export { FloatingLabelTextarea };
