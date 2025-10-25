import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Calculator, TrendingUp, TrendingDown } from 'lucide-react';

const ScenarioPlanningTab = () => {
  const [priceChange, setPriceChange] = useState([0]);
  const [demandChange, setDemandChange] = useState([0]);
  const [costChange, setCostChange] = useState([0]);

  const baseScenario = {
    revenue: 180000,
    costs: 105000,
    profit: 75000,
    margin: 41.7,
  };

  // Calculate scenario impact
  const calculateScenario = () => {
    const priceImpact = 1 + priceChange[0] / 100;
    const demandImpact = 1 + demandChange[0] / 100;
    const costImpact = 1 + costChange[0] / 100;

    const newRevenue = baseScenario.revenue * priceImpact * demandImpact;
    const newCosts = baseScenario.costs * costImpact;
    const newProfit = newRevenue - newCosts;
    const newMargin = (newProfit / newRevenue) * 100;

    return {
      revenue: Math.round(newRevenue),
      costs: Math.round(newCosts),
      profit: Math.round(newProfit),
      margin: newMargin.toFixed(1),
      revenueChange: ((newRevenue - baseScenario.revenue) / baseScenario.revenue * 100).toFixed(1),
      profitChange: ((newProfit - baseScenario.profit) / baseScenario.profit * 100).toFixed(1),
    };
  };

  const scenario = calculateScenario();

  const comparisonData = [
    {
      category: 'Revenue',
      current: baseScenario.revenue / 1000,
      projected: scenario.revenue / 1000,
    },
    {
      category: 'Costs',
      current: baseScenario.costs / 1000,
      projected: scenario.costs / 1000,
    },
    {
      category: 'Profit',
      current: baseScenario.profit / 1000,
      projected: scenario.profit / 1000,
    },
  ];

  const presetScenarios = [
    { name: 'Aggressive Growth', price: 5, demand: 15, cost: 10 },
    { name: 'Cost Optimization', price: 0, demand: 0, cost: -15 },
    { name: 'Premium Positioning', price: 20, demand: -5, cost: 5 },
    { name: 'Market Expansion', price: -10, demand: 30, cost: 15 },
  ];

  const applyPreset = (preset: typeof presetScenarios[0]) => {
    setPriceChange([preset.price]);
    setDemandChange([preset.demand]);
    setCostChange([preset.cost]);
  };

  const resetScenario = () => {
    setPriceChange([0]);
    setDemandChange([0]);
    setCostChange([0]);
  };

  return (
    <div className="space-y-6">
      {/* Scenario Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Scenario Parameters
            </CardTitle>
            <Button variant="outline" size="sm" onClick={resetScenario}>
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Price Change */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Price Change</label>
              <Badge variant="outline">{priceChange[0]}%</Badge>
            </div>
            <Slider
              value={priceChange}
              onValueChange={setPriceChange}
              min={-50}
              max={50}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>-50%</span>
              <span>0%</span>
              <span>+50%</span>
            </div>
          </div>

          {/* Demand Change */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Demand Change</label>
              <Badge variant="outline">{demandChange[0]}%</Badge>
            </div>
            <Slider
              value={demandChange}
              onValueChange={setDemandChange}
              min={-50}
              max={50}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>-50%</span>
              <span>0%</span>
              <span>+50%</span>
            </div>
          </div>

          {/* Cost Change */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Cost Change</label>
              <Badge variant="outline">{costChange[0]}%</Badge>
            </div>
            <Slider
              value={costChange}
              onValueChange={setCostChange}
              min={-50}
              max={50}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>-50%</span>
              <span>0%</span>
              <span>+50%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preset Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle>Preset Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {presetScenarios.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                className="h-auto flex-col items-start p-4"
                onClick={() => applyPreset(preset)}
              >
                <span className="font-semibold mb-1">{preset.name}</span>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>Price: {preset.price > 0 ? '+' : ''}{preset.price}%</div>
                  <div>Demand: {preset.demand > 0 ? '+' : ''}{preset.demand}%</div>
                  <div>Cost: {preset.cost > 0 ? '+' : ''}{preset.cost}%</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Projected Revenue</p>
                <p className="text-2xl font-bold mt-2">₹{(scenario.revenue / 1000).toFixed(0)}K</p>
                <Badge
                  variant="outline"
                  className={`mt-2 ${
                    parseFloat(scenario.revenueChange) >= 0
                      ? 'text-green-600 border-green-600'
                      : 'text-red-600 border-red-600'
                  }`}
                >
                  {parseFloat(scenario.revenueChange) >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {scenario.revenueChange}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Projected Costs</p>
                <p className="text-2xl font-bold mt-2">₹{(scenario.costs / 1000).toFixed(0)}K</p>
                <Badge variant="outline" className="mt-2">
                  {costChange[0] > 0 ? '+' : ''}{costChange[0]}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Projected Profit</p>
                <p className="text-2xl font-bold mt-2">₹{(scenario.profit / 1000).toFixed(0)}K</p>
                <Badge
                  variant="outline"
                  className={`mt-2 ${
                    parseFloat(scenario.profitChange) >= 0
                      ? 'text-green-600 border-green-600'
                      : 'text-red-600 border-red-600'
                  }`}
                >
                  {parseFloat(scenario.profitChange) >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {scenario.profitChange}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Current vs Projected</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              current: { label: 'Current', color: 'hsl(var(--chart-1))' },
              projected: { label: 'Projected', color: 'hsl(var(--chart-2))' },
            }}
            className="h-[300px]"
          >
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar dataKey="current" fill="var(--color-current)" />
              <Bar dataKey="projected" fill="var(--color-projected)" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScenarioPlanningTab;
