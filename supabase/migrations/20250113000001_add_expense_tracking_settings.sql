-- Create user expense tracking settings table
CREATE TABLE IF NOT EXISTS public.expense_tracking_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Budget Settings
  monthly_income NUMERIC DEFAULT 0,
  daily_budget NUMERIC DEFAULT 0, -- Auto-calculated: monthly_income / 30
  budget_reset_date INTEGER DEFAULT 1, -- Day of month (1-31) when budget resets
  
  -- SMS Auto-Import Settings
  sms_permission_granted BOOLEAN DEFAULT false,
  sms_auto_import_enabled BOOLEAN DEFAULT false,
  detected_banks TEXT[], -- Array of bank names detected from SMS
  
  -- Notification Preferences
  morning_summary_enabled BOOLEAN DEFAULT true,
  morning_summary_time TIME DEFAULT '08:00:00',
  mid_day_checkin_enabled BOOLEAN DEFAULT true,
  mid_day_checkin_time TIME DEFAULT '14:00:00',
  over_budget_alert_enabled BOOLEAN DEFAULT true,
  end_of_day_report_enabled BOOLEAN DEFAULT true,
  end_of_day_report_time TIME DEFAULT '22:00:00',
  unusual_spending_alert_enabled BOOLEAN DEFAULT true,
  recurring_bill_reminders_enabled BOOLEAN DEFAULT true,
  weekly_insights_enabled BOOLEAN DEFAULT false,
  
  -- AI Coach Settings
  ai_coach_enabled BOOLEAN DEFAULT true,
  ai_coach_frequency TEXT DEFAULT 'daily' CHECK (ai_coach_frequency IN ('daily', 'weekly', 'monthly')),
  ai_coach_style TEXT DEFAULT 'balanced' CHECK (ai_coach_style IN ('strict', 'balanced', 'casual')),
  ai_coach_focus_areas TEXT[], -- Array like ['saving_more', 'reducing_debt', 'food_optimization']
  
  -- Onboarding Status
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step TEXT DEFAULT 'sms_permission', -- sms_permission, bank_detection, income_setup, daily_budget, completed
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create expense categories customization table
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  category_icon TEXT DEFAULT '💰', -- Emoji or icon identifier
  monthly_budget NUMERIC DEFAULT 0, -- Optional monthly budget for this category
  auto_detect_keywords TEXT[], -- Keywords for auto-categorization
  is_default BOOLEAN DEFAULT false, -- System default categories
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_name)
);

-- Create expense transaction metadata table (for UPI tracking)
CREATE TABLE IF NOT EXISTS public.expense_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- UPI Transaction Details
  transaction_type TEXT CHECK (transaction_type IN ('upi', 'cash', 'card', 'other')),
  upi_id TEXT, -- Merchant UPI ID
  payment_app TEXT, -- PhonePe, GooglePay, Paytm, etc.
  bank_name TEXT,
  transaction_id TEXT, -- Original transaction ID from SMS/bank
  sms_source TEXT, -- Original SMS content (anonymized)
  
  -- Auto-categorization metadata
  auto_categorized BOOLEAN DEFAULT false,
  confidence_score NUMERIC DEFAULT 0, -- 0-100, how confident the AI was
  user_corrected BOOLEAN DEFAULT false, -- User manually corrected category
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expense_tracking_settings_user_id ON public.expense_tracking_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON public.expense_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON public.expense_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_expense_id ON public.expense_transactions(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_user_id ON public.expense_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_type ON public.expense_transactions(transaction_type);

-- Enable RLS
ALTER TABLE public.expense_tracking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_tracking_settings
CREATE POLICY "Users can view their own expense tracking settings"
  ON public.expense_tracking_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expense tracking settings"
  ON public.expense_tracking_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense tracking settings"
  ON public.expense_tracking_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for expense_categories
CREATE POLICY "Users can view their own expense categories"
  ON public.expense_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expense categories"
  ON public.expense_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense categories"
  ON public.expense_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense categories"
  ON public.expense_categories FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for expense_transactions
CREATE POLICY "Users can view their own expense transactions"
  ON public.expense_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expense transactions"
  ON public.expense_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense transactions"
  ON public.expense_transactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_expense_tracking_settings_updated_at
  BEFORE UPDATE ON public.expense_tracking_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_transactions_updated_at
  BEFORE UPDATE ON public.expense_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories for new users (via trigger)
CREATE OR REPLACE FUNCTION create_default_expense_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.expense_categories (user_id, category_name, category_icon, is_default, sort_order, auto_detect_keywords)
  VALUES
    (NEW.user_id, 'Food & Dining', '🍽️', true, 1, ARRAY['swiggy', 'zomato', 'uber eats', 'restaurant', 'cafe', 'hotel', 'dominos', 'mcdonald', 'kfc']),
    (NEW.user_id, 'Transport', '🚆', true, 2, ARRAY['uber', 'ola', 'metro', 'bus', 'train', 'auto', 'petrol', 'fuel']),
    (NEW.user_id, 'Groceries', '🛒', true, 3, ARRAY['bigbasket', 'dmart', 'kirana', 'supermarket', 'grocery']),
    (NEW.user_id, 'Bills & Utilities', '📱', true, 4, ARRAY['electricity', 'water', 'phone', 'internet', 'recharge', 'mobile']),
    (NEW.user_id, 'Entertainment', '🎬', true, 5, ARRAY['movie', 'netflix', 'spotify', 'subscription', 'cinema']),
    (NEW.user_id, 'Shopping', '👕', true, 6, ARRAY['amazon', 'flipkart', 'clothes', 'electronics', 'fashion']),
    (NEW.user_id, 'Healthcare', '💊', true, 7, ARRAY['hospital', 'pharmacy', 'clinic', 'medical', 'doctor']),
    (NEW.user_id, 'Rent & Housing', '🏠', true, 8, ARRAY['rent', 'housing', 'maintenance']),
    (NEW.user_id, 'Education', '📚', true, 9, ARRAY['fees', 'books', 'course', 'tuition']),
    (NEW.user_id, 'Other', '💰', true, 10, ARRAY[]::TEXT[])
  ON CONFLICT (user_id, category_name) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default categories when user settings are created
CREATE TRIGGER create_default_categories_on_settings_create
  AFTER INSERT ON public.expense_tracking_settings
  FOR EACH ROW
  EXECUTE FUNCTION create_default_expense_categories();

COMMENT ON TABLE public.expense_tracking_settings IS 'User settings for expense tracking: budgets, notifications, SMS import, AI coach';
COMMENT ON TABLE public.expense_categories IS 'Customizable expense categories with auto-detection keywords';
COMMENT ON TABLE public.expense_transactions IS 'Metadata for expense transactions including UPI details and AI categorization';

