import { useState, useEffect } from 'react';

export interface ExpenseTrackingSettings {
  monthly_income: number;
  daily_budget: number;
  budget_reset_date: number;
  sms_permission_granted: boolean;
  sms_auto_import_enabled: boolean;
  detected_banks: string[];
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
  ai_coach_enabled: boolean;
  ai_coach_frequency: 'daily' | 'weekly' | 'monthly';
  ai_coach_style: 'strict' | 'balanced' | 'casual';
  ai_coach_focus_areas: string[];
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

/**
 * Expense tracking settings hook - DISABLED
 * Requires expense_tracking_settings table
 */
export function useExpenseTrackingSettings() {
  const [settings] = useState<ExpenseTrackingSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('⚠️ Expense tracking settings disabled - requires database migration');
    setLoading(false);
  }, []);

  const updateSettings = async (_updates: Partial<ExpenseTrackingSettings>) => {
    console.log('⚠️ Expense tracking settings disabled - requires database migration');
  };

  return {
    settings,
    loading,
    updateSettings,
    refetch: () => Promise.resolve(),
  };
}
