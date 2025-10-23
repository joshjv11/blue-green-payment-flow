import { motion } from 'framer-motion';
import { Package, TrendingUp } from 'lucide-react';
import { InventoryValue } from '@/lib/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InventoryValueCardProps {
  inventory: InventoryValue | null;
  loading?: boolean;
}

export function InventoryValueCard({ inventory, loading }: InventoryValueCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Inventory Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-10 w-32 bg-muted/20 rounded mb-2" />
            <div className="h-4 w-24 bg-muted/20 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-500" />
            Inventory Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-purple-500 mb-2">
            ₹{Number(inventory?.total_inventory_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-sm text-muted-foreground">
            {inventory?.sku_count || 0} {inventory?.sku_count === 1 ? 'product' : 'products'} in stock
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
