import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { FileText, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { usePlan } from '@/contexts/PlanContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface BulkEInvoiceProcessorProps {
  salesOrderIds: string[];
  onComplete?: () => void;
}

interface QueueItem {
  id: string;
  sales_order_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retry';
  retry_count: number;
  error_message?: string;
  created_at: string;
  processed_at?: string;
}

export function BulkEInvoiceProcessor({
  salesOrderIds,
  onComplete,
}: BulkEInvoiceProcessorProps) {
  const { toast } = useToast();
  const { isPremium } = usePlan();
  const [loading, setLoading] = useState(false);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (polling && queueItems.length > 0) {
      const interval = setInterval(() => {
        fetchQueueStatus();
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [polling, queueItems]);

  if (!isPremium) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bulk E-Invoice Processing</CardTitle>
          <CardDescription>Premium plan required</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Bulk e-invoice processing is available only for Premium plan users.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleBulkProcess = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('bulk-einvoice', {
        body: {
          sales_order_ids: salesOrderIds,
          action: 'generate_irn',
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Bulk Processing Started! ✅",
          description: `${data.queue_items} invoices added to processing queue`,
        });
        setPolling(true);
        fetchQueueStatus();
      } else {
        throw new Error(data.error || 'Failed to start bulk processing');
      }
    } catch (error: any) {
      toast({
        title: "Bulk Processing Failed",
        description: error.message || "Failed to start bulk e-invoice processing.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('einvoice_queue')
        .select('*')
        .in('sales_order_id', salesOrderIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setQueueItems(data || []);

      // Check if all items are completed or failed
      const allDone = data?.every(item => 
        item.status === 'completed' || item.status === 'failed'
      );

      if (allDone && data && data.length > 0) {
        setPolling(false);
        onComplete?.();
      }
    } catch (error: any) {
      console.error('Error fetching queue status:', error);
    }
  };

  const completedCount = queueItems.filter(item => item.status === 'completed').length;
  const failedCount = queueItems.filter(item => item.status === 'failed').length;
  const processingCount = queueItems.filter(item => item.status === 'processing').length;
  const pendingCount = queueItems.filter(item => item.status === 'pending' || item.status === 'retry').length;
  const total = queueItems.length;
  const progress = total > 0 ? (completedCount / total) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Bulk E-Invoice Processing
        </CardTitle>
        <CardDescription>
          Process {salesOrderIds.length} invoices in bulk (100+ invoices/day supported)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {queueItems.length === 0 ? (
          <Button
            onClick={handleBulkProcess}
            disabled={loading || salesOrderIds.length === 0}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting Bulk Processing...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Start Bulk Processing ({salesOrderIds.length} invoices)
              </>
            )}
          </Button>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{completedCount} / {total} completed</span>
              </div>
              <Progress value={progress} />
            </div>

            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{pendingCount}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{processingCount}</div>
                <div className="text-xs text-muted-foreground">Processing</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>

            {polling && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Auto-refreshing status...
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={fetchQueueStatus}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>

            {queueItems.length > 0 && (
              <div className="border rounded-lg max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Retries</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queueItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">
                          {item.sales_order_id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === 'completed' ? 'default' :
                              item.status === 'failed' ? 'destructive' :
                              item.status === 'processing' ? 'secondary' :
                              'outline'
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.retry_count}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.error_message || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

