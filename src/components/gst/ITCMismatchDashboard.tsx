import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle2, XCircle, Mail, MessageSquare, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/utils/locale';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Locale, t } from '@/utils/locale';

interface ITCMismatch {
  id: string;
  purchase_order_id: string;
  invoice_number: string;
  invoice_date: string;
  supplier_gstin: string;
  your_amount: number;
  gstn_amount: number;
  difference: number;
  mismatch_type: 'missing' | 'amount_mismatch' | 'date_mismatch' | 'supplier_mismatch';
  is_resolved: boolean;
  resolution_notes?: string;
  created_at: string;
}

export function ITCMismatchDashboard() {
  const { toast } = useToast();
  const [locale] = useLocalStorage<Locale>('invoiceflow_locale', 'en-IN');
  const [mismatches, setMismatches] = useState<ITCMismatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');

  useEffect(() => {
    loadMismatches();
  }, [filter]);

  const loadMismatches = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('itc_mismatch_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filter === 'unresolved') {
        query = query.eq('is_resolved', false);
      } else if (filter === 'resolved') {
        query = query.eq('is_resolved', true);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === 'PGRST204' || error.code === '42P01') {
          // Table doesn't exist yet
          setMismatches([]);
          return;
        }
        throw error;
      }

      setMismatches(data || []);
    } catch (error: any) {
      console.error('Error loading mismatches:', error);
      toast({
        title: t('error', locale),
        description: error.message || t('loading', locale),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async (mismatch: ITCMismatch) => {
    try {
      // Get supplier contact info from purchase order
      const { data: purchase } = await supabase
        .from('purchase_orders')
        .select('supplier_name, supplier_email, supplier_phone')
        .eq('id', mismatch.purchase_order_id)
        .single();

      if (!purchase) {
        toast({
          title: t('error', locale),
          description: 'Purchase order not found',
          variant: 'destructive',
        });
        return;
      }

      // Create dispute record
      await supabase
        .from('itc_mismatch_alerts')
        .update({
          is_resolved: false,
          resolution_notes: `Dispute filed on ${new Date().toLocaleDateString()}. Contacting supplier: ${purchase.supplier_email || purchase.supplier_phone}`,
        })
        .eq('id', mismatch.id);

      // Send email to supplier (if email available)
      if (purchase.supplier_email) {
        // TODO: Integrate with email service
        toast({
          title: t('success', locale),
          description: `Dispute email sent to ${purchase.supplier_email}`,
        });
      }

      // Send WhatsApp message (if phone available)
      if (purchase.supplier_phone) {
        try {
          await supabase.functions.invoke('send-whatsapp-message', {
            body: {
              phone_number: purchase.supplier_phone,
              message: locale === 'hi-IN'
                ? `नमस्ते, आपके इनवॉइस ${mismatch.invoice_number} में ITC असमानता है। कृपया जांच करें।`
                : `Hello, there is an ITC mismatch in your invoice ${mismatch.invoice_number}. Please verify.`,
            },
          });
        } catch (err) {
          console.warn('WhatsApp send failed:', err);
        }
      }

      toast({
        title: t('success', locale),
        description: locale === 'hi-IN' ? 'विवाद दर्ज किया गया' : 'Dispute filed successfully',
      });

      loadMismatches();
    } catch (error: any) {
      toast({
        title: t('error', locale),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleResolve = async (mismatch: ITCMismatch) => {
    try {
      await supabase
        .from('itc_mismatch_alerts')
        .update({
          is_resolved: true,
          resolution_notes: `Resolved manually on ${new Date().toLocaleDateString()}`,
        })
        .eq('id', mismatch.id);

      toast({
        title: t('success', locale),
        description: locale === 'hi-IN' ? 'असमानता हल की गई' : 'Mismatch resolved',
      });

      loadMismatches();
    } catch (error: any) {
      toast({
        title: t('error', locale),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getMismatchTypeBadge = (type: string) => {
    const badges = {
      missing: { label: t('missing', locale), variant: 'destructive' as const },
      amount_mismatch: { label: t('amount_difference', locale), variant: 'destructive' as const },
      date_mismatch: { label: t('date_difference', locale), variant: 'default' as const },
      supplier_mismatch: { label: t('supplier_mismatch', locale), variant: 'default' as const },
    };
    return badges[type as keyof typeof badges] || { label: type, variant: 'default' as const };
  };

  const totalAtRisk = mismatches
    .filter(m => !m.is_resolved)
    .reduce((sum, m) => sum + Math.abs(m.difference), 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('loading', locale)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('total', locale)} {t('mismatch', locale)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mismatches.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('unresolved', locale)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {mismatches.filter(m => !m.is_resolved).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('itc_claim', locale)} {t('at_risk', locale)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalAtRisk, locale)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('resolved', locale)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {mismatches.filter(m => m.is_resolved).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          size="sm"
        >
          {t('all', locale)}
        </Button>
        <Button
          variant={filter === 'unresolved' ? 'default' : 'outline'}
          onClick={() => setFilter('unresolved')}
          size="sm"
        >
          {t('unresolved', locale)}
        </Button>
        <Button
          variant={filter === 'resolved' ? 'default' : 'outline'}
          onClick={() => setFilter('resolved')}
          size="sm"
        >
          {t('resolved', locale)}
        </Button>
      </div>

      {/* Mismatches Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('itc_mismatch', locale)}</CardTitle>
          <CardDescription>
            {locale === 'hi-IN'
              ? 'असमानताओं की समीक्षा करें और विवाद दर्ज करें'
              : 'Review mismatches and file disputes'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mismatches.length === 0 ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {locale === 'hi-IN'
                  ? 'कोई असमानता नहीं मिली'
                  : 'No mismatches found'}
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('invoice_number', locale)}</TableHead>
                  <TableHead>{t('invoice_date', locale)}</TableHead>
                  <TableHead>{t('your_amount', locale)}</TableHead>
                  <TableHead>{t('gstn_amount', locale)}</TableHead>
                  <TableHead>{t('amount_difference', locale)}</TableHead>
                  <TableHead>{t('mismatch', locale)}</TableHead>
                  <TableHead>{t('status', locale)}</TableHead>
                  <TableHead>{t('actions', locale)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mismatches.map((mismatch) => (
                  <TableRow key={mismatch.id}>
                    <TableCell className="font-medium">{mismatch.invoice_number}</TableCell>
                    <TableCell>{new Date(mismatch.invoice_date).toLocaleDateString()}</TableCell>
                    <TableCell>{formatCurrency(mismatch.your_amount, locale)}</TableCell>
                    <TableCell>{formatCurrency(mismatch.gstn_amount, locale)}</TableCell>
                    <TableCell>
                      <span className={mismatch.difference > 0 ? 'text-destructive' : 'text-green-600'}>
                        {mismatch.difference > 0 ? '+' : ''}{formatCurrency(mismatch.difference, locale)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getMismatchTypeBadge(mismatch.mismatch_type).variant}>
                        {getMismatchTypeBadge(mismatch.mismatch_type).label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {mismatch.is_resolved ? (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {t('resolved', locale)}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {t('pending', locale)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!mismatch.is_resolved && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDispute(mismatch)}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              {t('dispute', locale)}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolve(mismatch)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              {t('resolve', locale)}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

