import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ExpenseTrackingSettings } from '@/hooks/useExpenseTrackingSettings';
import { Settings, Save, Loader2, Bell, DollarSign, Smartphone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExpenseSettingsProps {
  settings: ExpenseTrackingSettings;
  updateSettings: (updates: Partial<ExpenseTrackingSettings>) => Promise<void>;
}

export function ExpenseSettings({ settings, updateSettings }: ExpenseSettingsProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(localSettings);
      toast({
        title: 'Settings Saved',
        description: 'Your preferences have been updated',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Budget Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Budget Settings
          </CardTitle>
          <CardDescription>
            Configure your monthly income and daily budget
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="monthly-income">Monthly Take-Home Income (₹)</Label>
            <Input
              id="monthly-income"
              type="number"
              value={localSettings.monthly_income || ''}
              onChange={(e) => {
                const income = parseFloat(e.target.value) || 0;
                setLocalSettings({
                  ...localSettings,
                  monthly_income: income,
                  daily_budget: income / 30, // Auto-calculate
                });
              }}
              placeholder="30000"
            />
            <p className="text-xs text-muted-foreground">
              Your monthly take-home salary after deductions
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="daily-budget">Daily Budget (₹)</Label>
            <Input
              id="daily-budget"
              type="number"
              value={localSettings.daily_budget.toFixed(0) || ''}
              onChange={(e) => {
                setLocalSettings({
                  ...localSettings,
                  daily_budget: parseFloat(e.target.value) || 0,
                });
              }}
              placeholder="1000"
            />
            <p className="text-xs text-muted-foreground">
              Auto-calculated: ₹{localSettings.monthly_income / 30} per day (you can customize)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget-reset-date">Budget Reset Date</Label>
            <Select
              value={localSettings.budget_reset_date.toString()}
              onValueChange={(v) => {
                setLocalSettings({
                  ...localSettings,
                  budget_reset_date: parseInt(v),
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}st of month
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              When your monthly budget resets (usually matches your salary date)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose when and how you want to be notified
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Morning Summary</Label>
              <p className="text-sm text-muted-foreground">
                Daily budget reminder at 8 AM
              </p>
            </div>
            <Switch
              checked={localSettings.morning_summary_enabled}
              onCheckedChange={(checked) => {
                setLocalSettings({
                  ...localSettings,
                  morning_summary_enabled: checked,
                });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Mid-Day Check-In</Label>
              <p className="text-sm text-muted-foreground">
                Spending status update at 2 PM
              </p>
            </div>
            <Switch
              checked={localSettings.mid_day_checkin_enabled}
              onCheckedChange={(checked) => {
                setLocalSettings({
                  ...localSettings,
                  mid_day_checkin_enabled: checked,
                });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Over-Budget Alert</Label>
              <p className="text-sm text-muted-foreground">
                Alert when daily budget is exceeded
              </p>
            </div>
            <Switch
              checked={localSettings.over_budget_alert_enabled}
              onCheckedChange={(checked) => {
                setLocalSettings({
                  ...localSettings,
                  over_budget_alert_enabled: checked,
                });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>End-of-Day Report</Label>
              <p className="text-sm text-muted-foreground">
                Daily spending summary at 10 PM
              </p>
            </div>
            <Switch
              checked={localSettings.end_of_day_report_enabled}
              onCheckedChange={(checked) => {
                setLocalSettings({
                  ...localSettings,
                  end_of_day_report_enabled: checked,
                });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Unusual Spending Alert</Label>
              <p className="text-sm text-muted-foreground">
                Alert when spending pattern is unusual
              </p>
            </div>
            <Switch
              checked={localSettings.unusual_spending_alert_enabled}
              onCheckedChange={(checked) => {
                setLocalSettings({
                  ...localSettings,
                  unusual_spending_alert_enabled: checked,
                });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Weekly Insights</Label>
              <p className="text-sm text-muted-foreground">
                Weekly summary every Sunday
              </p>
            </div>
            <Switch
              checked={localSettings.weekly_insights_enabled}
              onCheckedChange={(checked) => {
                setLocalSettings({
                  ...localSettings,
                  weekly_insights_enabled: checked,
                });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* SMS Auto-Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            SMS Auto-Import
          </CardTitle>
          <CardDescription>
            Automatically import UPI transactions from SMS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              <strong>Coming Soon!</strong>
              <p className="mt-1 text-sm">
                Grant SMS permission to automatically track UPI payments. Your data never leaves your device.
              </p>
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>SMS Permission</Label>
              <p className="text-sm text-muted-foreground">
                Grant access to read UPI transaction SMS
              </p>
            </div>
            <Switch
              checked={localSettings.sms_permission_granted}
              disabled
              onCheckedChange={(checked) => {
                setLocalSettings({
                  ...localSettings,
                  sms_permission_granted: checked,
                });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Import Enabled</Label>
              <p className="text-sm text-muted-foreground">
                Automatically import transactions from SMS
              </p>
            </div>
            <Switch
              checked={localSettings.sms_auto_import_enabled}
              disabled={!localSettings.sms_permission_granted}
              onCheckedChange={(checked) => {
                setLocalSettings({
                  ...localSettings,
                  sms_auto_import_enabled: checked,
                });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Coach Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI Coach Settings
          </CardTitle>
          <CardDescription>
            Customize your AI financial coach
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>AI Coach Enabled</Label>
              <p className="text-sm text-muted-foreground">
                Receive AI-powered financial insights
              </p>
            </div>
            <Switch
              checked={localSettings.ai_coach_enabled}
              onCheckedChange={(checked) => {
                setLocalSettings({
                  ...localSettings,
                  ai_coach_enabled: checked,
                });
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Insight Frequency</Label>
            <Select
              value={localSettings.ai_coach_frequency}
              onValueChange={(v: 'daily' | 'weekly' | 'monthly') => {
                setLocalSettings({
                  ...localSettings,
                  ai_coach_frequency: v,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Coaching Style</Label>
            <Select
              value={localSettings.ai_coach_style}
              onValueChange={(v: 'strict' | 'balanced' | 'casual') => {
                setLocalSettings({
                  ...localSettings,
                  ai_coach_style: v,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strict">Strict - Direct & Firm</SelectItem>
                <SelectItem value="balanced">Balanced - Friendly & Helpful</SelectItem>
                <SelectItem value="casual">Casual - Relaxed & Encouraging</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save All Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

