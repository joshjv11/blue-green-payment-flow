-- Consolidated Schema for Supabase (Quick Apply)
-- How to use:
-- 1) Open your NEW Supabase project's SQL Editor
-- 2) Paste this file and run
-- 3) If any statement fails due to existing objects, re-run after removing duplicates
-- Note: This file contains the minimum schema to bring the app up (profiles, bills, reminders, helper policies).

-- =========================
-- AUTH AND PROFILES
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company text,
  is_admin boolean default false,
  whatsapp_phone text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create or replace trigger set_profiles_updated_at
before update on public.profiles
for each row
execute procedure extensions.moddatetime(updated_at);

alter table public.profiles enable row level security;
do $$ begin
  create policy "profiles_select_own"
    on public.profiles for select
    using (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "profiles_update_own"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- =========================
-- BILLS
-- =========================
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount numeric(14,2) not null check (amount >= 0),
  due_date date,
  status text default 'pending',
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create or replace trigger set_bills_updated_at
before update on public.bills
for each row execute procedure extensions.moddatetime(updated_at);

alter table public.bills enable row level security;
do $$ begin
  create policy "bills_select_own"
    on public.bills for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "bills_modify_own"
    on public.bills for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- =========================
-- REMINDERS
-- =========================
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

-- =========================
-- EXTENSIONS (required by triggers)
-- =========================
create extension if not exists moddatetime with schema extensions;

-- =========================
-- OPTIONAL INDEXES
-- =========================
create index if not exists idx_bills_user_id on public.bills(user_id);
create index if not exists idx_bills_due_date on public.bills(due_date);
create index if not exists idx_reminders_user_id on public.reminders(user_id);
create index if not exists idx_reminders_bill_id on public.reminders(bill_id);

-- End of minimal schema


