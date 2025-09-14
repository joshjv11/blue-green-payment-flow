import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Bell, Settings as SettingsIcon, Save } from 'lucide-react';

interface UserSettings {
  defaultReminderDays: number;
  notificationsEnabled: boolean;
  notificationPermission: string;
}

const SettingsPage = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useLocalStorage<UserSettings>('userSettings', {
    defaultReminderDays: 3,
    notificationsEnabled: false,
    notificationPermission: 'default'
  });

  const [tempSettings, setTempSettings] = useState(settings);

  useEffect(() => {
    setTempSettings(settings);
  }, [settings]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setTempSettings(prev => ({
          ...prev,
          notificationPermission: permission,
          notificationsEnabled: permission === 'granted' ? prev.notificationsEnabled : false
        }));
        
        if (permission === 'granted') {
          toast({
            title: "Notifications enabled",
            description: "You'll receive notifications for bills due soon.",
          });
        } else {
          toast({
            title: "Notifications denied",
            description: "Please enable notifications in your browser settings.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled && Notification.permission !== 'granted') {
      await requestNotificationPermission();
      return;
    }
    
    setTempSettings(prev => ({
      ...prev,
      notificationsEnabled: enabled
    }));
  };

  const saveSettings = () => {
    setSettings(tempSettings);
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const resetSettings = () => {
    const defaultSettings = {
      defaultReminderDays: 3,
      notificationsEnabled: false,
      notificationPermission: Notification.permission || 'default'
    };
    setTempSettings(defaultSettings);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Reminder Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Default Reminder Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="reminder-days">Default reminder time before due date</Label>
              <Select
                value={tempSettings.defaultReminderDays.toString()}
                onValueChange={(value) => setTempSettings(prev => ({
                  ...prev,
                  defaultReminderDays: parseInt(value)
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reminder time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day before</SelectItem>
                  <SelectItem value="3">3 days before</SelectItem>
                  <SelectItem value="5">5 days before</SelectItem>
                  <SelectItem value="7">7 days before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Browser Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Push notifications for bills due soon</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when bills are due today or in the next 2 days
                </p>
              </div>
              <Switch
                checked={tempSettings.notificationsEnabled}
                onCheckedChange={handleNotificationToggle}
                disabled={Notification.permission === 'denied'}
              />
            </div>
            
            {Notification.permission === 'denied' && (
              <div className="text-sm text-destructive">
                Notifications are blocked. Please enable them in your browser settings to use this feature.
              </div>
            )}
            
            {Notification.permission === 'default' && (
              <div className="text-sm text-muted-foreground">
                Click the toggle above to request notification permission.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button onClick={saveSettings} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
          <Button onClick={resetSettings} variant="outline">
            Reset to Default
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;