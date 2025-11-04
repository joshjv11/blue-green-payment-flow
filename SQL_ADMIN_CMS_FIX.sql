-- SQL function to get all users for Admin CMS
-- This bypasses RLS by using SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE (
  users json,
  plans json,
  payments json
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT json_agg(row_to_json(p)) FROM profiles p ORDER BY p.created_at DESC) as users,
    (SELECT json_agg(row_to_json(up)) FROM user_plans up ORDER BY up.created_at DESC) as plans,
    (SELECT 
      CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_transactions')
        THEN (SELECT json_agg(row_to_json(pt)) FROM payment_transactions pt ORDER BY pt.created_at DESC)
        ELSE '[]'::json
      END
    ) as payments;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_users_for_admin() TO authenticated;

