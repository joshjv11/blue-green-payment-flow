import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingDown, Package, Clock, DollarSign, Users } from 'lucide-react';

const SmartAlertsTab = () => {
  const alerts = [
    {
      id: 1,
      type: 'critical',
      category: 'inventory',
      icon: Package,
      title: 'Critical Stock Level',
      message: 'Laptop Stand (LS-003) is below reorder level. Only 3 units remaining.',
      timestamp: '5 minutes ago',
      action: 'Reorder Now',
    },
    {
      id: 2,
      type: 'warning',
      category: 'sales',
      icon: TrendingDown,
      title: 'Sales Decline Detected',
      message: 'Keyboard sales dropped 12% this week compared to last week.',
      timestamp: '1 hour ago',
      action: 'View Details',
    },
    {
      id: 3,
      type: 'warning',
      category: 'inventory',
      icon: Package,
      title: 'Low Stock Alert',
      message: 'USB-C Cable (UC-002) approaching reorder level. 12 units remaining.',
      timestamp: '2 hours ago',
      action: 'Review Stock',
    },
    {
      id: 4,
      type: 'info',
      category: 'payment',
      icon: DollarSign,
      title: 'Payment Delay',
      message: '3 invoices are past due date. Total amount: ₹45,000',
      timestamp: '3 hours ago',
      action: 'Send Reminder',
    },
    {
      id: 5,
      type: 'info',
      category: 'customer',
      icon: Users,
      title: 'Customer Retention Risk',
      message: '5 high-value customers haven\'t placed orders in 30 days.',
      timestamp: '5 hours ago',
      action: 'Engage Customers',
    },
  ];

  const insights = [
    {
      id: 1,
      title: 'Peak Performance Day',
      description: 'Saturday shows highest sales. Consider running promotions on Fridays.',
      impact: 'high',
    },
    {
      id: 2,
      title: 'Product Bundle Opportunity',
      description: 'Customers buying Wireless Mouse often purchase USB-C Cable together.',
      impact: 'medium',
    },
    {
      id: 3,
      title: 'Seasonal Trend Detected',
      description: 'Electronics category shows 23% increase in the last 2 weeks.',
      impact: 'medium',
    },
    {
      id: 4,
      title: 'Customer Satisfaction',
      description: 'VIP customers show 98% satisfaction rate. Regular customers at 88%.',
      impact: 'low',
    },
  ];

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'border-red-500 bg-red-50 dark:bg-red-950/20';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
      case 'info':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950/20';
      default:
        return '';
    }
  };

  const getAlertBadge = (type: string) => {
    switch (type) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'info':
        return <Badge variant="default">Info</Badge>;
      default:
        return null;
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high':
        return <Badge variant="default">High Impact</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium Impact</Badge>;
      case 'low':
        return <Badge variant="outline">Low Impact</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts ({alerts.length})
            </CardTitle>
            <Button variant="outline" size="sm">
              Mark All Read
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <div
                  key={alert.id}
                  className={`p-4 border-l-4 rounded-lg ${getAlertColor(alert.type)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className="h-5 w-5 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{alert.title}</h4>
                          {getAlertBadge(alert.type)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {alert.timestamp}
                          </span>
                          <Button size="sm" variant="default">
                            {alert.action}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Smart Insights */}
      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight) => (
              <div key={insight.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold">{insight.title}</h4>
                  {getImpactBadge(insight.impact)}
                </div>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alert Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Inventory Alerts</p>
                <p className="text-sm text-muted-foreground">Get notified about low stock levels</p>
              </div>
              <Badge variant="default">Enabled</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Sales Performance</p>
                <p className="text-sm text-muted-foreground">Track sales trends and anomalies</p>
              </div>
              <Badge variant="default">Enabled</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Customer Behavior</p>
                <p className="text-sm text-muted-foreground">Monitor customer engagement</p>
              </div>
              <Badge variant="outline">Disabled</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Payment Reminders</p>
                <p className="text-sm text-muted-foreground">Overdue invoice notifications</p>
              </div>
              <Badge variant="default">Enabled</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartAlertsTab;
