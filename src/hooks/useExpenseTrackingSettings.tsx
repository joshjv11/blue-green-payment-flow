import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface ExpenseTrackingSettings {
  id?: string;
  user_id?: string;
  
  // Budget Settings
  monthly_income: number;
  daily_budget: number;
  budget_reset_date: number;
  
  // SMS Auto-Import Settings
  sms_permission_granted: boolean;
  sms_auto_import_enabled: boolean;
  detected_banks: string[];
  
  // Notification Preferences
  morning_summary_enabled: boolean;
  morning_summary_time: string;
  mid_day_checkin_enabled: boolean;
  mid_day_checkin_time: string;
  over_budget_alert_enabled: boolean;
  end_of_day_report_enabled: boolean;
  end_of_day_report_time: string;
  unusual_spending_alert_enabled: boolean;
  recurring_bill_reminders_enabled: boolean;
  weekly_insights_enabled: boolean;
  
  // AI Coach Settings
  ai_coach_enabled: boolean;
  ai_coach_frequency: 'daily' | 'weekly' | 'monthly';
  ai_coach_style: 'strict' | 'balanced' | 'casual';
  ai_coach_focus_areas: string[];
  
  // Onboarding Status
  onboarding_completed: boolean;
  onboarding_step: 'sms_permission' | 'bank_detection' | 'income_setup' | 'daily_budget' | 'completed';
}

const DEFAULT_SETTINGS: ExpenseTrackingSettings = {
  monthly_income: 0,
  daily_budget: 0,
  budget_reset_date: 1,
  sms_permission_granted: false,
  sms_auto_import_enabled: false,
  detected_banks: [],
  morning_summary_enabled: true,
  morning_summary_time: '08:00:00',
  mid_day_checkin_enabled: true,
  mid_day_checkin_time: '14:00:00',
  over_budget_alert_enabled: true,
  end_of_day_report_enabled: true,
  end_of_day_report_time: '22:00:00',
  unusual_spending_alert_enabled: true,
  recurring_bill_reminders_enabled: true,
  weekly_insights_enabled: false,
  ai_coach_enabled: true,
  ai_coach_frequency: 'daily',
  ai_coach_style: 'balanced',
  ai_coach_focus_areas: [],
  onboarding_completed: false,
  onboarding_step: 'sms_permission',
};

export function useExpenseTrackingSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ExpenseTrackingSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSettings(DEFAULT_SETTINGS);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('expense_tracking_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // If table doesn't exist, silently use defaults
      if (error) {
        // Check if it's a "table doesn't exist" error
        if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
          console.warn('Expense tracking settings table not found. Using defaults. Please run the migration.');
          setSettings(DEFAULT_SETTINGS);
          setLoading(false);
          return;
        }
        throw error;
      }

      if (data) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data,
          monthly_income: parseFloat(data.monthly_income || 0),
          daily_budget: parseFloat(data.daily_budget || 0),
          budget_reset_date: data.budget_reset_date || 1,
          detected_banks: data.detected_banks || [],
          ai_coach_focus_areas: data.ai_coach_focus_areas || [],
        });
      } else {
        // Create default settings only if table exists
        try {
          const { data: newSettings, error: insertError } = await supabase
            .from('expense_tracking_settings')
            .insert({
              user_id: user.id,
              ...DEFAULT_SETTINGS,
            })
            .select()
            .single();

          if (insertError) {
            // If insert fails (table might not exist), just use defaults
            if (insertError.message?.includes('does not exist') || insertError.message?.includes('schema cache')) {
              console.warn('Expense tracking settings table not found. Using defaults.');
              setSettings(DEFAULT_SETTINGS);
              setLoading(false);
              return;
            }
            throw insertError;
          }
          setSettings({ ...DEFAULT_SETTINGS, ...newSettings });
        } catch (insertErr: any) {
          // If table doesn't exist, just use defaults
          if (insertErr.message?.includes('does not exist') || insertErr.message?.includes('schema cache')) {
            console.warn('Expense tracking settings table not found. Using defaults.');
            setSettings(DEFAULT_SETTINGS);
            setLoading(false);
            return;
          }
          throw insertErr;
        }
      }
    } catch (error: any) {
      // Only show error toast for unexpected errors, not missing table
      if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        console.warn('Expense tracking settings table not found. Using defaults.');
        setSettings(DEFAULT_SETTINGS);
      } else {
        console.error('Error fetching expense tracking settings:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load settings',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<ExpenseTrackingSettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Auto-calculate daily budget if monthly income is updated
      if (updates.monthly_income !== undefined) {
        updates.daily_budget = updates.monthly_income / 30;
      }

      const { data, error } = await supabase
        .from('expense_tracking_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        // If table doesn't exist, update local state only
        if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
          console.warn('Expense tracking settings table not found. Updating local state only.');
          setSettings((prev) => ({ ...prev, ...updates }));
          toast({
            title: 'Settings Updated (Local)',
            description: 'Settings saved locally. Please run database migration to persist.',
          });
          return;
        }
        throw error;
      }

      setSettings((prev) => ({ ...prev, ...data }));
      toast({
        title: 'Settings Updated',
        description: 'Your expense tracking settings have been saved',
      });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      // If table doesn't exist, update local state anyway
      if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        setSettings((prev) => ({ ...prev, ...updates }));
        toast({
          title: 'Settings Updated (Local)',
          description: 'Settings saved locally. Please run database migration to persist.',
        });
        return;
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to update settings',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings,
  };
}

