import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Receipt, Wallet } from 'lucide-react';
import { DashboardSummary } from '@/lib/analytics';

interface DashboardKPIsProps {
  summary: DashboardSummary | null;
  loading?: boolean;
}

export function DashboardKPIs({ summary, loading }: DashboardKPIsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-card/80 p-6 animate-pulse">
            <div className="h-4 w-24 bg-muted rounded mb-3" />
            <div className="h-8 w-32 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total Sales',
      value: summary?.total_sales || 0,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Total Purchases',
      value: summary?.total_purchases || 0,
      icon: ShoppingCart,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Total Expenses',
      value: summary?.total_expenses || 0,
      icon: Receipt,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Net Profit',
      value: summary?.net_profit || 0,
      icon: summary && summary.net_profit >= 0 ? DollarSign : Wallet,
      color: summary && summary.net_profit >= 0 ? 'text-green-500' : 'text-red-500',
      bgColor: summary && summary.net_profit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 hover:border-border transition-all duration-300 group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground font-medium">{kpi.label}</div>
            <div className={`p-2 rounded-xl ${kpi.bgColor} group-hover:scale-110 transition-transform`}>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
          </div>
          <div className={`text-3xl font-bold ${kpi.color}`}>
            ₹{kpi.value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
