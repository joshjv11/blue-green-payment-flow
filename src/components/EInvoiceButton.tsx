import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { FileText, Loader2, CheckCircle2, XCircle, QrCode, Truck } from 'lucide-react';
import { usePlan } from '@/contexts/PlanContext';
import { useAutoSyncEInvoice } from '@/hooks/useAutoSyncEInvoice';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface EInvoiceButtonProps {
  salesOrderId: string;
  irn?: string | null;
  einvoiceStatus?: string | null;
  ewayBillNo?: string | null;
  qrCodeUrl?: string | null;
  onSuccess?: () => void;
}

export function EInvoiceButton({
  salesOrderId,
  irn,
  einvoiceStatus,
  ewayBillNo,
  qrCodeUrl,
  onSuccess,
}: EInvoiceButtonProps) {
  const { toast } = useToast();
  const { isPremium } = usePlan();
  const [loading, setLoading] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [action, setAction] = useState<'irn' | 'ewaybill' | null>(null);
  
  // Auto-sync e-invoice status every 5 minutes
  useAutoSyncEInvoice(irn ? [salesOrderId] : []);

  if (!isPremium) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        onClick={() => {
          toast({
            title: "Premium Feature",
            description: "E-invoicing is available only for Premium plan users. Upgrade to access this feature.",
            variant: "destructive",
          });
        }}
      >
        <FileText className="h-4 w-4 mr-2" />
        E-Invoice (Premium)
      </Button>
    );
  }

  const handleGenerateIRN = async () => {
    setLoading(true);
    setAction('irn');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('generate-einvoice', {
        body: {
          sales_order_id: salesOrderId,
          action: 'generate_irn',
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "IRN Generated Successfully! ✅",
          description: `IRN: ${data.result.irn || 'Generated'}`,
        });
        onSuccess?.();
      } else {
        throw new Error(data.error || 'Failed to generate IRN');
      }
    } catch (error: any) {
      toast({
        title: "IRN Generation Failed",
        description: error.message || "Failed to generate IRN. Please check your GSTN credentials.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleGenerateEwayBill = async () => {
    if (!irn) {
      toast({
        title: "IRN Required",
        description: "Please generate IRN first before generating e-way bill.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setAction('ewaybill');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('generate-einvoice', {
        body: {
          sales_order_id: salesOrderId,
          action: 'generate_ewaybill',
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "E-way Bill Generated Successfully! ✅",
          description: `E-way Bill No: ${data.result.eway_bill_no || 'Generated'}`,
        });
        onSuccess?.();
      } else {
        throw new Error(data.error || 'Failed to generate e-way bill');
      }
    } catch (error: any) {
      toast({
        title: "E-way Bill Generation Failed",
        description: error.message || "Failed to generate e-way bill.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleSyncStatus = async () => {
    if (!irn) {
      toast({
        title: "IRN Required",
        description: "IRN not found for this invoice.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('generate-einvoice', {
        body: {
          sales_order_id: salesOrderId,
          action: 'sync_status',
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Status Synced Successfully! ✅",
          description: `E-invoice status: ${data.result.einvoice_status || 'Synced'}`,
        });
        onSuccess?.();
      } else {
        throw new Error(data.error || 'Failed to sync status');
      }
    } catch (error: any) {
      toast({
        title: "Status Sync Failed",
        description: error.message || "Failed to sync status from GSTN portal.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {!irn ? (
        <Button
          onClick={handleGenerateIRN}
          disabled={loading}
          size="sm"
          className="bg-green-600 hover:bg-green-700"
        >
          {loading && action === 'irn' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating IRN...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Generate IRN
            </>
          )}
        </Button>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              IRN: {irn.substring(0, 10)}...
            </Badge>
            {einvoiceStatus && (
              <Badge variant="outline" className="capitalize">
                {einvoiceStatus}
              </Badge>
            )}
          </div>

          {qrCodeUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQRDialog(true)}
            >
              <QrCode className="h-4 w-4 mr-2" />
              View QR Code
            </Button>
          )}

          {!ewayBillNo && (
            <Button
              onClick={handleGenerateEwayBill}
              disabled={loading}
              size="sm"
              variant="outline"
            >
              {loading && action === 'ewaybill' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4 mr-2" />
                  Generate E-way Bill
                </>
              )}
            </Button>
          )}

          {ewayBillNo && (
            <Badge variant="secondary" className="gap-1">
              <Truck className="h-3 w-3" />
              E-way: {ewayBillNo}
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSyncStatus}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Sync Status'
            )}
          </Button>
        </>
      )}

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code for B2C Invoice</DialogTitle>
            <DialogDescription>
              Scan this QR code to verify invoice details on GSTN portal
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {qrCodeUrl && (
              <img src={qrCodeUrl} alt="Invoice QR Code" className="w-64 h-64" />
            )}
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <p>IRN: {irn}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

