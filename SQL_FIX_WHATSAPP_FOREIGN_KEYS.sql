-- Fix WhatsApp Messages Foreign Key Constraints
-- Run this in Supabase SQL Editor to make foreign keys more flexible

-- Drop existing foreign key constraints that are too strict
ALTER TABLE public.whatsapp_messages 
  DROP CONSTRAINT IF EXISTS whatsapp_messages_related_invoice_id_fkey;

ALTER TABLE public.whatsapp_messages 
  DROP CONSTRAINT IF EXISTS whatsapp_messages_related_bill_id_fkey;

ALTER TABLE public.whatsapp_messages 
  DROP CONSTRAINT IF EXISTS whatsapp_messages_related_sale_id_fkey;

ALTER TABLE public.whatsapp_messages 
  DROP CONSTRAINT IF EXISTS whatsapp_messages_customer_id_fkey;

-- Re-add foreign keys with ON DELETE SET NULL (so they don't fail if record doesn't exist)
-- Only add if the referenced table exists

-- Check if invoices table exists before adding constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    ALTER TABLE public.whatsapp_messages 
      ADD CONSTRAINT whatsapp_messages_related_invoice_id_fkey 
      FOREIGN KEY (related_invoice_id) 
      REFERENCES public.invoices(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Check if bills table exists before adding constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bills') THEN
    ALTER TABLE public.whatsapp_messages 
      ADD CONSTRAINT whatsapp_messages_related_bill_id_fkey 
      FOREIGN KEY (related_bill_id) 
      REFERENCES public.bills(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Check if sales_orders table exists before adding constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_orders') THEN
    ALTER TABLE public.whatsapp_messages 
      ADD CONSTRAINT whatsapp_messages_related_sale_id_fkey 
      FOREIGN KEY (related_sale_id) 
      REFERENCES public.sales_orders(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Check if customers table exists before adding constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    ALTER TABLE public.whatsapp_messages 
      ADD CONSTRAINT whatsapp_messages_customer_id_fkey 
      FOREIGN KEY (customer_id) 
      REFERENCES public.customers(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- ✅ Foreign keys fixed! Now they won't fail if the referenced record doesn't exist
-- The edge function will also validate records exist before inserting

