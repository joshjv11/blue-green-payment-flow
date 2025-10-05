-- Step 1: Ensure profiles table has a primary key
-- (This should already exist, but making it explicit)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

-- Step 2: Drop the old FK if it exists (might have incorrect target)
ALTER TABLE public.bills
  DROP CONSTRAINT IF EXISTS bills_user_id_fkey;

-- Step 3: Add the correct FK from bills.user_id → profiles.id
ALTER TABLE public.bills
  ADD CONSTRAINT bills_user_id_fkey
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON public.bills(user_id);

-- Step 5: Ensure bill_reminders also has proper FK to profiles
ALTER TABLE public.bill_reminders
  DROP CONSTRAINT IF EXISTS bill_reminders_user_id_fkey;

ALTER TABLE public.bill_reminders
  ADD CONSTRAINT bill_reminders_user_id_fkey
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bill_reminders_user_id ON public.bill_reminders(user_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';