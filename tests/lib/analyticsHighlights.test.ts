import { describe, expect, it } from "vitest";
import { computeAnalyticsHighlights } from "@/lib/analyticsHighlights";
import type { KPIData } from "@/hooks/useKPIData";

const buildKpiData = (overrides: Partial<KPIData> = {}): KPIData => ({
  totalRevenue: { current: 120000, previous: 90000, sparkline: [60000, 78000, 82000, 90000, 100000, 120000] },
  grossProfit: { current: 48000, previous: 36000, margin: 40, sparkline: [20000, 25000, 30000, 36000, 42000, 48000] },
  profitMargin: { current: 40, previous: 32, sparkline: [22, 24, 28, 30, 35, 40] },
  avgOrderValue: { current: 9500, previous: 9100, sparkline: [8200, 8600, 9000, 9200, 9400, 9500] },
  totalUnitsSold: { current: 126, previous: 110, avgPerDay: 4.2, sparkline: [70, 82, 90, 100, 115, 126] },
  inventoryTurnover: { current: 4.8, previous: 3.9, sparkline: [3.1, 3.3, 3.6, 4.0, 4.4, 4.8] },
  customerLifetimeValue: { current: 26000, median: 22000, sparkline: [18000, 19000, 21000, 23000, 24000, 26000] },
  cashPosition: { current: 180000, change: 25000, sparkline: [80000, 90000, 110000, 125000, 150000, 180000] },
  activeCustomers: {
    current: 42,
    new: 14,
    returning: 28,
    sparkline: [18, 22, 28, 30, 36, 42],
  },
  ...overrides,
});

describe("computeAnalyticsHighlights", () => {
  it("returns placeholder copy when KPI data is missing", () => {
    const result = computeAnalyticsHighlights(null);
    expect(result.headline).toMatch(/warming up/i);
    expect(result.metrics).toHaveLength(3);
    expect(result.metrics[0].trend).toBe("flat");
  });

  it("summarises positive revenue momentum", () => {
    const data = buildKpiData();
    const result = computeAnalyticsHighlights(data);

    expect(result.headline).toMatch(/accelerating/i);
    expect(result.metrics[0].trend).toBe("up");
    expect(result.metrics[0].value).toMatch(/\+/);
    expect(result.metrics[1].helper).toContain("% gross margin");
  });

  it("flags declining revenue when current period underperforms", () => {
    const data = buildKpiData({
      totalRevenue: { current: 72000, previous: 90000, sparkline: [90000, 87000, 82000, 78000, 76000, 72000] },
    });
    const result = computeAnalyticsHighlights(data);

    expect(result.headline).toMatch(/cooled off/i);
    expect(result.metrics[0].trend).toBe("down");
  });

  it("treats customer trend as steady when sparkline is flat", () => {
    const data = buildKpiData({
      activeCustomers: {
        current: 30,
        new: 10,
        returning: 20,
        sparkline: [30, 30, 30, 30, 30, 30],
      },
    });
    const result = computeAnalyticsHighlights(data);
    expect(result.metrics[2].trend).toBe("flat");
    expect(result.metrics[2].helper).toContain("%");
  });
});

