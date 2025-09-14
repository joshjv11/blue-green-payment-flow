-- Create enum types for roles and bill statuses
CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE public.bill_status AS ENUM ('unpaid', 'paid', 'overdue');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  company TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create teams table for team collaboration
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create team_members table for team membership
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Create team invitations table
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create bills table with team support
CREATE TABLE public.bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  category TEXT NOT NULL,
  recurring BOOLEAN NOT NULL DEFAULT false,
  status public.bill_status NOT NULL DEFAULT 'unpaid',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create user_plans table for subscription management
CREATE TABLE public.user_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  ai_queries_used INTEGER NOT NULL DEFAULT 0,
  ai_queries_limit INTEGER NOT NULL DEFAULT 3,
  ai_queries_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create ai_query_log table for tracking AI usage
CREATE TABLE public.ai_query_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_type TEXT NOT NULL,
  query_content TEXT,
  response_content TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_query_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for teams
CREATE POLICY "Team owners can view their teams" ON public.teams
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Team members can view their teams" ON public.teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can update their teams" ON public.teams
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Team owners can create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owners can delete their teams" ON public.teams
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for team_members
CREATE POLICY "Team members can view team membership" ON public.team_members
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.teams 
      WHERE id = team_id AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members tm 
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Team admins can manage team members" ON public.team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.teams 
      WHERE id = team_id AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members tm 
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.role IN ('admin', 'owner')
    )
  );

-- RLS Policies for team_invitations
CREATE POLICY "Team admins can manage invitations" ON public.team_invitations
  FOR ALL USING (
    auth.uid() = invited_by OR
    EXISTS (
      SELECT 1 FROM public.teams 
      WHERE id = team_id AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members tm 
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.role IN ('admin', 'owner')
    )
  );

-- RLS Policies for bills
CREATE POLICY "Users can view their own bills" ON public.bills
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Team members can view team bills" ON public.bills
  FOR SELECT USING (
    team_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = bills.team_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own bills" ON public.bills
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Team admins can manage team bills" ON public.bills
  FOR ALL USING (
    team_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.team_members tm 
      WHERE tm.team_id = bills.team_id AND tm.user_id = auth.uid() AND tm.role IN ('admin', 'owner')
    )
  );

-- RLS Policies for user_plans
CREATE POLICY "Users can view their own plan" ON public.user_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own plan" ON public.user_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plan" ON public.user_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ai_query_log
CREATE POLICY "Users can view their own AI query log" ON public.ai_query_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI queries" ON public.ai_query_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );
  
  INSERT INTO public.user_plans (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_plans_updated_at
  BEFORE UPDATE ON public.user_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check user role in team
CREATE OR REPLACE FUNCTION public.has_team_role(
  _team_id UUID,
  _user_id UUID,
  _required_role public.user_role
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
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