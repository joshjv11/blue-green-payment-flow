import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Edit, Trash2, Mail } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  is_active: boolean;
  created_at: string;
  invoice_count?: number;
  bill_count?: number;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
}

export default function AdminUsers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  
  const usersPerPage = 10;

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.rpc('is_system_admin');
      
      if (error || !data) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access this page.',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }
      
      setIsAdmin(true);
      setLoading(false);
    };

    checkAdmin();
  }, [user, navigate, toast]);

  // Fetch users
  useEffect(() => {
    if (!isAdmin) return;

    const fetchUsers = async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: 'Error fetching users',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      // Fetch stats for each user
      const usersWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: stats } = await supabase.rpc('get_user_stats', {
            target_user_id: profile.id,
          });

          return {
            ...profile,
            invoice_count: stats?.[0]?.invoice_count || 0,
            bill_count: stats?.[0]?.bill_count || 0,
            last_sign_in_at: stats?.[0]?.last_sign_in_at,
            email_confirmed_at: stats?.[0]?.email_confirmed_at,
          };
        })
      );

      setUsers(usersWithStats);
      setFilteredUsers(usersWithStats);
    };

    fetchUsers();
  }, [isAdmin, toast]);

  // Filter users
  useEffect(() => {
    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          u.full_name?.toLowerCase().includes(query) ||
          u.company?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter((u) => u.is_active && u.email_confirmed_at);
      } else if (statusFilter === 'suspended') {
        filtered = filtered.filter((u) => !u.is_active);
      } else if (statusFilter === 'unverified') {
        filtered = filtered.filter((u) => !u.email_confirmed_at);
      }
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchQuery, statusFilter, users]);

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.rpc('set_user_active_status', {
        target_user_id: userId,
        active_status: !currentStatus,
      });

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u))
      );

      toast({
        title: 'User status updated',
        description: `User has been ${!currentStatus ? 'activated' : 'suspended'}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resendConfirmation = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;

      toast({
        title: 'Confirmation email sent',
        description: 'The user will receive a new confirmation email.',
      });
    } catch (error: any) {
      toast({
        title: 'Error sending confirmation',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const saveUserEdit = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editingUser.full_name,
          company: editingUser.company,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, ...editingUser } : u))
      );

      toast({
        title: 'User updated',
        description: 'User profile has been updated successfully.',
      });

      setEditingUser(null);
    } catch (error: any) {
      toast({
        title: 'Error updating user',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteUser = async () => {
    if (!deletingUserId) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deletingUserId);

      if (error) throw error;

      setUsers((prev) => prev.filter((u) => u.id !== deletingUserId));

      toast({
        title: 'User deleted',
        description: 'User has been permanently deleted.',
      });

      setDeletingUserId(null);
    } catch (error: any) {
      toast({
        title: 'Error deleting user',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (user: UserProfile) => {
    if (!user.email_confirmed_at) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Email Not Verified</Badge>;
    }
    if (!user.is_active) {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage users, track onboarding, and monitor activity
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            Back to Admin
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="unverified">Email Not Verified</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead>Bills</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.full_name || 'No name'}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{user.company || '-'}</TableCell>
                  <TableCell>{getStatusBadge(user)}</TableCell>
                  <TableCell>{user.invoice_count || 0}</TableCell>
                  <TableCell>{user.bill_count || 0}</TableCell>
                  <TableCell>
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString()
                      : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={user.is_active}
                      onCheckedChange={() => toggleUserStatus(user.id, user.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {!user.email_confirmed_at && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => resendConfirmation(user.email)}
                          title="Resend confirmation email"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingUserId(user.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label>Email (read-only)</Label>
                <Input value={editingUser.email} disabled className="mt-1" />
              </div>
              <div>
                <Label>Full Name</Label>
                <Input
                  value={editingUser.full_name || ''}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, full_name: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Company</Label>
                <Input
                  value={editingUser.company || ''}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, company: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={saveUserEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUserId} onOpenChange={() => setDeletingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
