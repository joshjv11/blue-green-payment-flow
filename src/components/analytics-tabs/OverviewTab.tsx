import { DollarSign, TrendingUp, Package, Users, ShoppingCart, RotateCw, Diamond, Wallet, UserCheck, BarChart3 } from 'lucide-react';
import { KPICard } from '@/components/analytics/KPICard';
import { useKPIData } from '@/hooks/useKPIData';
import { formatINR } from '@/utils/currency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const OverviewTab = () => {
  const { data, loading, error } = useKPIData();

  if (error) {
    return (
      <div className="text-center py-12">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive text-lg font-semibold mb-2">Error loading KPI data</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => window.location.reload()} variant="default">Retry</Button>
              <Button onClick={() => window.location.href = '/sales'} variant="outline">
                Go to Sales
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show empty state if no data
  if (!loading && data && 
      data.totalRevenue.current === 0 && 
      data.grossProfit.current === 0 && 
      data.activeCustomers.current === 0) {
    return (
      <div className="text-center py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-muted-foreground py-8">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold mb-2">No analytics data yet</p>
              <p className="text-sm mb-6 max-w-md mx-auto">
                Start tracking your business by creating sales orders and adding products to inventory. 
                Once you have data, your analytics will appear here.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.location.href = '/sales'} variant="default">
                  Create Sales Order
                </Button>
                <Button onClick={() => window.location.href = '/inventory'} variant="outline">
                  Add Products
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const calculateTrend = (current: number, previous: number): 'up' | 'down' | 'neutral' => {
    if (current > previous * 1.05) return 'up';
    if (current < previous * 0.95) return 'down';
    return 'neutral';
  };

  const calculatePercentChange = (current: number, previous: number): string => {
    if (previous === 0) return 'N/A';
    const change = ((current - previous) / previous) * 100;
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  const getStatus = (trend: 'up' | 'down' | 'neutral', isReverse = false): 'success' | 'warning' | 'error' | 'neutral' => {
    if (trend === 'neutral') return 'neutral';
    if (isReverse) {
      return trend === 'down' ? 'success' : 'error';
    }
    return trend === 'up' ? 'success' : 'error';
  };

  return (
    <div className="space-y-6">
      {/* Row 1: Revenue, Gross Profit, Profit Margin */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <KPICard
          label="Total Revenue"
          value={data ? formatINR(data.totalRevenue.current) : '---'}
          secondaryValue="Total sales this period"
          comparison={data ? {
            value: `${calculatePercentChange(data.totalRevenue.current, data.totalRevenue.previous)} vs last period`,
            trend: calculateTrend(data.totalRevenue.current, data.totalRevenue.previous)
          } : undefined}
          icon={DollarSign}
          tooltip="Total money earned from all sales in this period"
          sparklineData={data?.totalRevenue.sparkline}
          status={data ? getStatus(calculateTrend(data.totalRevenue.current, data.totalRevenue.previous)) : 'neutral'}
          loading={loading}
        />

        <KPICard
          label="Gross Profit"
          value={data ? formatINR(data.grossProfit.current) : '---'}
          secondaryValue={data ? `${data.grossProfit.margin.toFixed(1)}% margin` : '---'}
          comparison={data ? {
            value: `${calculatePercentChange(data.grossProfit.current, data.grossProfit.previous)} vs last period`,
            trend: calculateTrend(data.grossProfit.current, data.grossProfit.previous)
          } : undefined}
          icon={TrendingUp}
          tooltip="Revenue minus the cost of goods sold"
          sparklineData={data?.grossProfit.sparkline}
          status={data ? (
            data.grossProfit.margin > 20 ? 'success' :
            data.grossProfit.margin > 10 ? 'warning' : 'error'
          ) : 'neutral'}
          loading={loading}
        />

        <KPICard
          label="Profit Margin"
          value={data ? `${data.profitMargin.current.toFixed(1)}%` : '---'}
          secondaryValue={data ? `vs ${data.profitMargin.previous.toFixed(1)}% last period` : '---'}
          comparison={data ? {
            value: `${(data.profitMargin.current - data.profitMargin.previous).toFixed(1)}% change`,
            trend: calculateTrend(data.profitMargin.current, data.profitMargin.previous)
          } : undefined}
          icon={TrendingUp}
          tooltip="Percentage of revenue that becomes profit"
          sparklineData={data?.profitMargin.sparkline}
          status={data ? (
            data.profitMargin.current > 20 ? 'success' :
            data.profitMargin.current > 10 ? 'warning' : 'error'
          ) : 'neutral'}
          loading={loading}
        />
      </div>

      {/* Row 2: AOV, Units Sold, Inventory Turnover */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <KPICard
          label="Average Order Value"
          value={data ? formatINR(data.avgOrderValue.current) : '---'}
          secondaryValue="Per transaction"
          comparison={data ? {
            value: `${calculatePercentChange(data.avgOrderValue.current, data.avgOrderValue.previous)} vs last period`,
            trend: calculateTrend(data.avgOrderValue.current, data.avgOrderValue.previous)
          } : undefined}
          icon={ShoppingCart}
          tooltip="Average money spent per customer order"
          sparklineData={data?.avgOrderValue.sparkline}
          status={data ? getStatus(calculateTrend(data.avgOrderValue.current, data.avgOrderValue.previous)) : 'neutral'}
          loading={loading}
        />

        <KPICard
          label="Total Units Sold"
          value={data ? data.totalUnitsSold.current.toLocaleString() : '---'}
          secondaryValue={data ? `~${Math.round(data.totalUnitsSold.avgPerDay)} per day` : '---'}
          comparison={data ? {
            value: `${calculatePercentChange(data.totalUnitsSold.current, data.totalUnitsSold.previous)} vs last period`,
            trend: calculateTrend(data.totalUnitsSold.current, data.totalUnitsSold.previous)
          } : undefined}
          icon={Package}
          tooltip="Total number of items/units sold this period"
          sparklineData={data?.totalUnitsSold.sparkline}
          status={data ? getStatus(calculateTrend(data.totalUnitsSold.current, data.totalUnitsSold.previous)) : 'neutral'}
          loading={loading}
        />

        <KPICard
          label="Inventory Turnover"
          value={data ? `${data.inventoryTurnover.current.toFixed(1)}x` : '---'}
          secondaryValue={data ? `vs ${data.inventoryTurnover.previous.toFixed(1)}x last period` : '---'}
          comparison={data ? {
            value: `${calculatePercentChange(data.inventoryTurnover.current, data.inventoryTurnover.previous)} change`,
            trend: calculateTrend(data.inventoryTurnover.current, data.inventoryTurnover.previous)
          } : undefined}
          icon={RotateCw}
          tooltip="How many times inventory sells and is replaced in this period"
          sparklineData={data?.inventoryTurnover.sparkline}
          status={data ? (
            data.inventoryTurnover.current > 4 ? 'success' :
            data.inventoryTurnover.current > 2 ? 'warning' : 'error'
          ) : 'neutral'}
          loading={loading}
        />
      </div>

      {/* Row 3: CLV, Cash Position, Active Customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <KPICard
          label="Customer Lifetime Value"
          value={data ? formatINR(data.customerLifetimeValue.current) : '---'}
          secondaryValue={data ? `Median ${formatINR(data.customerLifetimeValue.median)}` : '---'}
          comparison={undefined}
          icon={Diamond}
          tooltip="Average total revenue per customer over their lifetime with us"
          sparklineData={data?.customerLifetimeValue.sparkline}
          status="success"
          loading={loading}
        />

        <KPICard
          label="Cash Position"
          value={data ? formatINR(data.cashPosition.current) : '---'}
          secondaryValue={data ? `${data.cashPosition.change >= 0 ? '+' : ''}${formatINR(data.cashPosition.change)} change` : '---'}
          comparison={data ? {
            value: data.cashPosition.current >= 0 ? 'Positive flow' : 'Negative flow',
            trend: data.cashPosition.current >= 0 ? 'up' : 'down'
          } : undefined}
          icon={Wallet}
          tooltip="Net cash flow this period (sales received - purchases paid)"
          sparklineData={data?.cashPosition.sparkline}
          status={data ? (
            data.cashPosition.current > 0 ? 'success' :
            data.cashPosition.current > -10000 ? 'warning' : 'error'
          ) : 'neutral'}
          loading={loading}
        />

        <KPICard
          label="Active Customers"
          value={data ? data.activeCustomers.current.toString() : '---'}
          secondaryValue={data ? `${data.activeCustomers.new} new, ${data.activeCustomers.returning} returning` : '---'}
          comparison={data ? {
            value: `${data.activeCustomers.new} new customers`,
            trend: data.activeCustomers.new > 0 ? 'up' : 'neutral'
          } : undefined}
          icon={Users}
          tooltip="Number of unique customers who made a purchase this period"
          sparklineData={data?.activeCustomers.sparkline}
          status={data ? getStatus(calculateTrend(data.activeCustomers.current, data.activeCustomers.current * 0.9)) : 'neutral'}
          loading={loading}
        />
      </div>

      {/* Note about CAC */}
      <div className="text-sm text-muted-foreground italic">
        Note: Customer Acquisition Cost (CAC) requires marketing expense tracking. Set up marketing data integration to view this metric.
      </div>
    </div>
  );
};

export default OverviewTab;
