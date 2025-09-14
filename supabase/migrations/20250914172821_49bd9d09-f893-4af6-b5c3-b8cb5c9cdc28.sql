-- Fix infinite recursion in team_members RLS policy
DROP POLICY IF EXISTS "Team members can view team membership" ON team_members;

-- Create security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.can_view_team_membership(target_team_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    -- User can view their own membership
    SELECT 1 WHERE auth.uid() = target_user_id
  ) OR EXISTS (
    -- Team owner can view all memberships
    SELECT 1 FROM teams WHERE id = target_team_id AND owner_id = auth.uid()
  ) OR EXISTS (
    -- Team admins can view memberships (avoid self-reference)
    SELECT 1 FROM team_members tm_check 
    WHERE tm_check.team_id = target_team_id 
      AND tm_check.user_id = auth.uid() 
      AND tm_check.role IN ('admin', 'owner')
  );
$$;

-- Create new policy using the security definer function
CREATE POLICY "Team members can view team membership" 
ON team_members 
FOR SELECT 
USING (can_view_team_membership(team_id, user_id));

-- Fix team admins policy recursion as well
DROP POLICY IF EXISTS "Team admins can manage team members" ON team_members;

CREATE OR REPLACE FUNCTION public.can_manage_team_members(target_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    -- Team owner can manage members
    SELECT 1 FROM teams WHERE id = target_team_id AND owner_id = auth.uid()
  ) OR EXISTS (
    -- Team admins can manage members (avoid self-reference)
    SELECT 1 FROM team_members tm_check 
    WHERE tm_check.team_id = target_team_id 
      AND tm_check.user_id = auth.uid() 
      AND tm_check.role IN ('admin', 'owner')
  );
$$;

CREATE POLICY "Team admins can manage team members" 
ON team_members 
FOR ALL 
USING (can_manage_team_members(team_id));