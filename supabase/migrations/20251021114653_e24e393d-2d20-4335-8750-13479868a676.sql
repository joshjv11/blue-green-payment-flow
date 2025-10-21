-- Create canonical entitlement view
create or replace view public.user_entitlements_v1 
with (security_invoker = true)
as
select
  u.id as user_id,
  coalesce(
    case 
      when up.plan = 'premium' then 'premium'
      when up.plan = 'pro' then 'pro'
      else 'free'
    end,
    'free'
  )::text as plan,
  (coalesce(up.plan, 'free') in ('pro','premium')) as is_premium,
  (coalesce(up.plan, 'free') = 'premium') as is_enterprise,
  up.is_active as subscription_status,
  up.expires_at as current_period_end
from auth.users u
left join public.user_plans up on up.user_id = u.id and up.is_active = true;

-- Grant access
grant select on public.user_entitlements_v1 to authenticated;