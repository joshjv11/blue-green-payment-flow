-- Create sales orders table
CREATE TABLE public.sales_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid', -- 'paid', 'unpaid', 'partial'
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, invoice_number)
);

-- Create purchase orders table
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, invoice_number)
);

-- Create order type enum
CREATE TYPE order_type AS ENUM ('sale', 'purchase');

-- Create order lines table
CREATE TABLE public.order_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  order_type order_type NOT NULL,
  product_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales_orders
CREATE POLICY "Users can view their own sales orders"
  ON public.sales_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sales orders"
  ON public.sales_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales orders"
  ON public.sales_orders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales orders"
  ON public.sales_orders FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for purchase_orders
CREATE POLICY "Users can view their own purchase orders"
  ON public.purchase_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchase orders"
  ON public.purchase_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own purchase orders"
  ON public.purchase_orders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own purchase orders"
  ON public.purchase_orders FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for order_lines
CREATE POLICY "Users can view order lines for their orders"
  ON public.order_lines FOR SELECT
  USING (
    CASE order_type
      WHEN 'sale' THEN EXISTS (
        SELECT 1 FROM public.sales_orders 
        WHERE id = order_lines.order_id AND user_id = auth.uid()
      )
      WHEN 'purchase' THEN EXISTS (
        SELECT 1 FROM public.purchase_orders 
        WHERE id = order_lines.order_id AND user_id = auth.uid()
      )
    END
  );

CREATE POLICY "Users can insert order lines for their orders"
  ON public.order_lines FOR INSERT
  WITH CHECK (
    CASE order_type
      WHEN 'sale' THEN EXISTS (
        SELECT 1 FROM public.sales_orders 
        WHERE id = order_lines.order_id AND user_id = auth.uid()
      )
      WHEN 'purchase' THEN EXISTS (
        SELECT 1 FROM public.purchase_orders 
        WHERE id = order_lines.order_id AND user_id = auth.uid()
      )
    END
  );

CREATE POLICY "Users can update order lines for their orders"
  ON public.order_lines FOR UPDATE
  USING (
    CASE order_type
      WHEN 'sale' THEN EXISTS (
        SELECT 1 FROM public.sales_orders 
        WHERE id = order_lines.order_id AND user_id = auth.uid()
      )
      WHEN 'purchase' THEN EXISTS (
        SELECT 1 FROM public.purchase_orders 
        WHERE id = order_lines.order_id AND user_id = auth.uid()
      )
    END
  );

CREATE POLICY "Users can delete order lines for their orders"
  ON public.order_lines FOR DELETE
  USING (
    CASE order_type
      WHEN 'sale' THEN EXISTS (
        SELECT 1 FROM public.sales_orders 
        WHERE id = order_lines.order_id AND user_id = auth.uid()
      )
      WHEN 'purchase' THEN EXISTS (
        SELECT 1 FROM public.purchase_orders 
        WHERE id = order_lines.order_id AND user_id = auth.uid()
      )
    END
  );

-- Create indexes
CREATE INDEX idx_sales_orders_user_date ON public.sales_orders(user_id, transaction_date DESC);
CREATE INDEX idx_purchase_orders_user_date ON public.purchase_orders(user_id, transaction_date DESC);
CREATE INDEX idx_order_lines_order ON public.order_lines(order_id, order_type);

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_order_type TEXT, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_prefix TEXT;
BEGIN
  IF p_order_type = 'sale' THEN
    v_prefix := 'INV';
    SELECT COUNT(*) INTO v_count FROM public.sales_orders WHERE user_id = p_user_id;
  ELSE
    v_prefix := 'PO';
    SELECT COUNT(*) INTO v_count FROM public.purchase_orders WHERE user_id = p_user_id;
  END IF;
  
  RETURN v_prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD((v_count + 1)::TEXT, 4, '0');
END;
$$;

-- Trigger to auto-update timestamps
CREATE TRIGGER update_sales_orders_timestamp
BEFORE UPDATE ON public.sales_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_orders_timestamp
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_order_lines_timestamp
BEFORE UPDATE ON public.order_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();