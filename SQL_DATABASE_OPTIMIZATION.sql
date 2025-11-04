-- ============================================
-- Comprehensive Database Optimization Script
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CREATE/FIX UPDATE_TIMESTAMP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- 2. ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
-- Conditional created_at index
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);
  END IF;
END $$;

-- Bills table indexes
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON public.bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_team_id ON public.bills(team_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON public.bills(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_user_status ON public.bills(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bills_user_due_date ON public.bills(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_bills_category ON public.bills(category) WHERE category IS NOT NULL;

-- User plans indexes
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON public.user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_plan ON public.user_plans(plan);
CREATE INDEX IF NOT EXISTS idx_user_plans_is_active ON public.user_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_plans_expires_at ON public.user_plans(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_plans_active_expires ON public.user_plans(is_active, expires_at) WHERE is_active = true;

-- Sales orders indexes
CREATE INDEX IF NOT EXISTS idx_sales_orders_user_id ON public.sales_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_invoice_number ON public.sales_orders(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_orders_transaction_date ON public.sales_orders(transaction_date DESC);
-- Conditional indexes for payment_status (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sales_orders' AND column_name = 'payment_status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_sales_orders_payment_status ON public.sales_orders(payment_status);
    CREATE INDEX IF NOT EXISTS idx_sales_orders_user_status ON public.sales_orders(user_id, payment_status);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_sales_orders_user_date ON public.sales_orders(user_id, transaction_date DESC);

-- Purchase orders indexes
CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_id ON public.purchase_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_invoice_number ON public.purchase_orders(invoice_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_transaction_date ON public.purchase_orders(transaction_date DESC);
-- Conditional indexes for payment_status (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'payment_status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_payment_status ON public.purchase_orders(payment_status);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_status ON public.purchase_orders(user_id, payment_status);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_date ON public.purchase_orders(user_id, transaction_date DESC);

-- Order lines indexes
CREATE INDEX IF NOT EXISTS idx_order_lines_order_id ON public.order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_order_lines_order_type ON public.order_lines(order_type);
CREATE INDEX IF NOT EXISTS idx_order_lines_order_composite ON public.order_lines(order_id, order_type);

-- Customers indexes (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
    CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
    CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
    CREATE INDEX IF NOT EXISTS idx_customers_user_email ON public.customers(user_id, email);
  END IF;
END $$;

-- Invoices indexes (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
    CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON public.invoices(user_id, status);
  END IF;
END $$;

-- WhatsApp messages indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON public.whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_customer_id ON public.whatsapp_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON public.whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_broadcast_id ON public.whatsapp_messages(broadcast_id) WHERE broadcast_id IS NOT NULL;
-- Conditional created_at indexes for whatsapp_messages
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'whatsapp_messages' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_created ON public.whatsapp_messages(user_id, created_at DESC);
  END IF;
END $$;

-- WhatsApp broadcasts indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcasts_user_id ON public.whatsapp_broadcasts(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcasts_status ON public.whatsapp_broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcasts_user_status ON public.whatsapp_broadcasts(user_id, status);
-- Conditional created_at index for whatsapp_broadcasts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'whatsapp_broadcasts' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcasts_created_at ON public.whatsapp_broadcasts(created_at DESC);
  END IF;
END $$;

-- AI query log indexes (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_query_log') THEN
    CREATE INDEX IF NOT EXISTS idx_ai_query_log_user_id ON public.ai_query_log(user_id);
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_query_log' AND column_name = 'created_at') THEN
      CREATE INDEX IF NOT EXISTS idx_ai_query_log_created_at ON public.ai_query_log(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ai_query_log_user_created ON public.ai_query_log(user_id, created_at DESC);
    END IF;
  END IF;
END $$;

-- Teams indexes (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams') THEN
    CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON public.teams(owner_id);
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'created_at') THEN
      CREATE INDEX IF NOT EXISTS idx_teams_created_at ON public.teams(created_at DESC);
    END IF;
  END IF;
END $$;

-- Team members indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_user ON public.team_members(team_id, user_id);

-- Team invitations indexes
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON public.team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at ON public.team_invitations(expires_at) WHERE expires_at IS NOT NULL;

-- Payment transactions indexes (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_transactions') THEN
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON public.payment_transactions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_status ON public.payment_transactions(user_id, status);
  END IF;
END $$;

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_user_sku ON public.products(user_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_stock_qty ON public.products(stock_qty) WHERE stock_qty <= reorder_level;
-- Note: GIN index for full-text search removed - requires pg_trgm extension
-- CREATE INDEX IF NOT EXISTS idx_products_name_gin ON public.products USING gin(name gin_trgm_ops);

-- Inventory transactions indexes
CREATE INDEX IF NOT EXISTS idx_inventory_txns_product_id ON public.inventory_txns(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_txns_user_id ON public.inventory_txns(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_txns_order_id ON public.inventory_txns(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_txns_txn_type ON public.inventory_txns(txn_type);
-- Conditional created_at indexes for inventory_txns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_txns' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_inventory_txns_created_at ON public.inventory_txns(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_inventory_txns_product_created ON public.inventory_txns(product_id, created_at DESC);
  END IF;
END $$;

-- Expenses indexes (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
    -- Check which date column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'date') THEN
      CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
      CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses(user_id, date DESC);
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'expense_date') THEN
      CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC);
      CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses(user_id, expense_date DESC);
    END IF;
  END IF;
END $$;

-- ============================================
-- 3. ADD AUTO-UPDATE TRIGGERS FOR UPDATED_AT
-- ============================================

-- Profiles
DROP TRIGGER IF EXISTS update_profiles_timestamp ON public.profiles;
CREATE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Bills
DROP TRIGGER IF EXISTS update_bills_timestamp ON public.bills;
CREATE TRIGGER update_bills_timestamp
  BEFORE UPDATE ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- User plans
DROP TRIGGER IF EXISTS update_user_plans_timestamp ON public.user_plans;
CREATE TRIGGER update_user_plans_timestamp
  BEFORE UPDATE ON public.user_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Sales orders
DROP TRIGGER IF EXISTS update_sales_orders_timestamp ON public.sales_orders;
CREATE TRIGGER update_sales_orders_timestamp
  BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Purchase orders
DROP TRIGGER IF EXISTS update_purchase_orders_timestamp ON public.purchase_orders;
CREATE TRIGGER update_purchase_orders_timestamp
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Order lines
DROP TRIGGER IF EXISTS update_order_lines_timestamp ON public.order_lines;
CREATE TRIGGER update_order_lines_timestamp
  BEFORE UPDATE ON public.order_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Customers (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
    DROP TRIGGER IF EXISTS update_customers_timestamp ON public.customers;
    CREATE TRIGGER update_customers_timestamp
      BEFORE UPDATE ON public.customers
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Invoices (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    DROP TRIGGER IF EXISTS update_invoices_timestamp ON public.invoices;
    CREATE TRIGGER update_invoices_timestamp
      BEFORE UPDATE ON public.invoices
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- WhatsApp broadcasts
DROP TRIGGER IF EXISTS update_whatsapp_broadcasts_timestamp ON public.whatsapp_broadcasts;
CREATE TRIGGER update_whatsapp_broadcasts_timestamp
  BEFORE UPDATE ON public.whatsapp_broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Teams
DROP TRIGGER IF EXISTS update_teams_timestamp ON public.teams;
CREATE TRIGGER update_teams_timestamp
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Products
DROP TRIGGER IF EXISTS update_products_timestamp ON public.products;
CREATE TRIGGER update_products_timestamp
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Expenses (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
    DROP TRIGGER IF EXISTS update_expenses_timestamp ON public.expenses;
    CREATE TRIGGER update_expenses_timestamp
      BEFORE UPDATE ON public.expenses
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ============================================
-- 4. ADD FOREIGN KEY CONSTRAINTS (if missing)
-- ============================================

-- Customers foreign key
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'customers_user_id_fkey' 
      AND table_name = 'customers'
    ) THEN
      ALTER TABLE public.customers
      ADD CONSTRAINT customers_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Invoices foreign key
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'invoices_user_id_fkey' 
      AND table_name = 'invoices'
    ) THEN
      ALTER TABLE public.invoices
      ADD CONSTRAINT invoices_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Order lines foreign keys (check if they exist first)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_lines') THEN
    -- Check for sales order foreign key
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name LIKE '%order_lines%sales%' 
      AND table_name = 'order_lines'
    ) THEN
      -- Add check constraint or foreign key if needed
      -- Note: order_lines has a polymorphic relationship, so we handle it differently
      NULL;
    END IF;
  END IF;
END $$;

-- ============================================
-- 5. ADD CHECK CONSTRAINTS FOR DATA INTEGRITY
-- ============================================

-- Bills amount validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'bills_amount_positive' 
    AND table_name = 'bills'
  ) THEN
    ALTER TABLE public.bills
    ADD CONSTRAINT bills_amount_positive CHECK (amount >= 0);
  END IF;
END $$;

-- Sales orders amount validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sales_orders_amount_positive' 
    AND table_name = 'sales_orders'
  ) THEN
    ALTER TABLE public.sales_orders
    ADD CONSTRAINT sales_orders_amount_positive CHECK (total_amount >= 0 AND tax_amount >= 0 AND grand_total >= 0 AND amount_paid >= 0);
  END IF;
END $$;

-- Purchase orders amount validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'purchase_orders_amount_positive' 
    AND table_name = 'purchase_orders'
  ) THEN
    ALTER TABLE public.purchase_orders
    ADD CONSTRAINT purchase_orders_amount_positive CHECK (total_amount >= 0 AND tax_amount >= 0 AND grand_total >= 0 AND amount_paid >= 0);
  END IF;
END $$;

-- Order lines validation (conditional on column existence)
DO $$
DECLARE
  has_unit_price BOOLEAN;
  has_total_amount BOOLEAN;
  constraint_sql TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_lines') THEN
    -- Check which columns exist
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'order_lines' AND column_name = 'unit_price'
    ) INTO has_unit_price;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'order_lines' AND column_name = 'total_amount'
    ) INTO has_total_amount;
    
    -- Build constraint based on available columns
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'order_lines_quantities_positive' 
      AND table_name = 'order_lines'
    ) THEN
      constraint_sql := 'quantity > 0';
      
      IF has_unit_price THEN
        constraint_sql := constraint_sql || ' AND unit_price >= 0';
      END IF;
      
      IF has_total_amount THEN
        constraint_sql := constraint_sql || ' AND total_amount >= 0';
      END IF;
      
      EXECUTE format('ALTER TABLE public.order_lines ADD CONSTRAINT order_lines_quantities_positive CHECK (%s)', constraint_sql);
    END IF;
  END IF;
END $$;

-- Products validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_prices_positive' 
    AND table_name = 'products'
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT products_prices_positive CHECK (purchase_price >= 0 AND selling_price >= 0 AND stock_qty >= 0 AND reorder_level >= 0);
  END IF;
END $$;

-- Inventory transactions validation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_txns') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'inventory_txns_quantity_positive' 
      AND table_name = 'inventory_txns'
    ) THEN
      ALTER TABLE public.inventory_txns
      ADD CONSTRAINT inventory_txns_quantity_positive CHECK (quantity > 0);
    END IF;
  END IF;
END $$;

-- User plans AI queries validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_plans_ai_queries_positive' 
    AND table_name = 'user_plans'
  ) THEN
    ALTER TABLE public.user_plans
    ADD CONSTRAINT user_plans_ai_queries_positive CHECK (ai_queries_used >= 0 AND ai_queries_limit > 0);
  END IF;
END $$;

-- ============================================
-- 6. CREATE PERFORMANCE VIEWS
-- ============================================

-- User statistics view
CREATE OR REPLACE VIEW public.user_statistics AS
SELECT 
  p.id as user_id,
  p.email,
  p.full_name,
  COUNT(DISTINCT b.id) as bill_count,
  COUNT(DISTINCT CASE WHEN b.status = 'unpaid' THEN b.id END) as unpaid_bills,
  COUNT(DISTINCT so.id) as sales_order_count,
  COUNT(DISTINCT po.id) as purchase_order_count,
  COALESCE(up.plan, 'free') as current_plan,
  up.is_active as plan_active,
  up.expires_at as plan_expires_at
FROM public.profiles p
LEFT JOIN public.bills b ON b.user_id = p.id
LEFT JOIN public.sales_orders so ON so.user_id = p.id
LEFT JOIN public.purchase_orders po ON po.user_id = p.id
LEFT JOIN public.user_plans up ON up.user_id = p.id
GROUP BY p.id, p.email, p.full_name, up.plan, up.is_active, up.expires_at;

GRANT SELECT ON public.user_statistics TO authenticated;

-- Sales summary view (conditional on payment_status column)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'sales_orders' AND column_name = 'payment_status'
  ) THEN
    CREATE OR REPLACE VIEW public.sales_summary AS
    SELECT 
      user_id,
      DATE_TRUNC('month', transaction_date) as month,
      COUNT(*) as order_count,
      SUM(total_amount) as total_sales,
      SUM(tax_amount) as total_tax,
      SUM(grand_total) as total_revenue,
      SUM(CASE WHEN payment_status = 'paid' THEN grand_total ELSE 0 END) as paid_amount,
      SUM(CASE WHEN payment_status = 'unpaid' THEN grand_total ELSE 0 END) as unpaid_amount
    FROM public.sales_orders
    GROUP BY user_id, DATE_TRUNC('month', transaction_date);
  ELSE
    -- Fallback view without payment_status (uses amount_paid to determine status)
    CREATE OR REPLACE VIEW public.sales_summary AS
    SELECT 
      user_id,
      DATE_TRUNC('month', transaction_date) as month,
      COUNT(*) as order_count,
      SUM(total_amount) as total_sales,
      SUM(tax_amount) as total_tax,
      SUM(grand_total) as total_revenue,
      SUM(CASE WHEN amount_paid >= grand_total THEN grand_total ELSE 0 END) as paid_amount,
      SUM(CASE WHEN amount_paid < grand_total THEN grand_total ELSE 0 END) as unpaid_amount
    FROM public.sales_orders
    GROUP BY user_id, DATE_TRUNC('month', transaction_date);
  END IF;
  
  -- Grant permissions after view is created
  GRANT SELECT ON public.sales_summary TO authenticated;
END $$;

-- ============================================
-- 7. OPTIMIZE RLS POLICIES
-- ============================================

-- Create optimized RLS policy function for user access
CREATE OR REPLACE FUNCTION public.is_user_owner(resource_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid() = resource_user_id;
$$;

-- ============================================
-- 8. VACUUM AND ANALYZE
-- ============================================

-- Analyze all tables to update statistics
ANALYZE public.profiles;
ANALYZE public.bills;
ANALYZE public.user_plans;
ANALYZE public.sales_orders;
ANALYZE public.purchase_orders;
ANALYZE public.order_lines;
ANALYZE public.whatsapp_messages;
ANALYZE public.whatsapp_broadcasts;
ANALYZE public.ai_query_log;

-- Analyze customers and invoices if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
    ANALYZE public.customers;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    ANALYZE public.invoices;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_transactions') THEN
    ANALYZE public.payment_transactions;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    ANALYZE public.products;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_txns') THEN
    ANALYZE public.inventory_txns;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
    ANALYZE public.expenses;
  END IF;
END $$;

-- ============================================
-- 9. ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE public.profiles IS 'User profile information';
COMMENT ON TABLE public.bills IS 'Bill management with team support';
COMMENT ON TABLE public.user_plans IS 'User subscription plans (free, pro, premium)';
COMMENT ON TABLE public.sales_orders IS 'Sales orders and invoices';
COMMENT ON TABLE public.purchase_orders IS 'Purchase orders from suppliers';
COMMENT ON TABLE public.order_lines IS 'Line items for sales and purchase orders';
COMMENT ON TABLE public.whatsapp_messages IS 'WhatsApp messages sent to customers';
COMMENT ON TABLE public.whatsapp_broadcasts IS 'WhatsApp broadcast campaigns';
COMMENT ON TABLE public.products IS 'Product catalog and inventory';
COMMENT ON TABLE public.inventory_txns IS 'Inventory transactions (in/out/adjustments)';

-- ============================================
-- 10. CREATE INDEXES FOR FULL TEXT SEARCH (Optional)
-- ============================================

-- Note: Full-text search indexes with pg_trgm extension are optional
-- and may not be available in all Supabase projects.
-- If you need fuzzy search, enable pg_trgm extension manually in Supabase dashboard
-- and then create GIN indexes using: CREATE INDEX ... USING gin(column_name gin_trgm_ops);
-- 
-- For now, we skip these optional indexes to avoid errors if the extension is not available.
-- Regular B-tree indexes on text columns (created above) will still provide good performance.

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database optimization complete!';
  RAISE NOTICE 'Indexes created/verified, triggers added, constraints enforced.';
  RAISE NOTICE 'Run VACUUM ANALYZE periodically to maintain performance.';
END $$;

