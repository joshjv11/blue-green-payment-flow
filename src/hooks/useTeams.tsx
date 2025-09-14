import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

  // Fetch teams user is part of
  const fetchTeams = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch teams where user is owner or member
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .or(`owner_id.eq.${user.id},team_members.user_id.eq.${user.id}`);

      if (teamsError) throw teamsError;

      setTeams(teamsData || []);

      // Fetch team members for each team
      if (teamsData && teamsData.length > 0) {
        const teamIds = teamsData.map(t => t.id);
        const { data: membersData, error: membersError } = await supabase
          .from('team_members')
          .select('*')
          .in('team_id', teamIds);

        if (membersError) throw membersError;

        // Fetch profiles for all users
        const userIds = membersData?.map(m => m.user_id) || [];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        // Group members by team and attach profile data
        const membersByTeam: Record<string, TeamMember[]> = {};
        membersData?.forEach(member => {
          if (!membersByTeam[member.team_id]) {
            membersByTeam[member.team_id] = [];
          }
          
          const profile = profilesData?.find(p => p.id === member.user_id);
          membersByTeam[member.team_id].push({
            ...member,
            profiles: profile ? {
              email: profile.email,
              full_name: profile.full_name
            } : undefined
          } as TeamMember);
        });

        setTeamMembers(membersByTeam);
      }

      // Fetch pending invitations for teams user owns/admins
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('invited_by', user.id)
        .is('accepted_at', null);

      if (!invitationsError) {
        setInvitations(invitationsData || []);
      }

    } catch (error: any) {
      console.error('Error fetching teams:', error);
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create new team
  const createTeam = async (name: string, description?: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name,
          description,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as team member
      await supabase
        .from('team_members')
        .insert({
          team_id: data.id,
          user_id: user.id,
          role: 'owner',
        });

      setTeams(prev => [...prev, data]);
      
      toast({
        title: "Team Created",
        description: `Team "${name}" has been created successfully`,
      });

      return data;
    } catch (error: any) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Invite team member
  const inviteTeamMember = async (teamId: string, email: string, role: 'admin' | 'member' | 'viewer' = 'member') => {
    if (!user) return;

    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { data, error } = await supabase
        .from('team_invitations')
        .insert({
          team_id: teamId,
          email,
          role,
          invited_by: user.id,
          token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setInvitations(prev => [...prev, data]);

      // TODO: Send invitation email via edge function
      
      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${email}`,
      });

      return data;
    } catch (error: any) {
      console.error('Error inviting team member:', error);
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Remove team member
  const removeTeamMember = async (teamId: string, userId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setTeamMembers(prev => ({
        ...prev,
        [teamId]: prev[teamId]?.filter(member => member.user_id !== userId) || []
      }));

      toast({
        title: "Member Removed",
        description: "Team member has been removed",
      });
    } catch (error: any) {
      console.error('Error removing team member:', error);
      toast({
        title: "Error",
        description: "Failed to remove team member",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Update team member role
  const updateMemberRole = async (teamId: string, userId: string, role: 'admin' | 'member' | 'viewer') => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('team_members')
        .update({ role })
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setTeamMembers(prev => ({
        ...prev,
        [teamId]: prev[teamId]?.map(member => 
          member.user_id === userId ? { ...member, role } : member
        ) || []
      }));

      toast({
        title: "Role Updated",
        description: "Team member role has been updated",
      });

      return data;
    } catch (error: any) {
      console.error('Error updating member role:', error);
      toast({
        title: "Error",
        description: "Failed to update member role",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Check if user has permission in team
  const hasTeamPermission = (teamId: string, requiredRole: 'viewer' | 'member' | 'admin' | 'owner'): boolean => {
    if (!user) return false;

    const team = teams.find(t => t.id === teamId);
    if (!team) return false;

    // Team owner always has all permissions
    if (team.owner_id === user.id) return true;

    const member = teamMembers[teamId]?.find(m => m.user_id === user.id);
    if (!member) return false;

    const roleHierarchy = ['viewer', 'member', 'admin', 'owner'];
    const userRoleIndex = roleHierarchy.indexOf(member.role);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

    return userRoleIndex >= requiredRoleIndex;
  };

  // Get user's role in team
  const getUserTeamRole = (teamId: string): 'owner' | 'admin' | 'member' | 'viewer' | null => {
    if (!user) return null;

    const team = teams.find(t => t.id === teamId);
    if (team?.owner_id === user.id) return 'owner';

    const member = teamMembers[teamId]?.find(m => m.user_id === user.id);
    return member?.role || null;
  };

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
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