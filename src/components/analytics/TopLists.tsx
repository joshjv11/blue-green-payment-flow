import { motion } from 'framer-motion';
import { Users, Building2, TrendingUp } from 'lucide-react';
import { TopCustomer, TopVendor } from '@/lib/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TopListsProps {
  customers: TopCustomer[];
  vendors: TopVendor[];
  loading?: boolean;
}

export function TopLists({ customers, vendors, loading }: TopListsProps) {
  if (loading) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted/20 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Top Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted/20 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customers.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No customer data yet
              </div>
            ) : (
              <div className="space-y-3">
                {customers.map((customer, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-accent/10 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{customer.customer_name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">
                        {customer.invoice_count} {customer.invoice_count === 1 ? 'invoice' : 'invoices'}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-semibold text-green-500">
                        ₹{Number(customer.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              Top Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vendors.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No vendor data yet
              </div>
            ) : (
              <div className="space-y-3">
                {vendors.map((vendor, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-accent/10 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{vendor.vendor_name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">
                        {vendor.bill_count} {vendor.bill_count === 1 ? 'bill' : 'bills'}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-semibold text-blue-500">
                        ₹{Number(vendor.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
