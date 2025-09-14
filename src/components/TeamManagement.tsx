import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTeams } from '@/hooks/useTeams';
import { Users, Plus, Mail, Shield, Eye, Settings, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const TeamManagement = () => {
  const { teams, teamMembers, invitations, loading, createTeam, inviteTeamMember, removeTeamMember, updateMemberRole, hasTeamPermission } = useTeams();
  const { toast } = useToast();
  
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');

  const handleCreateTeam = async () => {
    try {
      await createTeam(newTeamName, newTeamDescription);
      setNewTeamName('');
      setNewTeamDescription('');
      setIsCreateTeamOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleInviteTeamMember = async () => {
    if (!selectedTeamId) return;
    
    try {
      await inviteTeamMember(selectedTeamId, inviteEmail, inviteRole);
      setInviteEmail('');
      setInviteRole('member');
      setIsInviteOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    try {
      await removeTeamMember(teamId, userId);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleUpdateRole = async (teamId: string, userId: string, newRole: 'admin' | 'member' | 'viewer') => {
    try {
      await updateMemberRole(teamId, userId, newRole);
    } catch (error) {
      // Error handled in hook
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Shield className="h-4 w-4" />;
      case 'admin': return <Settings className="h-4 w-4" />;
      case 'member': return <Users className="h-4 w-4" />;
      case 'viewer': return <Eye className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'member': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading teams...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
          <p className="text-muted-foreground">Collaborate with your team on bill management</p>
        </div>
        
        <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a team to collaborate on bill management with your colleagues.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Enter team name"
                />
              </div>
              <div>
                <Label htmlFor="team-description">Description (Optional)</Label>
                <Input
                  id="team-description"
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  placeholder="Team description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateTeamOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTeam} disabled={!newTeamName.trim()}>
                Create Team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Teams List */}
      {teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No teams yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              Create your first team to start collaborating on bill management.
            </p>
            <Button onClick={() => setIsCreateTeamOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {team.name}
                  </CardTitle>
                  {hasTeamPermission(team.id, 'admin') && (
                    <Dialog open={isInviteOpen && selectedTeamId === team.id} onOpenChange={(open) => {
                      setIsInviteOpen(open);
                      if (open) setSelectedTeamId(team.id);
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Invite Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Invite Team Member</DialogTitle>
                          <DialogDescription>
                            Send an invitation to join {team.name}.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="invite-email">Email Address</Label>
                            <Input
                              id="invite-email"
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="colleague@company.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="invite-role">Role</Label>
                            <Select value={inviteRole} onValueChange={(value: 'admin' | 'member' | 'viewer') => setInviteRole(value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="viewer">Viewer - Can view bills</SelectItem>
                                <SelectItem value="member">Member - Can create and edit bills</SelectItem>
                                <SelectItem value="admin">Admin - Can manage team and bills</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleInviteTeamMember} disabled={!inviteEmail.trim()}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Invitation
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                {team.description && (
                  <p className="text-sm text-muted-foreground">{team.description}</p>
                )}
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Team Members ({teamMembers[team.id]?.length || 0})</h4>
                  </div>
                  
                  {teamMembers[team.id]?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined</TableHead>
                          {hasTeamPermission(team.id, 'admin') && <TableHead>Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamMembers[team.id].map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {member.profiles?.full_name || member.profiles?.email}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {member.profiles?.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`flex items-center gap-1 w-fit ${getRoleBadgeColor(member.role)}`}>
                                {getRoleIcon(member.role)}
                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            {hasTeamPermission(team.id, 'admin') && (
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {member.role !== 'owner' && (
                                    <>
                                      <Select
                                        value={member.role}
                                        onValueChange={(value: 'admin' | 'member' | 'viewer') => 
                                          handleUpdateRole(team.id, member.user_id, value)
                                        }
                                      >
                                        <SelectTrigger className="h-8 w-24">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="viewer">Viewer</SelectItem>
                                          <SelectItem value="member">Member</SelectItem>
                                          <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRemoveMember(team.id, member.user_id)}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No members yet. Invite team members to get started.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamManagement;