import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Team {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  invited_by?: string;
  joined_at?: string;
  created_at: string;
  profiles?: {
    email: string;
    full_name?: string;
  };
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

export const useTeams = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = async () => {
    if (!user) return;
    console.warn('Teams feature not migrated — returning empty data');
    setTeams([]);
    setTeamMembers({});
    setInvitations([]);
    setLoading(false);
  };

  const createTeam = async (_name: string, _description?: string) => {
    toast({ title: 'Not available', description: 'Teams are not migrated yet.', variant: 'destructive' });
    throw new Error('Teams not migrated');
  };

  const inviteTeamMember = async (_teamId: string, _email: string, _role: 'admin' | 'member' | 'viewer' = 'member') => {
    toast({ title: 'Not available', description: 'Team invitations are not migrated yet.', variant: 'destructive' });
    throw new Error('Teams not migrated');
  };

  const removeTeamMember = async (_teamId?: string, _userId?: string) => {
    toast({ title: 'Not available', description: 'Teams are not migrated yet.', variant: 'destructive' });
  };

  const updateMemberRole = async (_teamId?: string, _userId?: string, _role?: 'admin' | 'member' | 'viewer') => {
    toast({ title: 'Not available', description: 'Teams are not migrated yet.', variant: 'destructive' });
  };

  const hasTeamPermission = (_teamId: string, _requiredRole: 'viewer' | 'member' | 'admin' | 'owner'): boolean => false;

  const getUserTeamRole = (_teamId: string): 'owner' | 'admin' | 'member' | 'viewer' | null => null;

  useEffect(() => {
    if (user) fetchTeams();
  }, [user]);

  return {
    teams,
    teamMembers,
    invitations,
    loading,
    fetchTeams,
    createTeam,
    inviteTeamMember,
    removeTeamMember,
    updateMemberRole,
    hasTeamPermission,
    getUserTeamRole,
  };
};
