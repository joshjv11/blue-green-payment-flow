-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  purchase_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sku)
);

-- Create inventory transactions table
CREATE TABLE public.inventory_txns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id UUID,
  txn_type TEXT NOT NULL CHECK (txn_type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  reference_type TEXT CHECK (reference_type IN ('sale', 'purchase', 'manual')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_txns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
CREATE POLICY "Users can view their own products"
  ON public.products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products"
  ON public.products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
  ON public.products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
  ON public.products FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for inventory_txns
CREATE POLICY "Users can view their product transactions"
  ON public.inventory_txns FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = inventory_txns.product_id 
    AND products.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert transactions for their products"
  ON public.inventory_txns FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = inventory_txns.product_id 
    AND products.user_id = auth.uid()
  ));

-- Add product_id to order_lines
ALTER TABLE public.order_lines ADD COLUMN product_id UUID REFERENCES public.products(id);

-- Function to update product stock
CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update stock based on transaction type
    IF NEW.txn_type = 'in' THEN
      UPDATE public.products 
      SET stock_qty = stock_qty + NEW.quantity,
          updated_at = now()
      WHERE id = NEW.product_id;
    ELSIF NEW.txn_type = 'out' THEN
      UPDATE public.products 
      SET stock_qty = stock_qty - NEW.quantity,
          updated_at = now()
      WHERE id = NEW.product_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update stock on inventory transaction
CREATE TRIGGER update_stock_on_txn
  AFTER INSERT ON public.inventory_txns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_stock();

-- Add updated_at trigger for products
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();