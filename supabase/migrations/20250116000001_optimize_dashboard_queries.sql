-- Create optimized RPC function to fetch all dashboard data in one query
CREATE OR REPLACE FUNCTION public.get_dashboard_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'bills', (
      SELECT COALESCE(json_agg(row_to_json(b.*)), '[]'::json)
      FROM (
        SELECT *
        FROM bills
        WHERE user_id = p_user_id
        ORDER BY due_date ASC
        LIMIT 50
      ) b
    ),
    'savings_goals', (
      SELECT COALESCE(json_agg(row_to_json(sg.*)), '[]'::json)
      FROM (
        SELECT *
        FROM savings_goals
        WHERE user_id = p_user_id
          AND is_completed = false
        ORDER BY created_at DESC
        LIMIT 3
      ) sg
    ),
    'active_emis', (
      SELECT COALESCE(json_agg(row_to_json(e.*)), '[]'::json)
      FROM (
        SELECT *
        FROM emi_tracker
        WHERE user_id = p_user_id
          AND is_active = true
        ORDER BY next_due_date ASC
        LIMIT 3
      ) e
    ),
    'current_month_expenses', (
      SELECT COALESCE(json_agg(row_to_json(exp.*)), '[]'::json)
      FROM (
        SELECT category, SUM(amount::numeric) as total_amount
        FROM expenses
        WHERE user_id = p_user_id
          AND date >= date_trunc('month', CURRENT_DATE)
        GROUP BY category
      ) exp
    ),
    'spending_alerts', (
      SELECT COALESCE(json_agg(row_to_json(sa.*)), '[]'::json)
      FROM (
        SELECT *
        FROM spending_alerts
        WHERE user_id = p_user_id
          AND is_active = true
      ) sa
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_data(UUID) TO authenticated;

