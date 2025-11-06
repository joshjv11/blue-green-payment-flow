import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePlan } from '@/contexts/PlanContext';
import { BackToDashboard } from '@/components/BackToDashboard';
import { FileText, Lock, CheckCircle2, AlertCircle, ExternalLink, Loader2, Shield, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageTransition } from '@/components/PageTransition';
import { PremiumGuard } from '@/components/PremiumGuard';

export default function EInvoiceSettings() {
  const { toast } = useToast();
  const { isPremium } = usePlan();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState({
    gstin: '',
    username: '',
    password: '',
    api_endpoint: 'https://einvoice.gst.gov.in',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [existingCredentials, setExistingCredentials] = useState<any>(null);

  useEffect(() => {
    if (isPremium) {
      fetchCredentials();
    }
  }, [isPremium]);

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('gstn_credentials')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setExistingCredentials(data);
        setCredentials({
          gstin: data.gstin || '',
          username: data.username || '',
          password: '', // Don't show existing password
          api_endpoint: data.api_endpoint || 'https://einvoice.gst.gov.in',
        });
      }
    } catch (error: any) {
      console.error('Error fetching credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!credentials.gstin || !credentials.username || !credentials.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate GSTIN format
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(credentials.gstin)) {
      toast({
        title: "Invalid GSTIN",
        description: "Please enter a valid 15-character GSTIN",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Encrypt password before storing using Postgres function
      const { data: enc, error: encErr } = await supabase.rpc('encrypt_gstn_password', {
        password: credentials.password,
        user_id: user.id,
      });

      if (encErr) {
        throw encErr;
      }

      const { error } = await supabase
        .from('gstn_credentials')
        .upsert({
          user_id: user.id,
          gstin: credentials.gstin.toUpperCase(),
          username: credentials.username,
          password_encrypted: enc as string,
          api_endpoint: credentials.api_endpoint,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,gstin',
        });

      if (error) throw error;

      toast({
        title: "Credentials Saved! ✅",
        description: "Your GSTN credentials have been saved successfully",
      });

      await fetchCredentials();
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save credentials",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!credentials.gstin || !credentials.username || !credentials.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields before testing",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Test connection by attempting authentication
      const response = await fetch(`${credentials.api_endpoint}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
      });

      if (response.ok) {
        toast({
          title: "Connection Successful! ✅",
          description: "Your GSTN credentials are valid and working",
        });
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message || "Unable to connect to GSTN portal. Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isPremium) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background p-4">
          <BackToDashboard />
          <PremiumGuard featureName="E-Invoicing Settings">
            <div />
          </PremiumGuard>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <BackToDashboard />
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <FileText className="h-8 w-8" />
                E-Invoicing Settings
              </h1>
              <p className="text-muted-foreground">
                Configure your GSTN credentials in 3 simple steps
              </p>
            </div>
            <Button
              onClick={() => navigate('/gst')}
              variant="outline"
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              GST Dashboard
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> E-invoicing is mandatory for businesses with turnover &gt;5Cr.
              Get your GSTN API credentials from{' '}
              <a 
                href="https://einvoice.gst.gov.in" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                e-invoice portal <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>GSTN API Credentials</CardTitle>
              <CardDescription>
                Enter your credentials from the GSTN e-invoice portal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {existingCredentials && (
                <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    Credentials configured for GSTIN: <strong>{existingCredentials.gstin}</strong>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN (15 characters) *</Label>
                <Input
                  id="gstin"
                  value={credentials.gstin}
                  onChange={(e) => setCredentials({ ...credentials, gstin: e.target.value.toUpperCase() })}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Format: 2-digit state code + 10-digit PAN + 1-digit entity + Z + 1-digit check digit
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">GSTN Username *</Label>
                <Input
                  id="username"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  placeholder="Your GSTN portal username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">GSTN Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    placeholder="Your GSTN portal password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Password is encrypted and stored securely
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_endpoint">API Endpoint</Label>
                <Input
                  id="api_endpoint"
                  value={credentials.api_endpoint}
                  onChange={(e) => setCredentials({ ...credentials, api_endpoint: e.target.value })}
                  placeholder="https://einvoice.gst.gov.in"
                />
                <p className="text-xs text-muted-foreground">
                  Default: https://einvoice.gst.gov.in (NIC e-invoice portal)
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleTestConnection}
                  disabled={loading || saving}
                  variant="outline"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading || saving}
                  className="flex-1"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Save Credentials
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to Get GSTN API Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  Visit the{' '}
                  <a 
                    href="https://einvoice.gst.gov.in" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    e-invoice portal <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Sign in with your GSTN credentials</li>
                <li>Navigate to <strong>API Registration</strong> section</li>
                <li>Select <strong>"Through ERP"</strong> option</li>
                <li>Create API-specific username and password</li>
                <li>Copy the credentials and paste them above</li>
              </ol>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> These are different from your regular GSTN portal login credentials.
                  You need to create separate API credentials for integration.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features Enabled</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Automatic IRN (Invoice Reference Number) generation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Direct upload to GST portal
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  One-click e-way bill generation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  QR code generation for B2C invoices
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Auto-update invoice status from GSTN portal
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Bulk e-invoice generation (100+ invoices/day)
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}

