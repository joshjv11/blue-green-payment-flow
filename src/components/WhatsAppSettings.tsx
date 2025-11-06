import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageCircle, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePlan } from '@/contexts/PlanContext';

export function WhatsAppSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPro, isPremium } = usePlan();
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadWhatsAppSettings();
    }
  }, [user]);

  const loadWhatsAppSettings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('whatsapp_phone_number')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (data?.whatsapp_phone_number) {
        setWhatsappPhone(data.whatsapp_phone_number);
      }
    } catch (error: any) {
      console.error('Error loading WhatsApp settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load WhatsApp settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone.trim()) return false;
    
    // Remove all spaces and format
    const cleaned = phone.replace(/\s+/g, '');
    
    // Must start with + and have country code
    if (!cleaned.startsWith('+')) {
      return false;
    }
    
    // Should have at least 10 digits after country code
    const digits = cleaned.replace(/\D/g, '');
    return digits.length >= 10;
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove all spaces
    let cleaned = phone.replace(/\s+/g, '');
    
    // If it doesn't start with +, add +91 for India
    if (!cleaned.startsWith('+')) {
      // If starts with 0, remove it
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      cleaned = '+91' + cleaned;
    }
    
    return cleaned;
  };

  const handleSave = async () => {
    if (!user) return;

    const formattedPhone = formatPhoneNumber(whatsappPhone);
    
    if (!validatePhoneNumber(formattedPhone)) {
      setError('Please enter a valid phone number with country code (e.g., +91 9876543210)');
      return;
    }

    setError('');
    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          whatsapp_phone_number: formattedPhone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Settings Saved',
        description: 'Your WhatsApp number has been updated successfully',
      });

      setWhatsappPhone(formattedPhone);
    } catch (error: any) {
      console.error('Error saving WhatsApp settings:', error);
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save WhatsApp settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isPro && !isPremium) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <MessageCircle className="h-5 w-5 text-green-600" />
            WhatsApp Integration
          </CardTitle>
          <CardDescription>
            Configure your WhatsApp number to send messages directly to customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Pro Feature</p>
                <p className="text-xs text-muted-foreground mt-1">
                  WhatsApp integration is available for Pro and Premium users. Upgrade to send messages from your WhatsApp number.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <MessageCircle className="h-5 w-5 text-green-600" />
          WhatsApp Integration
        </CardTitle>
        <CardDescription>
          Configure your WhatsApp number to send messages directly to customers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="whatsapp-phone">Your WhatsApp Phone Number</Label>
          <Input
            id="whatsapp-phone"
            type="tel"
            placeholder="+91 9876543210"
            value={whatsappPhone}
            onChange={(e) => {
              setWhatsappPhone(e.target.value);
              setError('');
            }}
            disabled={loading || saving}
            className={error ? 'border-destructive' : ''}
          />
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          {!error && whatsappPhone && validatePhoneNumber(formatPhoneNumber(whatsappPhone)) && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Valid phone number format</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Include country code (e.g., +91 for India, +1 for USA). This number will be used to send WhatsApp messages to your customers.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={loading || saving || !whatsappPhone.trim()}
          className="w-full gap-2 bg-green-600 hover:bg-green-700"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save WhatsApp Number'}
        </Button>

        {whatsappPhone && (
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-3">
            <p className="text-xs text-green-800 dark:text-green-200">
              <strong>Note:</strong> Make sure this number is registered with WhatsApp and connected to your Twilio account if you're using Twilio for sending messages.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

