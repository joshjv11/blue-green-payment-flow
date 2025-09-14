-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION public.has_team_role(
  _team_id UUID,
  _user_id UUID,
  _required_role public.user_role
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.team_id = _team_id 
      AND (tm.user_id = _user_id OR t.owner_id = _user_id)
      AND (
        t.owner_id = _user_id OR
        CASE _required_role
          WHEN 'viewer' THEN tm.role IN ('viewer', 'member', 'admin', 'owner')
          WHEN 'member' THEN tm.role IN ('member', 'admin', 'owner')
          WHEN 'admin' THEN tm.role IN ('admin', 'owner')
          WHEN 'owner' THEN tm.role = 'owner' OR t.owner_id = _user_id
          ELSE false
        END
      )
  )
$$;