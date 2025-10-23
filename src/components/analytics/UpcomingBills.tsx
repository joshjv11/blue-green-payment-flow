import { motion } from 'framer-motion';
import { Calendar, AlertCircle } from 'lucide-react';
import { UpcomingBill } from '@/lib/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { differenceInDays, format } from 'date-fns';

interface UpcomingBillsProps {
  bills: UpcomingBill[];
  loading?: boolean;
}

export function UpcomingBills({ bills, loading }: UpcomingBillsProps) {
  if (loading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Bills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted/20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getDaysUntilDue = (dueDate: string) => {
    return differenceInDays(new Date(dueDate), new Date());
  };

  const getUrgencyBadge = (dueDate: string) => {
    const days = getDaysUntilDue(dueDate);
    if (days <= 3) {
      return <Badge variant="destructive">Due in {days} {days === 1 ? 'day' : 'days'}</Badge>;
    } else if (days <= 7) {
      return <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20">Due in {days} days</Badge>;
    } else {
      return <Badge variant="outline">Due in {days} days</Badge>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="col-span-full"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-500" />
            Upcoming Bills (Next 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No upcoming bills in the next 30 days
            </div>
          ) : (
            <div className="space-y-3">
              {bills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-accent/10 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate mb-1">{bill.bill_name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(bill.due_date), 'MMM dd, yyyy')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        ₹{Number(bill.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    {getUrgencyBadge(bill.due_date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
