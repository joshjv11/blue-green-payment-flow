import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Smartphone, Bell, Save, Loader2 } from 'lucide-react';

const SMSNotificationSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserSettings();
    }
  }, [user]);

  const fetchUserSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('phone_number, sms_notifications_enabled')
        .eq('id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching user settings:', error);
        return;
      }

      if (data) {
        setPhoneNumber(data.phone_number || '');
        setSmsEnabled(data.sms_notifications_enabled || false);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Validate phone number format if SMS is enabled
      if (smsEnabled && phoneNumber) {
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phoneNumber)) {
          toast({
            title: "Invalid phone number",
            description: "Please enter a valid phone number with country code (e.g., +91xxxxxxxxxx)",
            variant: "destructive",
          });
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          phone_number: phoneNumber || null,
          sms_notifications_enabled: smsEnabled && !!phoneNumber,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving settings:', error);
        throw error;
      }

      toast({
        title: "Settings saved!",
        description: smsEnabled ? 
          "SMS notifications are now enabled for bill reminders." :
          "SMS notifications have been disabled.",
      });

    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error saving settings",
        description: error.message || 'Failed to save SMS settings. Please try again.',
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testSMS = async () => {
    if (!phoneNumber || !smsEnabled) return;

    try {
      setSaving(true);
      
      const { error } = await supabase.functions.invoke('send-sms-notifications', {
        body: { test: true, phoneNumber: phoneNumber }
      });

      if (error) throw error;

      toast({
        title: "Test SMS sent!",
        description: "Check your phone for the test message.",
      });

    } catch (error: any) {
      console.error('Error sending test SMS:', error);
      toast({
        title: "Test SMS failed",
        description: error.message || "Failed to send test SMS. Please check your phone number.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          SMS Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Enable SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get SMS alerts for bills due today and tomorrow
              </p>
            </div>
            <Switch
              checked={smsEnabled}
              onCheckedChange={setSmsEnabled}
              disabled={saving}
            />
          </div>

          {smsEnabled && (
            <div className="space-y-2">
              <Label htmlFor="phone-number">Phone Number</Label>
              <Input
                id="phone-number"
                type="tel"
                placeholder="+91xxxxxxxxxx"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +91 for India, +1 for US)
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>

            {smsEnabled && phoneNumber && (
              <Button
                variant="outline"
                onClick={testSMS}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Test SMS
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-medium text-blue-800 dark:text-blue-400">SMS Notifications</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Receive instant SMS alerts for bills due today and tomorrow. SMS notifications work alongside email reminders for better coverage.
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  💡 Standard SMS rates may apply from your carrier.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SMSNotificationSettings;