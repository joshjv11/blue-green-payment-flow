import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuth } from '@/hooks/useAuth';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Bell, Settings as SettingsIcon, Save, Mail, Download, Crown, Zap, RotateCcw, Globe, ChevronRight } from 'lucide-react';
import ExportImport from '@/components/ExportImport';
import { Navigation } from '@/components/Navigation';
import FreemiumLimitCard from '@/components/FreemiumLimitCard';
import UpgradeModal from '@/components/UpgradeModal';
import { BusinessSettings } from '@/components/BusinessSettings';

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
  const navigate = useNavigate();
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
            title: "✅ Notifications Enabled!",
            description: "You'll receive notifications for bills due soon.",
            duration: 4000,
          });
        } else {
          toast({
            title: "❌ Notifications Denied",
            description: "Please enable notifications in your browser settings.",
            variant: "destructive",
            duration: 4000,
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
      title: "✅ Settings Saved Successfully!",
      description: "Your preferences have been updated.",
      duration: 4000,
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
        title: "✅ Bills Imported Successfully!",
        description: `Added ${newBills.length} new bills to your account.`,
        duration: 4000,
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
      
      <div className="container mx-auto px-3 py-4 md:px-4 md:py-6 max-w-2xl">
        {/* Sticky Header */}
        <div className="sticky top-[73px] md:top-[73px] z-40 bg-background/95 backdrop-blur-sm -mx-3 px-3 md:-mx-4 md:px-4 py-3 border-b mb-3 md:mb-4">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <h1 className="text-lg md:text-xl font-bold">Settings</h1>
          </div>
        </div>

        <div className="space-y-3 md:space-y-4">
        {/* Business Settings */}
        <BusinessSettings />

        {/* Tax Settings Link */}
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate('/settings/taxes')}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Tax Settings</h3>
                <p className="text-xs text-muted-foreground">Configure international tax regime</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        
        {/* Freemium Limit Card */}
        <FreemiumLimitCard
          type="ai"
          currentCount={aiQueriesUsed}
          onUpgrade={() => setShowUpgradeModal(true)}
        />

        {/* Notifications & Reminders Group */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Bell className="h-5 w-5" />
              Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Default Reminder Time */}
            <div className="space-y-3">
              <Label htmlFor="reminder-days" className="text-sm font-medium">
                Default reminder timing
              </Label>
              <Select
                value={tempSettings.defaultReminderDays.toString()}
                onValueChange={(value) => setTempSettings(prev => ({
                  ...prev,
                  defaultReminderDays: parseInt(value)
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day before</SelectItem>
                  <SelectItem value="3">3 days before</SelectItem>
                  <SelectItem value="5">5 days before</SelectItem>
                  <SelectItem value="7">7 days before</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="h-px bg-border" />

            {/* Email Reminders Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Email reminders</Label>
                    {!hasEmailReminders && (
                      <Crown className="h-3 w-3 text-yellow-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get email notifications for upcoming bills
                  </p>
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
                <div className="space-y-2 pt-2">
                  <Label htmlFor="reminder-email" className="text-xs">Email address</Label>
                  <Input
                    id="reminder-email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={tempSettings.reminderEmail}
                    onChange={(e) => setTempSettings(prev => ({
                      ...prev,
                      reminderEmail: e.target.value
                    }))}
                    className="h-9"
                  />
                </div>
              )}

              {!hasEmailReminders && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Crown className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">Unlock with Pro</p>
                      <p className="text-xs text-muted-foreground">
                        Never miss payments with email alerts
                      </p>
                      <Button 
                        size="sm" 
                        onClick={() => setShowUpgradeModal(true)}
                        className="h-7 mt-2 text-xs"
                      >
                        Upgrade
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="h-px bg-border" />

              {/* Browser Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-1 flex-1">
                  <Label className="text-sm font-medium">Browser notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Push notifications for bills due today
                  </p>
                  {Notification.permission === 'denied' && (
                    <p className="text-xs text-destructive">Blocked in browser</p>
                  )}
                </div>
                <Switch
                  checked={tempSettings.notificationsEnabled}
                  onCheckedChange={handleNotificationToggle}
                  disabled={Notification.permission === 'denied'}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Reminder Settings */}
        <UserReminderSettings />

        {/* Reminder Dashboard */}
        <ReminderDashboard />

        {/* Data Management Group */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Download className="h-5 w-5" />
              Data
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
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={saveSettings} 
            variant="gradient"
            className="flex-1"
            size="lg"
          >
            <Save className="h-4 w-4" />
            Save Settings
          </Button>
          <Button 
            onClick={resetSettings} 
            variant="outline" 
            size="lg"
            className="px-6"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
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