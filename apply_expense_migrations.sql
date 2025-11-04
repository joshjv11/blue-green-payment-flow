-- ============================================
-- Apply Expense Tracking Migrations
-- ============================================
-- Run this in Supabase SQL Editor or via CLI
-- This will create the expenses table and expense tracking settings

-- 1. Create expenses table (if not exists)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor TEXT NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  gst NUMERIC DEFAULT 0 CHECK (gst >= 0),
  category TEXT NOT NULL,
  attachment_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;

-- RLS Policies
CREATE POLICY "Users can view their own expenses"
  ON public.expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
  ON public.expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
  ON public.expenses FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for receipts (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipts
DROP POLICY IF EXISTS "Users can upload their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own receipts" ON storage.objects;

CREATE POLICY "Users can upload their own receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own receipts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create trigger for updated_at (ensure function exists first)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Create expense tracking settings table
CREATE TABLE IF NOT EXISTS public.expense_tracking_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Budget Settings
  monthly_income NUMERIC DEFAULT 0,
  daily_budget NUMERIC DEFAULT 0,
  budget_reset_date INTEGER DEFAULT 1,
  
  -- SMS Auto-Import Settings
  sms_permission_granted BOOLEAN DEFAULT false,
  sms_auto_import_enabled BOOLEAN DEFAULT false,
  detected_banks TEXT[],
  
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
  ai_coach_focus_areas TEXT[],
  
  -- Onboarding Status
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step TEXT DEFAULT 'sms_permission',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expense_tracking_settings_user_id ON public.expense_tracking_settings(user_id);

-- Enable RLS
ALTER TABLE public.expense_tracking_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own expense tracking settings" ON public.expense_tracking_settings;
DROP POLICY IF EXISTS "Users can insert their own expense tracking settings" ON public.expense_tracking_settings;
DROP POLICY IF EXISTS "Users can update their own expense tracking settings" ON public.expense_tracking_settings;

-- RLS Policies
CREATE POLICY "Users can view their own expense tracking settings"
  ON public.expense_tracking_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expense tracking settings"
  ON public.expense_tracking_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense tracking settings"
  ON public.expense_tracking_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger
DROP TRIGGER IF EXISTS update_expense_tracking_settings_updated_at ON public.expense_tracking_settings;
CREATE TRIGGER update_expense_tracking_settings_updated_at
  BEFORE UPDATE ON public.expense_tracking_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create expense categories table
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  category_icon TEXT DEFAULT '💰',
  monthly_budget NUMERIC DEFAULT 0,
  auto_detect_keywords TEXT[],
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON public.expense_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON public.expense_categories(is_active);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can insert their own expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can update their own expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can delete their own expense categories" ON public.expense_categories;

-- RLS Policies
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

-- Create trigger
DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON public.expense_categories;
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create expense transactions table (for UPI tracking metadata)
CREATE TABLE IF NOT EXISTS public.expense_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  transaction_type TEXT CHECK (transaction_type IN ('upi', 'cash', 'card', 'other')),
  upi_id TEXT,
  payment_app TEXT,
  bank_name TEXT,
  transaction_id TEXT,
  sms_source TEXT,
  
  auto_categorized BOOLEAN DEFAULT false,
  confidence_score NUMERIC DEFAULT 0,
  user_corrected BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expense_transactions_expense_id ON public.expense_transactions(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_user_id ON public.expense_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_type ON public.expense_transactions(transaction_type);

-- Enable RLS
ALTER TABLE public.expense_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own expense transactions" ON public.expense_transactions;
DROP POLICY IF EXISTS "Users can insert their own expense transactions" ON public.expense_transactions;
DROP POLICY IF EXISTS "Users can update their own expense transactions" ON public.expense_transactions;

-- RLS Policies
CREATE POLICY "Users can view their own expense transactions"
  ON public.expense_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expense transactions"
  ON public.expense_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense transactions"
  ON public.expense_transactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger
DROP TRIGGER IF EXISTS update_expense_transactions_updated_at ON public.expense_transactions;
CREATE TRIGGER update_expense_transactions_updated_at
  BEFORE UPDATE ON public.expense_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create default categories for new users
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
DROP TRIGGER IF EXISTS create_default_categories_on_settings_create ON public.expense_tracking_settings;
CREATE TRIGGER create_default_categories_on_settings_create
  AFTER INSERT ON public.expense_tracking_settings
  FOR EACH ROW
  EXECUTE FUNCTION create_default_expense_categories();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Expense tracking migrations applied successfully!';
  RAISE NOTICE 'Tables created: expenses, expense_tracking_settings, expense_categories, expense_transactions';
END $$;

