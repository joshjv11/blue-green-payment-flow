import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Bell, CheckCircle2, Loader2 } from 'lucide-react';
import { usePlan } from '@/contexts/PlanContext';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ReminderSettings {
  whatsapp_reminders_enabled: boolean;
  reminder_days: number[]; // [3, 1, 0] for 3 days, 1 day, and due date
  reminder_time: string; // "09:00" format
  avoid_weekends: boolean;
}

export function BillReminderSettings() {
  const { toast } = useToast();
  const planData = useSupabasePlan();
  const { isPro, isPremium } = usePlan();
  const isProOrPremium = isPro || isPremium;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReminderSettings>({
    whatsapp_reminders_enabled: true,
    reminder_days: [3, 1, 0],
    reminder_time: '09:00',
    avoid_weekends: true,
  });

  useEffect(() => {
    if (isProOrPremium) {
      loadSettings();
    }
  }, [isProOrPremium]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load from user preferences or default
      const { data: profile } = await supabase
        .from('profiles')
        .select('whatsapp_reminder_settings')
        .eq('id', user.id)
        .single();

      if (profile?.whatsapp_reminder_settings) {
        setSettings({
          ...settings,
          ...profile.whatsapp_reminder_settings,
        });
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Save to profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          whatsapp_reminder_settings: settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Settings Saved! ✅",
        description: "Your WhatsApp reminder settings have been updated",
      });
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleAll = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's phone number
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single();

      if (!profile?.phone) {
        toast({
          title: "Phone Number Required",
          description: "Please add your phone number in settings to enable WhatsApp reminders",
          variant: "destructive",
        });
        return;
      }

      // Get all unpaid bills
      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'unpaid');

      if (billsError) throw billsError;

      let scheduledCount = 0;
      for (const bill of bills || []) {
        const { data, error } = await supabase.functions.invoke('schedule-bill-reminders-enhanced', {
          body: {
            bill_id: bill.id,
            enable_whatsapp_reminders: true,
            user_phone_number: profile.phone,
          },
        });

        if (!error && data?.success) {
          scheduledCount += data.reminders?.length || 0;
        }
      }

      toast({
        title: "Reminders Scheduled! ✅",
        description: `Scheduled ${scheduledCount} WhatsApp reminders for your bills. Click the links when reminders are due!`,
      });
    } catch (error: any) {
      toast({
        title: "Scheduling Failed",
        description: error.message || "Failed to schedule reminders",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isProOrPremium) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            WhatsApp Bill Reminders
          </CardTitle>
          <CardDescription>Pro feature - Never miss a bill payment</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <MessageCircle className="h-4 w-4" />
            <AlertDescription>
              WhatsApp reminders are available in Pro plan. Upgrade to never miss a bill payment!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          WhatsApp Bill Reminders
        </CardTitle>
        <CardDescription>
          Get FREE WhatsApp reminders 3 days, 1 day, and on due date. Never miss a payment!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="whatsapp-enabled">Enable WhatsApp Reminders</Label>
            <p className="text-sm text-muted-foreground">
              Receive reminders via WhatsApp (FREE - no charges)
            </p>
          </div>
          <Switch
            id="whatsapp-enabled"
            checked={settings.whatsapp_reminders_enabled}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, whatsapp_reminders_enabled: checked })
            }
          />
        </div>

        {settings.whatsapp_reminders_enabled && (
          <>
            <div className="space-y-2">
              <Label>Reminder Schedule</Label>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.reminder_days.includes(3)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSettings({
                          ...settings,
                          reminder_days: [...settings.reminder_days.filter(d => d !== 3), 3].sort((a, b) => b - a),
                        });
                      } else {
                        setSettings({
                          ...settings,
                          reminder_days: settings.reminder_days.filter(d => d !== 3),
                        });
                      }
                    }}
                    className="rounded"
                  />
                  <Label className="font-normal">3 days before</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.reminder_days.includes(1)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSettings({
                          ...settings,
                          reminder_days: [...settings.reminder_days.filter(d => d !== 1), 1].sort((a, b) => b - a),
                        });
                      } else {
                        setSettings({
                          ...settings,
                          reminder_days: settings.reminder_days.filter(d => d !== 1),
                        });
                      }
                    }}
                    className="rounded"
                  />
                  <Label className="font-normal">1 day before</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.reminder_days.includes(0)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSettings({
                          ...settings,
                          reminder_days: [...settings.reminder_days.filter(d => d !== 0), 0].sort((a, b) => b - a),
                        });
                      } else {
                        setSettings({
                          ...settings,
                          reminder_days: settings.reminder_days.filter(d => d !== 0),
                        });
                      }
                    }}
                    className="rounded"
                  />
                  <Label className="font-normal">On due date</Label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="avoid-weekends">Avoid Weekends</Label>
                <p className="text-sm text-muted-foreground">
                  Send reminders on weekdays only
                </p>
              </div>
              <Switch
                id="avoid-weekends"
                checked={settings.avoid_weekends}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, avoid_weekends: checked })
                }
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
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
                    Save Settings
                  </>
                )}
              </Button>
              <Button
                onClick={handleScheduleAll}
                disabled={saving}
                variant="outline"
              >
                Schedule All Bills
              </Button>
            </div>

            <Alert>
              <MessageCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>How it works:</strong> We'll generate WhatsApp links for your reminders.
                Click the link to send the reminder to yourself. No API costs - completely FREE! 💰
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
}

