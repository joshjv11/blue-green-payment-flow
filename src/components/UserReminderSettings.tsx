import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bell, 
  Mail, 
  Calendar, 
  Clock, 
  TestTube,
  Loader2,
  CheckCircle,
  Settings,
  User
} from 'lucide-react';

interface UserSettings {
  defaultReminderDays: number;
  emailNotificationsEnabled: boolean;
  reminderEmail?: string;
  autoCalendarAdd: boolean;
}

const UserReminderSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings>({
    defaultReminderDays: 1,
    emailNotificationsEnabled: true,
    reminderEmail: '',
    autoCalendarAdd: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setSettings({
          defaultReminderDays: 1, // Default
          emailNotificationsEnabled: data.email_notifications_enabled ?? true,
          reminderEmail: data.reminder_email || '',
          autoCalendarAdd: false, // Default
        });
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load user settings",
        variant: "destructive",
      });
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const updateData = {
        email_notifications_enabled: settings.emailNotificationsEnabled,
        reminder_email: settings.reminderEmail || null,
      };

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: profile?.email || user.email,
          ...updateData,
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Your reminder preferences have been updated",
      });

      // Reload profile to get updated data
      await loadUserProfile();

    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const sendTestReminder = async () => {
    if (!user) return;

    setIsTesting(true);
    try {
      const testEmail = settings.reminderEmail || profile?.email || user.email;
      
      const { error } = await supabase.functions.invoke('send-comprehensive-test-email', {
        body: {
          email: testEmail,
          testType: 'reminder_test'
        }
      });

      if (error) throw error;

      toast({
        title: "Test Email Sent!",
        description: `Check your inbox at ${testEmail}`,
      });

    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const userEmail = profile?.email || user?.email || '';
  const reminderEmailAddress = settings.reminderEmail || userEmail;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Reminder Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure your bill reminder preferences
          </p>
        </div>
      </div>

      {/* User Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Primary Email</Label>
              <p className="font-medium">{userEmail}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Account Status</Label>
              <Badge variant="default" className="mt-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable/Disable Email Notifications */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <Label className="font-medium">Email Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications for upcoming bills
              </p>
            </div>
            <Switch
              checked={settings.emailNotificationsEnabled}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, emailNotificationsEnabled: checked })
              }
            />
          </div>

          {/* Custom Reminder Email */}
          {settings.emailNotificationsEnabled && (
            <div className="space-y-2">
              <Label htmlFor="reminderEmail">
                Custom Reminder Email (Optional)
              </Label>
              <Input
                id="reminderEmail"
                type="email"
                value={settings.reminderEmail}
                onChange={(e) => setSettings({ ...settings, reminderEmail: e.target.value })}
                placeholder={userEmail}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use your primary email ({userEmail})
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Default Reminder Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Default Reminder Timing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default reminder timing for new bills</Label>
            <Select 
              value={settings.defaultReminderDays.toString()} 
              onValueChange={(value) => setSettings({ ...settings, defaultReminderDays: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day before due date</SelectItem>
                <SelectItem value="3">3 days before due date</SelectItem>
                <SelectItem value="7">1 week before due date</SelectItem>
                <SelectItem value="14">2 weeks before due date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <Label className="font-medium">Auto-add to Calendar</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create calendar events for new bills
              </p>
            </div>
            <Switch
              checked={settings.autoCalendarAdd}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, autoCalendarAdd: checked })
              }
            />
          </div>
          
          <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            💡 <strong>Pro Tip:</strong> Use the Google Calendar and ICS download buttons next to each bill to add them to your calendar manually.
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Test & Save Actions */}
      <div className="space-y-4">
        {/* Test Reminder Button */}
        {settings.emailNotificationsEnabled && (
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-green-700 dark:text-green-300">
                    Test Reminder System
                  </h4>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Send a sample bill reminder to {reminderEmailAddress}
                  </p>
                </div>
                <Button
                  onClick={sendTestReminder}
                  disabled={isTesting}
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-950"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Send Test Email
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Settings Button */}
        <Button
          onClick={saveSettings}
          disabled={isSaving}
          className="w-full"
          size="lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving Settings...
            </>
          ) : (
            <>
              <Bell className="h-4 w-4 mr-2" />
              Save Reminder Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default UserReminderSettings;