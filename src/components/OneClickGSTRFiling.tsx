import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Loader2, FileText, Zap, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Locale, t } from '@/utils/locale';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OneClickGSTRFilingProps {
  filingType: 'gstr1' | 'gstr3b';
  onComplete?: () => void;
}

export function OneClickGSTRFiling({ filingType, onComplete }: OneClickGSTRFilingProps) {
  const { toast } = useToast();
  const [locale] = useLocalStorage<Locale>('invoiceflow_locale', 'en-IN');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'fetching' | 'generating' | 'uploading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);

  const handleOneClickFiling = async () => {
    try {
      setLoading(true);
      setStatus('fetching');

      // Get current month for filing period
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const filing_period = `${year}-${month}`;

      // Get user's GSTIN
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: credentials } = await supabase
        .from('gstn_credentials')
        .select('gstin')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!credentials?.gstin) {
        throw new Error(locale === 'hi-IN' 
          ? 'कृपया पहले GSTN क्रेडेंशियल सेटअप करें'
          : 'Please setup GSTN credentials first');
      }

      setStatus('generating');

      // Call the new one-click filing function (generates + uploads in one go)
      const functionName = filingType === 'gstr1' ? 'file-gstr1-with-gstn' : 'file-gstr3b-with-gstn';
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          filing_period,
          gstin: credentials.gstin,
          auto_upload: true, // Enable direct upload
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      setStatus('uploading');

      // Check if upload was successful
      if (data?.success && data?.uploaded) {
        setStatus('success');
        setResult({
          acknowledgement_number: data.acknowledgement_number,
          uploaded: true,
          message: data.message,
        });

        toast({
          title: locale === 'hi-IN' ? 'सफल!' : 'Success!',
          description: locale === 'hi-IN'
            ? `${filingType.toUpperCase()} सफलतापूर्वक GSTN पोर्टल पर फाइल किया गया! ARN: ${data.acknowledgement_number || 'N/A'}`
            : `${filingType.toUpperCase()} filed successfully on GSTN portal! ARN: ${data.acknowledgement_number || 'N/A'}`,
        });
      } else if (data?.success && !data?.uploaded) {
        // Generated but not uploaded (credentials issue or auto_upload=false)
        setStatus('success');
        setResult({
          uploaded: false,
          json_data: filingType === 'gstr1' ? data.gstr1_json : data.gstr3b_json,
          message: data.message,
        });

        toast({
          title: locale === 'hi-IN' ? 'जनरेट किया गया' : 'Generated',
          description: locale === 'hi-IN'
            ? 'JSON जनरेट किया गया, लेकिन अपलोड नहीं हुआ। कृपया मैन्युअल रूप से अपलोड करें।'
            : 'JSON generated but not uploaded. Please upload manually.',
          variant: 'default',
        });
      } else {
        throw new Error(data?.error || 'Failed to file GSTR');
      }

      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      setStatus('error');
      toast({
        title: locale === 'hi-IN' ? 'त्रुटि' : 'Error',
        description: error.message || (locale === 'hi-IN' ? 'फाइलिंग असफल' : 'Filing failed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusMessage = () => {
    if (status === 'fetching') {
      return locale === 'hi-IN' ? 'डेटा ला रहे हैं...' : 'Fetching data...';
    }
    if (status === 'generating') {
      return locale === 'hi-IN' ? 'JSON जनरेट कर रहे हैं...' : 'Generating JSON...';
    }
    if (status === 'uploading') {
      return locale === 'hi-IN' ? 'GSTN पोर्टल पर अपलोड कर रहे हैं...' : 'Uploading to GSTN portal...';
    }
    return '';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              {t('one_click_filing', locale)} - {filingType.toUpperCase()}
            </CardTitle>
            <CardDescription>
              {locale === 'hi-IN'
                ? 'स्वचालित रूप से डेटा लाएं, JSON जनरेट करें और GSTN पोर्टल पर अपलोड करें'
                : 'Auto-fetch data, generate JSON, and upload to GSTN portal'}
            </CardDescription>
          </div>
          {status === 'success' && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t('filed', locale)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'idle' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {locale === 'hi-IN' ? 'स्वचालित रूप से बिक्री/खरीद डेटा लाएं' : 'Auto-fetch sales/purchase data'}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {locale === 'hi-IN' ? 'हिंदी + अंग्रेजी में JSON जनरेट करें' : 'Generate JSON in Hindi + English'}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {locale === 'hi-IN' ? 'GSTN पोर्टल पर सीधे अपलोड करें' : 'Direct upload to GSTN portal'}
            </div>
            <Button
              onClick={handleOneClickFiling}
              disabled={loading}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {getStatusMessage()}
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  {t('one_click_filing', locale)}
                </>
              )}
            </Button>
          </div>
        )}

        {(status === 'fetching' || status === 'generating' || status === 'uploading') && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium">{getStatusMessage()}</span>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500"
                  style={{ 
                    width: status === 'fetching' ? '33%' : status === 'generating' ? '66%' : '100%' 
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {status === 'success' && result && (
          <div className="space-y-3">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {result.upload_success ? (
                  locale === 'hi-IN' ? (
                    <>
                      <strong>सफल!</strong> {filingType.toUpperCase()} GSTN पोर्टल पर अपलोड किया गया।
                      {result.ack_no && <div className="mt-1">ACK No: {result.ack_no}</div>}
                    </>
                  ) : (
                    <>
                      <strong>Success!</strong> {filingType.toUpperCase()} uploaded to GSTN portal.
                      {result.ack_no && <div className="mt-1">ACK No: {result.ack_no}</div>}
                    </>
                  )
                ) : (
                  locale === 'hi-IN' ? (
                    <>
                      <strong>JSON जनरेट किया गया</strong> लेकिन अपलोड नहीं हुआ। कृपया मैन्युअल रूप से अपलोड करें।
                    </>
                  ) : (
                    <>
                      <strong>JSON Generated</strong> but not uploaded. Please upload manually.
                    </>
                  )
                )}
              </AlertDescription>
            </Alert>

            {result.summary && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground">{locale === 'hi-IN' ? 'कुल बिक्री' : 'Total Sales'}</div>
                  <div className="font-semibold">₹{result.summary.total_sales_value?.toLocaleString('en-IN') || 0}</div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground">{locale === 'hi-IN' ? 'कुल कर' : 'Total Tax'}</div>
                  <div className="font-semibold">₹{result.summary.total_tax_amount?.toLocaleString('en-IN') || 0}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {status === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {locale === 'hi-IN' 
                ? 'फाइलिंग असफल। कृपया पुनः प्रयास करें।'
                : 'Filing failed. Please try again.'}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

