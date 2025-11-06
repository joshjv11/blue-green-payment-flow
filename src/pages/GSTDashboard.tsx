import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { usePlan } from '@/contexts/PlanContext';
import { BackToDashboard } from '@/components/BackToDashboard';
import { 
  FileText, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Zap
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageTransition } from '@/components/PageTransition';
import { PremiumGuard } from '@/components/PremiumGuard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function GSTDashboard() {
  const { toast } = useToast();
  const { isPremium } = usePlan();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [credentialsStatus, setCredentialsStatus] = useState<'none' | 'saved' | 'testing'>('none');
  const [itcStatus, setItcStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [hsnStatus, setHsnStatus] = useState<'idle' | 'suggesting'>('idle');
  const [stats, setStats] = useState({
    totalInvoices: 0,
    reconciledInvoices: 0,
    mismatches: 0,
    hsnSuggestions: 0,
  });

  useEffect(() => {
    if (isPremium) {
      checkCredentials();
      loadStats();
    }
  }, [isPremium]);

  const checkCredentials = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('gstn_credentials')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      setCredentialsStatus(data ? 'saved' : 'none');
    } catch (error) {
      console.error('Error checking credentials:', error);
    }
  };

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load ITC stats (handle missing table gracefully)
      let itcData: any[] = [];
      try {
        const { data, error } = await supabase
          .from('itc_reconciliation')
          .select('reconciliation_status')
          .eq('user_id', user.id);
        
        if (error && error.code !== 'PGRST116' && !error.message?.includes('does not exist')) {
          throw error;
        }
        itcData = data || [];
      } catch (error: any) {
        // Table might not exist yet - that's okay
        if (!error.message?.includes('does not exist')) {
          console.warn('Error loading ITC stats:', error);
        }
      }

      const reconciled = itcData?.filter(r => r.reconciliation_status === 'matched').length || 0;
      const mismatches = itcData?.filter(r => r.reconciliation_status === 'mismatch').length || 0;

      // Load HSN stats (handle missing table gracefully)
      let hsnData: any[] = [];
      try {
        const { data, error } = await supabase
          .from('hsn_suggestions')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_confirmed', true);
        
        if (error && error.code !== 'PGRST116' && !error.message?.includes('does not exist')) {
          throw error;
        }
        hsnData = data || [];
      } catch (error: any) {
        // Table might not exist yet - that's okay
        if (!error.message?.includes('does not exist')) {
          console.warn('Error loading HSN stats:', error);
        }
      }

      setStats({
        totalInvoices: itcData?.length || 0,
        reconciledInvoices: reconciled,
        mismatches,
        hsnSuggestions: hsnData?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleTestCredentials = async () => {
    setCredentialsStatus('testing');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: credentials } = await supabase
        .from('gstn_credentials')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!credentials) {
        toast({
          title: "No Credentials Found",
          description: "Please set up your GSTN credentials first",
          variant: "destructive",
        });
        setCredentialsStatus('none');
        return;
      }

      // Decrypt password
      const { data: decrypted } = await supabase.rpc('decrypt_gstn_password', {
        encrypted_password: credentials.password_encrypted,
        user_id: user.id,
      });

      if (!decrypted) {
        throw new Error('Failed to decrypt password');
      }

      // Test connection
      const response = await fetch(`${credentials.api_endpoint || 'https://einvoice.gst.gov.in'}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: credentials.username,
          password: decrypted,
        }),
      });

      if (response.ok) {
        toast({
          title: "✅ Connection Successful!",
          description: "Your GSTN credentials are working perfectly",
        });
        setCredentialsStatus('saved');
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error: any) {
      toast({
        title: "❌ Connection Failed",
        description: error.message || "Unable to connect. Please check your credentials.",
        variant: "destructive",
      });
      setCredentialsStatus('saved');
    }
  };

  const handleQuickITCReconciliation = async () => {
    setItcStatus('running');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      let responseData: any = null;
      let responseError: any = null;
      
      try {
        const result = await supabase.functions.invoke('reconcile-itc', {
          body: {
            period: new Date().toISOString().slice(0, 7), // Current month
            auto_download_form2a: true,
          },
        });
        responseData = result.data;
        responseError = result.error;
      } catch (invokeError: any) {
        // If invoke throws, it might have response data
        console.error('Invoke exception:', invokeError);
        responseError = invokeError;
        // Try to extract response body if available
        if (invokeError.response) {
          try {
            responseData = await invokeError.response.json();
          } catch (_) {
            // Ignore JSON parse errors
          }
        }
      }
      
      const { data, error } = { data: responseData, error: responseError };

      // Check if data has error field (functions often return error in data even with non-2xx)
      if (data?.error) {
        const errorMsg = data.error;
        // Check for common issues
        if (errorMsg.includes('No purchase orders found')) {
          throw new Error('No purchase orders found for the selected period. Add purchase orders first.');
        }
        if (errorMsg.includes('Premium plan') || errorMsg.includes('premium')) {
          throw new Error('Premium plan required. Please upgrade to Premium to use ITC Reconciliation.');
        }
        if (errorMsg.includes('table') && errorMsg.includes('does not exist')) {
          throw new Error('Database tables missing. Please run migrations: npx supabase db push');
        }
        throw new Error(errorMsg);
      }

      if (error) {
        console.error('ITC Reconciliation error details:', { error, data, status: error.status });
        
        // Check if function is not deployed
        const errorMsg = error.message || '';
        if (errorMsg.includes('not found') || errorMsg.includes('404') || errorMsg.includes('Function not found')) {
          throw new Error('Edge function not deployed. Please deploy: npx supabase functions deploy reconcile-itc');
        }
        if (errorMsg.includes('Failed to send') || errorMsg.includes('fetch')) {
          throw new Error('Edge function not accessible. Please check if it\'s deployed and try again.');
        }
        
        // Handle non-2xx status codes - try to extract actual error from response
        if (errorMsg.includes('non-2xx') || error.status) {
          // Try to get error from data first (sometimes Supabase puts error in data)
          let actualError = data?.error || error.context?.message || error.message || 'Unknown error';
          
          // Common errors from the reconcile-itc function
          if (error.status === 403) {
            actualError = 'Premium plan required. Please upgrade to Premium to use ITC Reconciliation.';
          } else if (error.status === 404) {
            actualError = 'No purchase orders found for the selected period. Add purchase orders first.';
          } else if (error.status === 500) {
            actualError = 'Server error. Possible causes: Missing database tables (itc_reconciliation, purchase_orders) or missing RPC function (decrypt_gstn_password). Check Edge Functions logs.';
          }
          
          throw new Error(`${actualError} (Status: ${error.status || 'unknown'})`);
        }
        
        throw new Error(errorMsg || 'Reconciliation failed');
      }

      if (data?.success) {
        toast({
          title: "✅ Reconciliation Complete!",
          description: `Matched ${data.matched_count || 0} invoices. Found ${data.mismatch_count || 0} mismatches.`,
        });
        setItcStatus('completed');
        await loadStats();
      } else {
        // If no success but also no error, might be a different response format
        throw new Error(data?.error || data?.message || 'Reconciliation failed - check logs');
      }
    } catch (error: any) {
      console.error('ITC Reconciliation error:', error);
      const errorMessage = error.message || "Unable to reconcile ITC. Please try again.";
      
      // Show helpful message if function not deployed
      if (errorMessage.includes('not deployed') || errorMessage.includes('not accessible')) {
        toast({
          title: "⚠️ Edge Function Not Deployed",
          description: `The reconcile-itc function needs to be deployed. Run: npx supabase functions deploy reconcile-itc`,
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: "❌ Reconciliation Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
      setItcStatus('idle');
    }
  };

  const handleTestHSN = async () => {
    setHsnStatus('suggesting');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('suggest-hsn', {
        body: {
          product_description: 'Mobile Phone',
          category: 'Electronics',
        },
      });

      if (error) {
        // Check if function is not deployed
        const errorMsg = error.message || '';
        if (errorMsg.includes('not found') || errorMsg.includes('404') || errorMsg.includes('Function not found')) {
          throw new Error('Edge function not deployed. Please deploy: npx supabase functions deploy suggest-hsn');
        }
        if (errorMsg.includes('Failed to send') || errorMsg.includes('fetch')) {
          throw new Error('Edge function not accessible. Please check if it\'s deployed and try again.');
        }
        throw new Error(errorMsg || 'HSN suggestion failed');
      }

      if (data?.success) {
        toast({
          title: "✅ HSN Suggestion Works!",
          description: `Suggested HSN: ${data.suggested_hsn} (${((data.confidence_score || 0) * 100).toFixed(0)}% confidence)`,
        });
        setHsnStatus('idle');
      } else {
        throw new Error(data?.error || 'HSN suggestion failed');
      }
    } catch (error: any) {
      console.error('HSN suggestion error:', error);
      const errorMessage = error.message || "Unable to get HSN suggestion. Please check your plan.";
      
      // Show helpful message if function not deployed
      if (errorMessage.includes('not deployed') || errorMessage.includes('not accessible')) {
        toast({
          title: "⚠️ Edge Function Not Deployed",
          description: `The suggest-hsn function needs to be deployed. Run: npx supabase functions deploy suggest-hsn`,
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: "❌ HSN Test Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
      setHsnStatus('idle');
    }
  };

  if (!isPremium) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background p-4">
          <BackToDashboard />
          <PremiumGuard featureName="GST Dashboard">
            <div />
          </PremiumGuard>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <BackToDashboard />
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Shield className="h-8 w-8 text-primary" />
                GST Compliance Center
              </h1>
              <p className="text-muted-foreground">
                Manage all your GST features in one place - Simple, Fast, Secure
              </p>
            </div>
            <Button
              onClick={() => navigate('/settings/e-invoice')}
              variant="outline"
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Setup
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Invoices</p>
                    <p className="text-2xl font-bold">{stats.totalInvoices}</p>
                  </div>
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Reconciled</p>
                    <p className="text-2xl font-bold text-green-600">{stats.reconciledInvoices}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Mismatches</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.mismatches}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">HSN Codes</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.hsnSuggestions}</p>
                  </div>
                  <Sparkles className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="quick-test" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quick-test">🚀 Quick Test</TabsTrigger>
              <TabsTrigger value="itc">🔄 ITC Reconciliation</TabsTrigger>
              <TabsTrigger value="hsn">🎯 HSN Suggestions</TabsTrigger>
            </TabsList>

            {/* Quick Test Tab */}
            <TabsContent value="quick-test" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    One-Click Feature Tests
                  </CardTitle>
                  <CardDescription>
                    Test all GST features instantly to make sure everything is working
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Credentials Test */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        credentialsStatus === 'saved' ? 'bg-green-100 dark:bg-green-900/20' :
                        credentialsStatus === 'testing' ? 'bg-blue-100 dark:bg-blue-900/20' :
                        'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        <Shield className={`h-5 w-5 ${
                          credentialsStatus === 'saved' ? 'text-green-600' :
                          credentialsStatus === 'testing' ? 'text-blue-600' :
                          'text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-semibold">GSTN Credentials</p>
                        <p className="text-sm text-muted-foreground">
                          {credentialsStatus === 'saved' && '✅ Saved and ready'}
                          {credentialsStatus === 'testing' && '🔄 Testing connection...'}
                          {credentialsStatus === 'none' && '⚠️ Not configured yet'}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={credentialsStatus === 'none' ? () => navigate('/settings/e-invoice') : handleTestCredentials}
                      disabled={credentialsStatus === 'testing'}
                      variant={credentialsStatus === 'saved' ? 'default' : 'outline'}
                    >
                      {credentialsStatus === 'testing' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : credentialsStatus === 'saved' ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Test Connection
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Setup Now
                        </>
                      )}
                    </Button>
                  </div>

                  {/* ITC Reconciliation Test */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        itcStatus === 'completed' ? 'bg-green-100 dark:bg-green-900/20' :
                        itcStatus === 'running' ? 'bg-blue-100 dark:bg-blue-900/20' :
                        'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        <TrendingUp className={`h-5 w-5 ${
                          itcStatus === 'completed' ? 'text-green-600' :
                          itcStatus === 'running' ? 'text-blue-600' :
                          'text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-semibold">ITC Reconciliation</p>
                        <p className="text-sm text-muted-foreground">
                          {itcStatus === 'running' && '🔄 Reconciling invoices...'}
                          {itcStatus === 'completed' && '✅ Ready to reconcile'}
                          {itcStatus === 'idle' && 'Match invoices with Form 2A/2B'}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleQuickITCReconciliation}
                      disabled={itcStatus === 'running'}
                      variant={itcStatus === 'completed' ? 'default' : 'outline'}
                    >
                      {itcStatus === 'running' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Run Now
                        </>
                      )}
                    </Button>
                  </div>

                  {/* HSN Suggestions Test */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        hsnStatus === 'suggesting' ? 'bg-blue-100 dark:bg-blue-900/20' :
                        'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        <Sparkles className={`h-5 w-5 ${
                          hsnStatus === 'suggesting' ? 'text-blue-600' :
                          'text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-semibold">HSN Code Suggestions</p>
                        <p className="text-sm text-muted-foreground">
                          {hsnStatus === 'suggesting' ? '🔄 Getting suggestion...' : 'AI-powered HSN code lookup'}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleTestHSN}
                      disabled={hsnStatus === 'suggesting'}
                      variant="outline"
                    >
                      {hsnStatus === 'suggesting' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Test Now
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Status Alert */}
              {credentialsStatus === 'none' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Setup Required:</strong> Configure your GSTN credentials first to enable all features.
                    <Button
                      onClick={() => navigate('/settings/e-invoice')}
                      variant="link"
                      className="ml-2 p-0 h-auto"
                    >
                      Go to Setup →
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Deployment Status Card */}
              <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Edge Functions Deployment
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Some features require edge functions to be deployed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <p className="text-muted-foreground">
                    To fix "Failed to send a request to the Edge Function" errors, deploy the functions:
                  </p>
                  <div className="space-y-1 font-mono text-xs bg-muted p-2 rounded">
                    <p>npx supabase functions deploy reconcile-itc</p>
                    <p>npx supabase functions deploy suggest-hsn</p>
                    <p>npx supabase functions deploy auto-sync-einvoice-status</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Make sure Supabase CLI is installed: <code className="bg-muted px-1 rounded">npm install -g supabase</code>
                  </p>
                </CardContent>
              </Card>

              {/* Troubleshooting Card for Non-2xx Errors */}
              <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    Troubleshooting "Non-2xx Status Code" Error
                  </CardTitle>
                  <CardDescription className="text-xs">
                    If you see this error, check these common issues
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="space-y-2">
                    <p className="font-semibold text-red-700 dark:text-red-400">Common Causes:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li><strong>No purchase orders:</strong> Add purchase orders in <code className="bg-muted px-1 rounded">/purchases</code> page first</li>
                      <li><strong>Missing database tables:</strong> Run <code className="bg-muted px-1 rounded">npx supabase db push</code></li>
                      <li><strong>Missing RPC functions:</strong> Check if <code className="bg-muted px-1 rounded">decrypt_gstn_password</code> exists</li>
                      <li><strong>Not Premium plan:</strong> Upgrade to Premium in <code className="bg-muted px-1 rounded">/upgrade</code></li>
                    </ol>
                  </div>
                  <div className="p-2 bg-muted rounded text-xs">
                    <p className="font-semibold mb-1">Quick Check:</p>
                    <p>Go to Supabase Dashboard → Edge Functions → reconcile-itc → Logs</p>
                    <p className="mt-1">The logs will show the exact error message.</p>
                  </div>
                  <Button
                    onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                  >
                    Open Supabase Dashboard →
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ITC Reconciliation Tab */}
            <TabsContent value="itc" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>ITC Reconciliation</CardTitle>
                  <CardDescription>
                    Automatically match your purchase invoices with Form 2A/2B from GSTN
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm mb-2">
                      <strong>How it works:</strong>
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Download Form 2A/2B from GSTN automatically</li>
                      <li>Match with your purchase orders</li>
                      <li>Flag mismatches and missing invoices</li>
                      <li>Get alerts for reconciliation issues</li>
                    </ol>
                  </div>
                  <Button
                    onClick={handleQuickITCReconciliation}
                    disabled={itcStatus === 'running'}
                    className="w-full"
                    size="lg"
                  >
                    {itcStatus === 'running' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Reconciling...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Start Reconciliation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* HSN Suggestions Tab */}
            <TabsContent value="hsn" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>HSN Code Suggestions</CardTitle>
                  <CardDescription>
                    AI-powered HSN code lookup - Save time and reduce errors
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm mb-2">
                      <strong>Features:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>AI suggests HSN codes based on product description</li>
                      <li>Learns from your confirmations</li>
                      <li>Shows confidence scores</li>
                      <li>Works automatically in invoice forms</li>
                    </ul>
                  </div>
                  <Button
                    onClick={handleTestHSN}
                    disabled={hsnStatus === 'suggesting'}
                    className="w-full"
                    size="lg"
                  >
                    {hsnStatus === 'suggesting' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Getting Suggestion...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Test HSN Suggestion
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageTransition>
  );
}

