import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackToDashboardProps {
  className?: string;
}

export function BackToDashboard({ className }: BackToDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on dashboard itself
  if (location.pathname === "/dashboard") return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate("/dashboard")}
      className={cn(
        "group flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-4",
        className
      )}
    >
      <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
      <span className="hidden sm:inline font-medium">Dashboard</span>
    </Button>
  );
}
