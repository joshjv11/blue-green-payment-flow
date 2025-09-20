import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuth } from '@/hooks/useAuth';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Bell, Settings as SettingsIcon, Save, Mail, Download, Crown, Zap } from 'lucide-react';
import ExportImport from '@/components/ExportImport';
import { Navigation } from '@/components/Navigation';
import FreemiumLimitCard from '@/components/FreemiumLimitCard';
import UpgradeModal from '@/components/UpgradeModal';

import UserReminderSettings from '@/components/UserReminderSettings';
import ReminderDashboard from '@/components/ReminderDashboard';

interface UserSettings {
  defaultReminderDays: number;
  notificationsEnabled: boolean;
  notificationPermission: string;
  emailRemindersEnabled: boolean;
  reminderEmail: string;
}

interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  recurring: boolean;
  status: 'unpaid' | 'paid' | 'overdue';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const SettingsPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { plan, hasEmailReminders, aiQueriesUsed, aiQueriesLimit } = useSupabasePlan();
  const [localBills, setLocalBills] = useLocalStorage<Bill[]>(`bills_${user?.id}`, []);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [settings, setSettings] = useLocalStorage<UserSettings>('userSettings', {
    defaultReminderDays: 3,
    notificationsEnabled: false,
    notificationPermission: 'default',
    emailRemindersEnabled: false,
    reminderEmail: ''
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
      notificationPermission: Notification.permission || 'default',
      emailRemindersEnabled: false,
      reminderEmail: ''
    };
    setTempSettings(defaultSettings);
  };

  const handleImportBills = async (importedBills: Partial<Bill>[]) => {
    try {
      const billsToImport = importedBills.map(bill => ({
        ...bill,
        id: bill.id || crypto.randomUUID(),
        user_id: user!.id,
        created_at: bill.created_at || new Date().toISOString(),
        updated_at: bill.updated_at || new Date().toISOString(),
      })) as Bill[];

      // For localStorage, merge with existing bills (avoid duplicates)
      const existingIds = new Set(localBills.map(b => b.id));
      const newBills = billsToImport.filter(b => !existingIds.has(b.id));
      setLocalBills([...localBills, ...newBills]);

      toast({
        title: "Bills imported successfully!",
        description: `Added ${newBills.length} new bills to your account.`,
      });
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <SettingsIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Freemium Limit Card */}
        <FreemiumLimitCard
          type="ai"
          currentCount={aiQueriesUsed}
          onUpgrade={() => setShowUpgradeModal(true)}
        />

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

        {/* Email Reminder Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Email reminders for bills due soon</Label>
                <p className="text-sm text-muted-foreground">
                  Get email notifications for upcoming and overdue bills
                </p>
                {!hasEmailReminders && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span>Pro feature</span>
                  </div>
                )}
              </div>
              <Switch
                checked={hasEmailReminders && tempSettings.emailRemindersEnabled}
                onCheckedChange={(enabled) => {
                  if (!hasEmailReminders) {
                    setShowUpgradeModal(true);
                    return;
                  }
                  setTempSettings(prev => ({
                    ...prev,
                    emailRemindersEnabled: enabled
                  }));
                }}
                disabled={!hasEmailReminders}
              />
            </div>
            
            {hasEmailReminders && tempSettings.emailRemindersEnabled && (
              <div className="space-y-2">
                <Label htmlFor="reminder-email">Email address for reminders</Label>
                <Input
                  id="reminder-email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={tempSettings.reminderEmail}
                  onChange={(e) => setTempSettings(prev => ({
                    ...prev,
                    reminderEmail: e.target.value
                  }))}
                />
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-blue-800 dark:text-blue-200 font-medium">Pro Feature Active</p>
                      <p className="text-blue-700 dark:text-blue-300">
                        Real email reminders are enabled for your Pro account.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!hasEmailReminders && (
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Crown className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Unlock Email Reminders</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Never miss a bill payment with automated email notifications.
                    </p>
                    <Button 
                      size="sm" 
                      onClick={() => setShowUpgradeModal(true)}
                      className="h-8"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Upgrade to Pro
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Reminder Settings */}
        <UserReminderSettings />

        {/* Reminder Dashboard */}
        <ReminderDashboard />

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

        {/* Export/Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExportImport 
              bills={localBills} 
              onImportBills={handleImportBills}
              userId={user?.id || ''}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button onClick={saveSettings} className="flex-1 h-10">
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
          <Button onClick={resetSettings} variant="outline" className="h-10">
            Reset to Default
          </Button>
        </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentBillCount={localBills.length}
        aiQueriesUsed={aiQueriesUsed}
        aiQueriesLimit={aiQueriesLimit}
        trigger="general"
      />
    </div>
  );
};

export default SettingsPage;