-- Add processed column to payment_transactions table for tracking auto-upgrade status
ALTER TABLE public.payment_transactions 
ADD COLUMN processed boolean DEFAULT false;

-- Create index for better query performance on verification checks
CREATE INDEX idx_payment_transactions_status_processed 
ON public.payment_transactions(user_id, status, processed) 
WHERE status = 'verified' AND processed IS NOT true;