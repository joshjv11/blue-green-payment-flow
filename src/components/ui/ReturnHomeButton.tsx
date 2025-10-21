import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home } from "lucide-react";

export default function ReturnHomeButton() {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on dashboard itself
  if (location.pathname === "/dashboard") return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => navigate("/dashboard")}
      className="
        fixed top-6 left-6 z-40
        flex items-center gap-2
        rounded-2xl border border-border/50
        bg-background/5 backdrop-blur-sm
        px-3 py-1.5 text-sm font-medium text-muted-foreground
        hover:text-foreground hover:bg-accent/10 hover:border-border
        transition-all duration-200 shadow-sm
      "
      aria-label="Return to dashboard"
    >
      <Home className="w-4 h-4 opacity-70" />
      <span className="hidden sm:inline">Return Home</span>
    </motion.button>
  );
}
