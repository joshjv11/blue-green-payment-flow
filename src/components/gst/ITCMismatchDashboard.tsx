import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle2, MessageSquare } from 'lucide-react';
import { formatCurrency } from '@/utils/locale';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Locale, t } from '@/utils/locale';
import { useAuth } from '@/hooks/useAuth';

interface ITCMismatch {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  gstin: string | null;
  vendor_name: string | null;
  difference_amount: number;
  mismatch_type: string;
  is_resolved: boolean;
  resolution_notes?: string | null;
  details: Record<string, any> | null;
  created_at: string;
  resolved_at?: string | null;
  your_amount: number;
  gstn_amount: number;
}

export function ITCMismatchDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [locale] = useLocalStorage<Locale>('invoiceflow_locale', 'en-IN');
  const [allMismatches, setAllMismatches] = useState<ITCMismatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    loadMismatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMismatches = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('itc_mismatch_alerts')
        .select('id, invoice_number, vendor_name, mismatch_type, difference_amount, is_resolved, details, created_at, resolved_at, gstin')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.message?.includes('does not exist')) {
          setAllMismatches([]);
          return;
        }
        throw error;
      }

      const mapped = (data || []).map((item) => {
        const details = (item.details as Record<string, any>) || {};
        const yourAmount = Number(details.your_amount ?? details.yourAmount ?? 0);
        const gstnAmount = Number(details.gstn_amount ?? details.gstnAmount ?? 0);
        return {
          id: item.id,
          invoice_number: item.invoice_number,
          invoice_date: details.invoice_date || null,
          gstin: item.gstin || details.supplier_gstin || null,
          vendor_name: item.vendor_name || details.vendor_name || null,
          difference_amount: Number(item.difference_amount ?? 0),
          mismatch_type: item.mismatch_type || details.mismatch_type || 'unknown',
          is_resolved: !!item.is_resolved,
          resolution_notes: details.resolution_notes || null,
          details,
          created_at: item.created_at,
          resolved_at: item.resolved_at || null,
          your_amount: yourAmount,
          gstn_amount: gstnAmount,
        } as ITCMismatch;
      });

      setAllMismatches(mapped);
    } catch (error: any) {
      console.error('Error loading ITC mismatches:', error);
      toast({
        title: 'Failed to load ITC mismatches',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async (mismatch: ITCMismatch) => {
    try {
      setSubmittingId(mismatch.id);
      const currentDetails = mismatch.details || {};
      const updatedDetails = {
        ...currentDetails,
        dispute_requested: true,
        dispute_requested_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('itc_mismatch_alerts')
        .update({ details: updatedDetails })
        .eq('id', mismatch.id);

      if (error) throw error;

      toast({
        title: 'Dispute logged',
        description: 'Our GST ops team will review this mismatch.',
      });

      await loadMismatches();
    } catch (error: any) {
      toast({
        title: 'Dispute failed',
        description: error.message || 'Unable to log dispute right now.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleResolve = async (mismatch: ITCMismatch) => {
    try {
      const resolutionNotes = window.prompt(
        locale === 'hi-IN'
          ? 'समाधान नोट जोड़ें (वैकल्पिक)'
          : 'Add a resolution note (optional)',
        mismatch.resolution_notes || ''
      );

      setSubmittingId(mismatch.id);

      const currentDetails = mismatch.details || {};
      const updatedDetails = {
        ...currentDetails,
        resolution_notes: resolutionNotes || null,
      };

      const { error } = await supabase
        .from('itc_mismatch_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          details: updatedDetails,
        })
        .eq('id', mismatch.id);

      if (error) throw error;

      toast({
        title: locale === 'hi-IN' ? 'समाधान पूरा' : 'Mismatch resolved',
        description:
          locale === 'hi-IN'
            ? 'असमानता को समाधान के रूप में चिह्नित कर दिया गया है।'
            : 'Mismatch is now marked resolved.',
      });

      await loadMismatches();
    } catch (error: any) {
      toast({
        title: locale === 'hi-IN' ? 'समाधान विफल' : 'Unable to resolve',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingId(null);
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

  const totalAtRisk = allMismatches
    .filter(m => !m.is_resolved)
    .reduce((sum, m) => sum + Math.abs(m.difference_amount || 0), 0);

  const mismatches = allMismatches.filter((mismatch) => {
    if (filter === 'resolved') {
      return mismatch.is_resolved;
    }
    if (filter === 'unresolved') {
      return !mismatch.is_resolved;
    }
    return true;
  });

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
              {allMismatches.filter(m => !m.is_resolved).length}
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
              {allMismatches.filter(m => m.is_resolved).length}
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
                    <TableCell>
                      {mismatch.invoice_date
                        ? new Date(mismatch.invoice_date).toLocaleDateString()
                        : new Date(mismatch.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{formatCurrency(mismatch.your_amount, locale)}</TableCell>
                    <TableCell>{formatCurrency(mismatch.gstn_amount, locale)}</TableCell>
                    <TableCell>
                      <span className={mismatch.difference_amount > 0 ? 'text-destructive' : 'text-green-600'}>
                        {mismatch.difference_amount > 0 ? '+' : ''}{formatCurrency(mismatch.difference_amount, locale)}
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
                              disabled={submittingId === mismatch.id}
                              onClick={() => handleDispute(mismatch)}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              {t('dispute', locale)}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={submittingId === mismatch.id}
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

