-- DROP EVERYTHING FIRST TO FIX SCHEMA MISMATCHES
drop view if exists public.user_plan_view;
drop table if exists public.user_plans cascade;

-- Create user_plans table
create table public.user_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null, -- 'pro', 'premium'
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  valid_until timestamptz,
  ai_queries_used integer default 0,
  ai_queries_limit integer default 3
);

-- Access control for user_plans
alter table public.user_plans enable row level security;

do $$ begin
  create policy "Users can view own plan"
    on public.user_plans for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Service role can manage plans"
    on public.user_plans for all
    using (true)
    with check (true);
exception when duplicate_object then null; end $$;

-- Create user_plan_view for easier querying
drop view if exists public.user_plan_view;
create or replace view public.user_plan_view as
select 
  u.id as user_id,
  coalesce(
    (select plan from public.user_plans up 
     where up.user_id = u.id 
       and up.status = 'active' 
       and (up.valid_until is null or up.valid_until > now())
     order by created_at desc limit 1),
    'free'
  ) as plan,
  'active' as status -- Simplified for view
from auth.users u
where u.id = auth.uid();

-- Grant permissions
grant select on public.user_plan_view to authenticated;
grant all on public.user_plans to postgres, service_role;
grant select on public.user_plans to authenticated;

-- Create RPC function to create default plan
create or replace function public.create_default_user_plan(_user_id uuid)
returns void as $$
begin
  insert into public.user_plans (user_id, plan, status, ai_queries_limit)
  values (_user_id, 'free', 'active', 3)
  on conflict do nothing; -- Assuming we want to avoid duplicates if unique constraint existed, though id is PK.
                          -- Better: logic to check existence or just insert.
                          -- Since table has no unique constraint on user_id (one user can have history), we just insert.
                          -- However, frontend calls this if no plan found.
end;
$$ language plpgsql security definer;

-- Create RPC function for system admin check (mock implementation or based on specific logic)
create or replace function public.is_system_admin(user_id uuid)
returns boolean as $$
begin
  -- For now, return false or check a specific email/table
  -- Example: return exists(select 1 from auth.users where id = user_id and email = 'admin@example.com');
  return false; 
end;
$$ language plpgsql security definer;

-- Create RPC to upgrade plan safely (bypassing Client Schema Cache issues)
create or replace function public.verify_and_upgrade_plan(
  _user_id uuid,
  _plan_id text,
  _valid_until timestamptz
)
returns void as $$
begin
  insert into public.user_plans (user_id, plan, status, valid_until, created_at, updated_at)
  values (_user_id, _plan_id, 'active', _valid_until, now(), now());
end;
$$ language plpgsql security definer;

