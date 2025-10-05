import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

const EDGE_FUNCTIONS = [
  "ai-assistant",
  "ai-assistant-enhanced",
  "get-current-plan",
  "log-client-event",
  "process-due-reminders",
  "reminder-health-check",
  "schedule-bill-reminders",
  "schedule-individual-reminder",
  "send-bill-reminders",
  "send-bill-reminders-enhanced",
  "send-comprehensive-test-email",
  "send-individual-reminder",
  "send-test-email",
  "setup-reminder-cron",
];

const HEALTH_CHECK_TIMEOUT = 5_000;

async function getUnhealthyFunctions(baseUrl: string): Promise<string[]> {
  const results = await Promise.all(
    EDGE_FUNCTIONS.map(async (name) => {
      try {
        const response = await apiFetch(
          `${baseUrl}/functions/v1/${name}?health=1`,
          { method: "GET" },
          HEALTH_CHECK_TIMEOUT,
        );
        const data = await response.json();

        if (data?.ok) {
          return null;
        }

        return name;
      } catch (error) {
        console.error(`Health check failed for ${name}`, error);
        return name;
      }
    }),
  );

  return results.filter((name): name is string => Boolean(name));
}

const EdgeFunctionHealthBanner = () => {
  const [unhealthyFunctions, setUnhealthyFunctions] = useState<string[]>([]);
  const [hasChecked, setHasChecked] = useState(false);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;

  useEffect(() => {
    if (!supabaseUrl) {
      setHasChecked(true);
      return;
    }

    let isMounted = true;

    const runHealthCheck = async () => {
      const downFunctions = await getUnhealthyFunctions(supabaseUrl);

      if (!isMounted) {
        return;
      }

      setUnhealthyFunctions(downFunctions);
      setHasChecked(true);
    };

    runHealthCheck();

    const handleFocus = () => {
      runHealthCheck();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleFocus);
    };
  }, [supabaseUrl]);

  if (!hasChecked || unhealthyFunctions.length === 0) {
    return null;
  }

  return (
    <div className="bg-destructive/10 text-destructive flex flex-col gap-1 px-4 py-3 text-sm">
      <span className="font-medium">Some services are currently unavailable.</span>
      <span className="text-xs">
        The following edge functions failed health checks: {unhealthyFunctions.join(", ")}. Our team has been notified.
      </span>
    </div>
  );
};

export default EdgeFunctionHealthBanner;
