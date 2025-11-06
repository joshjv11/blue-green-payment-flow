import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Loader2, TrendingUp } from 'lucide-react';
import { useProfitabilityData } from '@/hooks/useProfitabilityData';
import { SKUProfitabilityTable } from '@/components/analytics/SKUProfitabilityTable';
import { ABCAnalysis } from '@/components/analytics/ABCAnalysis';
import { CategoryMarginChart } from '@/components/analytics/CategoryMarginChart';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function ProfitabilityTab() {
  const [dateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  const { skuData, abcData, categoryData, loading, error, refetch } = useProfitabilityData(dateRange);

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <p className="text-lg font-semibold mb-2 text-destructive">Error loading profitability data</p>
            <p className="text-sm mb-6 max-w-md mx-auto">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={refetch} variant="default">Retry</Button>
              <Button onClick={() => window.location.href = '/sales'} variant="outline">
                Go to Sales
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state if no data
  if (!loading && skuData.length === 0 && abcData.length === 0 && categoryData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-12">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-2">No profitability data yet</p>
            <p className="text-sm mb-6 max-w-md mx-auto">
              Start tracking profitability by creating sales orders with products. 
              Once you have sales data, your profitability analysis will appear here.
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Which Products Make Money?</h2>
          <p className="text-muted-foreground">Analyze profitability by SKU, category, and revenue distribution</p>
        </div>
        <Button variant="outline" size="sm">
          <CalendarIcon className="h-4 w-4 mr-2" />
          Last 30 Days
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading profitability data...</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Section 1: SKU Profitability Table */}
          <Card>
            <CardHeader>
              <CardTitle>SKU Profitability Table</CardTitle>
              <CardDescription>
                Detailed profit breakdown for every product
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SKUProfitabilityTable 
                data={skuData} 
                onRefresh={refetch}
                loading={loading}
              />
            </CardContent>
          </Card>

          {/* Section 2: ABC Analysis */}
          <div>
            <h3 className="text-xl font-semibold mb-4">ABC Analysis</h3>
            <ABCAnalysis data={abcData} />
          </div>

          {/* Section 3: Margin by Category */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Margin by Category</h3>
            <CategoryMarginChart data={categoryData} />
          </div>
        </>
      )}
    </div>
  );
}
