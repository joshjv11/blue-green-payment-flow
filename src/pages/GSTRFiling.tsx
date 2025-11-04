import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePlan } from '@/contexts/PlanContext';
import { BackToDashboard } from '@/components/BackToDashboard';
import { PageTransition } from '@/components/PageTransition';
import { PremiumGuard } from '@/components/PremiumGuard';
import { FileText, Download, AlertCircle, CheckCircle2, Loader2, RefreshCw, FileJson, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function GSTRFiling() {
  const { toast } = useToast();
  const { isPremium } = usePlan();
  const [loading, setLoading] = useState(false);
  const [gstr1Filings, setGstr1Filings] = useState<any[]>([]);
  const [gstr3bFilings, setGstr3bFilings] = useState<any[]>([]);
  const [itcReconciliation, setItcReconciliation] = useState<any[]>([]);
  const [mismatchAlerts, setMismatchAlerts] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');

  useEffect(() => {
    if (isPremium) {
      loadData();
      loadGSTIN();
    }
  }, [isPremium]);

  const loadGSTIN = async () => {
    try {
      const { data: credentials } = await supabase
        .from('gstn_credentials')
        .select('gstin')
        .eq('is_active', true)
        .maybeSingle();

      if (credentials) {
        setGstin(credentials.gstin);
      }
    } catch (error) {
      console.error('Error loading GSTIN:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load GSTR-1 filings
      const { data: gstr1 } = await supabase
        .from('gstr1_filings')
        .select('*')
        .eq('user_id', user.id)
        .order('filing_period', { ascending: false })
        .limit(12);

      setGstr1Filings(gstr1 || []);

      // Load GSTR-3B filings
      const { data: gstr3b } = await supabase
        .from('gstr3b_filings')
        .select('*')
        .eq('user_id', user.id)
        .order('filing_period', { ascending: false })
        .limit(12);

      setGstr3bFilings(gstr3b || []);

      // Load ITC reconciliation
      const { data: itc } = await supabase
        .from('itc_reconciliation')
        .select('*')
        .eq('user_id', user.id)
        .order('invoice_date', { ascending: false })
        .limit(50);

      setItcReconciliation(itc || []);

      // Load mismatch alerts
      const { data: alerts } = await supabase
        .from('gst_mismatch_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_resolved', false)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      setMismatchAlerts(alerts || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateGSTR1 = async () => {
    if (!selectedPeriod || !gstin) {
      toast({
        title: "Validation Error",
        description: "Please select a period and ensure GSTIN is configured",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-gstr1', {
        body: {
          filing_period: selectedPeriod,
          filing_type: selectedPeriod.includes('Q') ? 'quarterly' : 'monthly',
          gstin,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "GSTR-1 Generated! ✅",
          description: `Generated for period ${selectedPeriod}`,
        });
        loadData();
      } else {
        throw new Error(data.error || 'Failed to generate GSTR-1');
      }
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate GSTR-1",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateGSTR3B = async () => {
    if (!selectedPeriod || !gstin) {
      toast({
        title: "Validation Error",
        description: "Please select a period and ensure GSTIN is configured",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-gstr3b', {
        body: {
          filing_period: selectedPeriod,
          gstin,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "GSTR-3B Generated! ✅",
          description: `Generated for period ${selectedPeriod}`,
        });
        loadData();
      } else {
        throw new Error(data.error || 'Failed to generate GSTR-3B');
      }
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate GSTR-3B",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReconcileITC = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reconcile-itc', {
        body: {
          period: selectedPeriod || undefined,
          auto_download_form2a: true,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "ITC Reconciliation Complete! ✅",
          description: `Matched: ${data.matched_count}, Mismatches: ${data.mismatch_count}`,
        });
        loadData();
      } else {
        throw new Error(data.error || 'Failed to reconcile ITC');
      }
    } catch (error: any) {
      toast({
        title: "Reconciliation Failed",
        description: error.message || "Failed to reconcile ITC",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJSON = async (filing: any, type: 'gstr1' | 'gstr3b') => {
    try {
      const jsonData = filing.json_data;
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${filing.filing_period}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded",
        description: `${type.toUpperCase()} JSON file downloaded`,
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isPremium) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background p-4">
          <BackToDashboard />
          <PremiumGuard featureName="GSTR Filing">
            <div />
          </PremiumGuard>
        </div>
      </PageTransition>
    );
  }

  const unresolvedAlerts = mismatchAlerts.filter(a => !a.is_resolved);
  const criticalAlerts = unresolvedAlerts.filter(a => a.severity === 'critical' || a.severity === 'high');

  return (
    <PageTransition>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <BackToDashboard />
          
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <FileText className="h-8 w-8" />
              GST Filing Dashboard
            </h1>
            <p className="text-muted-foreground">
              Generate GSTR-1, GSTR-3B, reconcile ITC, and file returns directly with GSTN
            </p>
          </div>

          {criticalAlerts.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{criticalAlerts.length} critical mismatch{alerts.length > 1 ? 'es' : ''} detected!</strong>
                {' '}Review ITC reconciliation to resolve discrepancies.
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Generate GST Returns</CardTitle>
              <CardDescription>One-click generation for GSTR-1 and GSTR-3B</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Filing Period</label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select period (e.g., 2024-01)" />
                    </SelectTrigger>
                    <SelectContent>
                      {generatePeriodOptions().map(period => (
                        <SelectItem key={period} value={period}>{period}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateGSTR1}
                    disabled={loading || !selectedPeriod || !gstin}
                  >
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                    Generate GSTR-1
                  </Button>
                  <Button
                    onClick={handleGenerateGSTR3B}
                    disabled={loading || !selectedPeriod || !gstin}
                    variant="outline"
                  >
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                    Generate GSTR-3B
                  </Button>
                  <Button
                    onClick={handleReconcileITC}
                    disabled={loading}
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reconcile ITC
                  </Button>
                </div>
              </div>
              {!gstin && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please configure your GSTIN in <a href="/settings/e-invoice" className="text-primary underline">E-Invoice Settings</a>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="gstr1" className="space-y-4">
            <TabsList>
              <TabsTrigger value="gstr1">GSTR-1</TabsTrigger>
              <TabsTrigger value="gstr3b">GSTR-3B</TabsTrigger>
              <TabsTrigger value="itc">ITC Reconciliation</TabsTrigger>
              <TabsTrigger value="alerts">
                Mismatch Alerts
                {unresolvedAlerts.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{unresolvedAlerts.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gstr1" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>GSTR-1 Filings (Outward Supplies)</CardTitle>
                  <CardDescription>Monthly/Quarterly return for sales invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  {gstr1Filings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No GSTR-1 filings generated yet
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total Value</TableHead>
                          <TableHead>Total Tax</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gstr1Filings.map((filing) => (
                          <TableRow key={filing.id}>
                            <TableCell>{filing.filing_period}</TableCell>
                            <TableCell>
                              <Badge variant={filing.status === 'filed' ? 'default' : 'secondary'}>
                                {filing.status}
                              </Badge>
                            </TableCell>
                            <TableCell>₹{parseFloat(filing.total_sales_value || 0).toFixed(2)}</TableCell>
                            <TableCell>₹{parseFloat(filing.total_tax_amount || 0).toFixed(2)}</TableCell>
                            <TableCell>{filing.due_date || '-'}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadJSON(filing, 'gstr1')}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                JSON
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gstr3b" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>GSTR-3B Filings (Monthly Summary)</CardTitle>
                  <CardDescription>Monthly self-assessed return</CardDescription>
                </CardHeader>
                <CardContent>
                  {gstr3bFilings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No GSTR-3B filings generated yet
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Outward Supply</TableHead>
                          <TableHead>ITC Available</TableHead>
                          <TableHead>Tax Payable</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gstr3bFilings.map((filing) => (
                          <TableRow key={filing.id}>
                            <TableCell>{filing.filing_period}</TableCell>
                            <TableCell>
                              <Badge variant={filing.status === 'filed' ? 'default' : 'secondary'}>
                                {filing.status}
                              </Badge>
                            </TableCell>
                            <TableCell>₹{parseFloat(filing.outward_supply_value || 0).toFixed(2)}</TableCell>
                            <TableCell>₹{parseFloat(filing.itc_available || 0).toFixed(2)}</TableCell>
                            <TableCell>₹{parseFloat(filing.tax_payable || 0).toFixed(2)}</TableCell>
                            <TableCell>{filing.due_date || '-'}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadJSON(filing, 'gstr3b')}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                JSON
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="itc" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>ITC Reconciliation</CardTitle>
                  <CardDescription>Input Tax Credit reconciliation with Form 2A/2B</CardDescription>
                </CardHeader>
                <CardContent>
                  {itcReconciliation.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No ITC reconciliation data yet. Run reconciliation to get started.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Supplier GSTIN</TableHead>
                          <TableHead>ITC Eligible</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Mismatch</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itcReconciliation.map((itc) => (
                          <TableRow key={itc.id}>
                            <TableCell>{itc.invoice_number}</TableCell>
                            <TableCell className="font-mono text-xs">{itc.gstin}</TableCell>
                            <TableCell>₹{parseFloat(itc.itc_eligible || 0).toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  itc.reconciliation_status === 'matched' ? 'default' :
                                  itc.reconciliation_status === 'mismatch' ? 'destructive' :
                                  'secondary'
                                }
                              >
                                {itc.reconciliation_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {itc.mismatch_reason || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Mismatch Alerts</CardTitle>
                  <CardDescription>Discrepancies between your data and GSTN data</CardDescription>
                </CardHeader>
                <CardContent>
                  {unresolvedAlerts.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600" />
                      <p className="text-muted-foreground">No unresolved mismatches</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {unresolvedAlerts.map((alert) => (
                        <Alert
                          key={alert.id}
                          variant={alert.severity === 'critical' || alert.severity === 'high' ? 'destructive' : 'default'}
                        >
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="flex justify-between items-start">
                              <div>
                                <strong>{alert.title}</strong>
                                <p className="mt-1">{alert.description}</p>
                              </div>
                              <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                                {alert.severity}
                              </Badge>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageTransition>
  );
}

// Generate period options (last 12 months + current)
function generatePeriodOptions(): string[] {
  const options: string[] = [];
  const now = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    options.push(`${year}-${month}`);
  }
  
  return options;
}

