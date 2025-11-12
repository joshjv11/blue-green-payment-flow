import type { KPIData } from "@/hooks/useKPIData";

export type TrendDirection = "up" | "down" | "flat";

export interface AnalyticsHighlightMetric {
  label: string;
  value: string;
  helper: string;
  trend: TrendDirection;
}

export interface AnalyticsHighlights {
  headline: string;
  supporting: string;
  metrics: AnalyticsHighlightMetric[];
}

const pct = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
};

const resolveTrend = (delta: number): TrendDirection => {
  if (delta > 1) return "up";
  if (delta < -1) return "down";
  return "flat";
};

export function computeAnalyticsHighlights(data: KPIData | null): AnalyticsHighlights {
  if (!data) {
    return {
      headline: "Analytics warming up",
      supporting:
        "We will highlight revenue momentum, profitability, and customer growth once fresh data arrives or demo data is seeded.",
      metrics: [
        {
          label: "Revenue trend",
          value: "—",
          helper: "Seed sample data to unlock momentum insights",
          trend: "flat",
        },
        {
          label: "Gross profit",
          value: "—",
          helper: "We surface margin signals when transactions are available",
          trend: "flat",
        },
        {
          label: "Active customers",
          value: "—",
          helper: "Onboard a few buyers or run the analytics seeder",
          trend: "flat",
        },
      ],
    };
  }

  const revenueDelta = pct(data.totalRevenue.current, data.totalRevenue.previous);
  const profitDelta = pct(data.grossProfit.current, data.grossProfit.previous);
  const previousCustomers =
    data.activeCustomers.sparkline.length > 1
      ? data.activeCustomers.sparkline[data.activeCustomers.sparkline.length - 2]
      : data.activeCustomers.sparkline[0] ?? data.activeCustomers.current;
  const customerDelta = pct(data.activeCustomers.current, previousCustomers || 0);

  const formatDelta = (delta: number) =>
    `${delta >= 0 ? "+" : ""}${Number.isFinite(delta) ? delta.toFixed(1) : "0.0"}%`;

  const headline =
    revenueDelta > 5
      ? "Revenue momentum is accelerating"
      : revenueDelta < -5
        ? "Revenue has cooled off"
        : "Revenue is holding steady";

  const supporting =
    revenueDelta > 5
      ? "Top line performance is outpacing the previous period — review the Sales and Profitability tabs to double down on what’s working."
      : revenueDelta < -5
        ? "Revenue dipped versus the last period. Inspect Smart Alerts for churn risks and watch inventory turnover."
        : "Revenue is in line with the prior window. Explore Scenario Planning to identify the next growth lever.";

  return {
    headline,
    supporting,
    metrics: [
      {
        label: "Revenue change",
        value: formatDelta(revenueDelta),
        helper: `₹${Math.round(data.totalRevenue.current).toLocaleString()} this period`,
        trend: resolveTrend(revenueDelta),
      },
      {
        label: "Gross profit delta",
        value: formatDelta(profitDelta),
        helper: `${data.grossProfit.margin.toFixed(1)}% gross margin`,
        trend: resolveTrend(profitDelta),
      },
      {
        label: "Active customers",
        value: `${data.activeCustomers.current.toLocaleString()}`,
        helper: `${formatDelta(customerDelta)} vs previous`,
        trend: resolveTrend(customerDelta),
      },
    ],
  };
}

