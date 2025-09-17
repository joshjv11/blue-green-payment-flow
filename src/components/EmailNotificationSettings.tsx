import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Bell, Save, Loader2 } from 'lucide-react';

const EmailNotificationSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reminderEmail, setReminderEmail] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(true);
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
        .select('email, reminder_email, email_notifications_enabled')
        .eq('id', user?.id)
        .single();

      if (error) {
        console.error('Error fetching user settings:', error);
        return;
      }

      if (data) {
        setReminderEmail(data.reminder_email || data.email || '');
        setEmailEnabled(data.email_notifications_enabled !== false);
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

      // Validate email format if email is enabled
      if (emailEnabled && reminderEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(reminderEmail)) {
          toast({
            title: "Invalid email address",
            description: "Please enter a valid email address",
            variant: "destructive",
          });
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          reminder_email: reminderEmail || null,
          email_notifications_enabled: emailEnabled && !!reminderEmail,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving settings:', error);
        throw error;
      }

      toast({
        title: "Settings saved!",
        description: emailEnabled ? 
          "Email notifications are now enabled for bill reminders." :
          "Email notifications have been disabled.",
      });

    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error saving settings",
        description: error.message || 'Failed to save email settings. Please try again.',
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testEmail = async () => {
    if (!reminderEmail || !emailEnabled) return;

    try {
      setSaving(true);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();
      
      const { error } = await supabase.functions.invoke('send-test-email', {
        body: { 
          email: reminderEmail,
          name: profile?.full_name || user?.email?.split('@')[0]
        }
      });

      if (error) throw error;

      toast({
        title: "Test email sent!",
        description: "Check your inbox for the test message.",
      });

    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        title: "Test email failed",
        description: error.message || "Failed to send test email. Please check your email address.",
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
          <Mail className="h-5 w-5 text-primary" />
          Email Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get email alerts for bills due today and tomorrow
              </p>
            </div>
            <Switch
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
              disabled={saving}
            />
          </div>

          {emailEnabled && (
            <div className="space-y-2">
              <Label htmlFor="reminder-email">Email Address</Label>
              <Input
                id="reminder-email"
                type="email"
                placeholder="your@email.com"
                value={reminderEmail}
                onChange={(e) => setReminderEmail(e.target.value)}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Email address where you want to receive bill reminders
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

            {emailEnabled && reminderEmail && (
              <Button
                variant="outline"
                onClick={testEmail}
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
                    Test Email
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-medium text-blue-800 dark:text-blue-400">Email Notifications</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Receive reliable email alerts for bills due today and tomorrow. Email notifications are sent every day at 9 AM IST.
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  💡 Make sure to check your spam folder if you don't receive emails.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailNotificationSettings;