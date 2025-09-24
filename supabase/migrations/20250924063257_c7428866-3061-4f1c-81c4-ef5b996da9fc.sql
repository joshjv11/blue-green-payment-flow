-- Fix the function to have proper search path
CREATE OR REPLACE FUNCTION public.add_sample_data_for_user(target_user_id UUID)
RETURNS void AS $$
DECLARE
  customer1_id UUID;
  customer2_id UUID;
BEGIN
  -- Insert sample customers
  INSERT INTO public.customers (name, email, phone, user_id) 
  VALUES 
    ('Acme Corporation', 'billing@acme.com', '+91-9876543210', target_user_id),
    ('Tech Solutions Ltd', 'accounts@techsolutions.com', '+91-8765432109', target_user_id)
  RETURNING id INTO customer1_id;
  
  -- Get the second customer ID
  SELECT id INTO customer2_id FROM public.customers 
  WHERE email = 'accounts@techsolutions.com' AND user_id = target_user_id;
  
  -- Insert sample invoices
  INSERT INTO public.invoices (customer_id, user_id, amount, status, due_date, invoice_number, description)
  VALUES 
    (customer1_id, target_user_id, 25000.00, 'pending', CURRENT_DATE + INTERVAL '30 days', 'INV-001', 'Website development services'),
    (customer1_id, target_user_id, 15000.00, 'paid', CURRENT_DATE - INTERVAL '10 days', 'INV-002', 'Logo design and branding'),
    (customer2_id, target_user_id, 45000.00, 'overdue', CURRENT_DATE - INTERVAL '5 days', 'INV-003', 'Mobile app development');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;