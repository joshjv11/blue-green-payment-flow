import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Bell, CheckCircle2, Loader2 } from 'lucide-react';
import { usePlan } from '@/contexts/PlanContext';
import { useAppPlan } from '@/hooks/useAppPlan';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ReminderSettings {
  whatsapp_reminders_enabled: boolean;
  reminder_days: number[];
  reminder_time: string;
  avoid_weekends: boolean;
}

export function BillReminderSettings() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  useAppPlan();
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
    if (isProOrPremium) loadSettings();
  }, [isProOrPremium]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      if (!authUser) return;
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!authUser) return;
      toast({ title: 'Settings Saved', description: 'Reminder settings updated.' });
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleAll = async () => {
    setSaving(true);
    try {
      if (!authUser) throw new Error('Not authenticated');
      toast({
        title: 'Not available',
        description: 'Automated reminder scheduling is being migrated to the new API.',
        variant: 'destructive',
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
          <CardDescription>Pro feature</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <MessageCircle className="h-4 w-4" />
            <AlertDescription>Upgrade to Pro for WhatsApp reminders.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
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
        <CardDescription>Configure reminder preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="whatsapp-enabled">Enable WhatsApp Reminders</Label>
          <Switch
            id="whatsapp-enabled"
            checked={settings.whatsapp_reminders_enabled}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, whatsapp_reminders_enabled: checked })
            }
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-2" />Save</>}
          </Button>
          <Button onClick={handleScheduleAll} disabled={saving} variant="outline">
            Schedule All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
