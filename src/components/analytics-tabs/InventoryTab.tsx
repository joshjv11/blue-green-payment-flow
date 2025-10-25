import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Package, TrendingUp, ArrowDown } from 'lucide-react';

const InventoryTab = () => {
  const inventoryData = [
    { id: 1, name: 'Wireless Mouse', sku: 'WM-001', stock: 45, reorderLevel: 20, status: 'healthy', value: 22500 },
    { id: 2, name: 'USB-C Cable', sku: 'UC-002', stock: 12, reorderLevel: 25, status: 'low', value: 4800 },
    { id: 3, name: 'Laptop Stand', sku: 'LS-003', stock: 3, reorderLevel: 10, status: 'critical', value: 6000 },
    { id: 4, name: 'Keyboard', sku: 'KB-004', stock: 67, reorderLevel: 30, status: 'healthy', value: 67000 },
    { id: 5, name: 'Monitor', sku: 'MN-005', stock: 8, reorderLevel: 15, status: 'low', value: 80000 },
  ];

  const forecastData = [
    { product: 'Wireless Mouse', predicted: 28, confidence: 92 },
    { product: 'USB-C Cable', predicted: 45, confidence: 88 },
    { product: 'Keyboard', predicted: 35, confidence: 95 },
    { product: 'Monitor', predicted: 12, confidence: 85 },
  ];

  const totalValue = inventoryData.reduce((sum, item) => sum + item.value, 0);
  const criticalItems = inventoryData.filter(item => item.status === 'critical').length;
  const lowStockItems = inventoryData.filter(item => item.status === 'low').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'low':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
      case 'healthy':
        return <Badge variant="default" className="bg-green-100 text-green-800">Healthy</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Inventory Value</p>
                <p className="text-2xl font-bold mt-2">₹{(totalValue / 1000).toFixed(0)}K</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total SKUs</p>
                <p className="text-2xl font-bold mt-2">{inventoryData.length}</p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold mt-2">{lowStockItems}</p>
              </div>
              <ArrowDown className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Items</p>
                <p className="text-2xl font-bold mt-2">{criticalItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Status Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Inventory Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inventoryData.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium">{item.name}</h4>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">SKU: {item.sku}</p>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Stock: {item.stock} units</span>
                      <span>Reorder: {item.reorderLevel}</span>
                    </div>
                    <Progress 
                      value={(item.stock / item.reorderLevel) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="font-medium">₹{(item.value / 1000).toFixed(1)}K</p>
                  <p className="text-xs text-muted-foreground">Value</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Demand Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            30-Day Demand Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {forecastData.map((item) => (
              <div key={item.product} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{item.product}</h4>
                  <p className="text-sm text-muted-foreground">Predicted demand next month</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{item.predicted}</p>
                  <Badge variant="outline" className="mt-1">
                    {item.confidence}% confidence
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryTab;
