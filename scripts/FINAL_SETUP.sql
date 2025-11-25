-- ========================================
-- FINAL SETUP SCRIPT FOR MIGRATION
-- ========================================
-- Run this entire script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fbzfddgqfqjuvpjzvhfi/sql/new
-- ========================================

-- 1. Create Reminders Table
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  remind_at timestamp with time zone not null,
  channel text default 'whatsapp',
  created_at timestamp with time zone default now()
);

alter table public.reminders enable row level security;
do $$ begin
  create policy "reminders_select_own"
    on public.reminders for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "reminders_modify_own"
    on public.reminders for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_reminders_user_id on public.reminders(user_id);
create index if not exists idx_reminders_bill_id on public.reminders(bill_id);

-- 2. Create Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  phone TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  tax_id_label TEXT,
  tax_id_value TEXT,
  country TEXT,
  state_or_province TEXT,
  city TEXT,
  postal_code TEXT,
  address TEXT,
  state TEXT,
  party_gstin TEXT,
  party_state TEXT,
  party_state_code TEXT,
  type TEXT
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
do $$ begin
  CREATE POLICY "customers_select_own" ON public.customers FOR SELECT USING (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  CREATE POLICY "customers_modify_own" ON public.customers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- 3. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  sku TEXT,
  purchase_price NUMERIC,
  selling_price NUMERIC,
  stock_qty INTEGER,
  reorder_level INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
do $$ begin
  CREATE POLICY "products_select_own" ON public.products FOR SELECT USING (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  CREATE POLICY "products_modify_own" ON public.products FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- 4. Create Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor TEXT,
  date TEXT,
  amount NUMERIC,
  gst NUMERIC,
  category TEXT,
  attachment_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
do $$ begin
  CREATE POLICY "expenses_select_own" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  CREATE POLICY "expenses_modify_own" ON public.expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
