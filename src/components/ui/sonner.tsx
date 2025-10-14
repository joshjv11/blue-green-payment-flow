import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast glass-strong backdrop-blur-xl group-[.toaster]:bg-card/80 group-[.toaster]:text-foreground group-[.toaster]:border-border/50 group-[.toaster]:shadow-float group-[.toaster]:rounded-2xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-xl group-[.toast]:hover:scale-105 group-[.toast]:transition-transform",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-xl",
          success: "group-[.toast]:border-green-500/30 group-[.toast]:bg-green-500/10",
          error: "group-[.toast]:border-red-500/30 group-[.toast]:bg-red-500/10",
          info: "group-[.toast]:border-primary/30 group-[.toast]:bg-primary/10",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
