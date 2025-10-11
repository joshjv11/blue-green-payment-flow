import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { Search, History, Loader2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { Navigation } from '@/components/Navigation';

interface UserPlanData {
  user_id: string;
  email: string;
  full_name: string | null;
  short_id: string | null;
  current_plan: string;
  updated_at: string;
}

interface PlanChange {
  id: string;
  old_plan: string;
  new_plan: string;
  changed_at: string;
  changed_by: string | null;
  changer_email: string | null;
}

export default function AdminUserPlans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserPlanData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserPlanData[]>([]);
  const [planHistory, setPlanHistory] = useState<PlanChange[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users]);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('is_system_admin');
      if (error) throw error;
      
      if (!data) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }
      
      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, short_id')
        .order('email');

      if (profilesError) throw profilesError;

      const { data: plans, error: plansError } = await supabase
        .from('user_plans')
        .select('user_id, plan, updated_at');

      if (plansError) throw plansError;

      const plansMap = new Map(plans?.map(p => [p.user_id, p]) || []);

      const usersData: UserPlanData[] = (profiles || []).map(profile => {
        const plan = plansMap.get(profile.id);
        return {
          user_id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          short_id: profile.short_id,
          current_plan: plan?.plan || 'free',
          updated_at: plan?.updated_at || new Date().toISOString(),
        };
      });

      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    }
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user => 
      user.email.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query) ||
      user.short_id?.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  };

  const updateUserPlan = async (userId: string, newPlan: string) => {
    setUpdatingPlan(userId);
    try {
      const { data, error } = await supabase.functions.invoke('admin-update-user-plan', {
        body: { user_id: userId, new_plan: newPlan }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Plan Updated',
          description: `Successfully updated plan to ${newPlan}`,
        });
        fetchUsers();
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Error updating plan:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update plan',
        variant: 'destructive',
      });
    } finally {
      setUpdatingPlan(null);
    }
  };

  const fetchPlanHistory = async (userId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('user_plan_changes')
        .select(`
          id,
          old_plan,
          new_plan,
          changed_at,
          changed_by,
          changer:profiles!user_plan_changes_changed_by_fkey(email)
        `)
        .eq('user_id', userId)
        .order('changed_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const history: PlanChange[] = (data || []).map(change => ({
        id: change.id,
        old_plan: change.old_plan,
        new_plan: change.new_plan,
        changed_at: change.changed_at,
        changed_by: change.changed_by,
        changer_email: (change.changer as any)?.email || null,
      }));

      setPlanHistory(history);
    } catch (error) {
      console.error('Error fetching plan history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load plan history',
        variant: 'destructive',
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 mt-16 md:mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">User Plan Management</h1>
              <p className="text-muted-foreground">Search and manage user subscription plans</p>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Search Users</CardTitle>
              <CardDescription>Find users by email, name, or short ID</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, name, or short ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Short ID</th>
                      <th className="text-left p-3 font-semibold">Email</th>
                      <th className="text-left p-3 font-semibold">Name</th>
                      <th className="text-left p-3 font-semibold">Current Plan</th>
                      <th className="text-left p-3 font-semibold">Updated</th>
                      <th className="text-left p-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.user_id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-3 font-mono text-sm">{user.short_id || 'N/A'}</td>
                        <td className="p-3">{user.email}</td>
                        <td className="p-3">{user.full_name || '-'}</td>
                        <td className="p-3">
                          <Select
                            value={user.current_plan}
                            onValueChange={(value) => updateUserPlan(user.user_id, value)}
                            disabled={updatingPlan === user.user_id}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(user.updated_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchPlanHistory(user.user_id)}
                              >
                                <History className="h-4 w-4 mr-2" />
                                History
                              </Button>
                            </SheetTrigger>
                            <SheetContent>
                              <SheetHeader>
                                <SheetTitle>Plan Change History</SheetTitle>
                                <SheetDescription>
                                  Last 10 plan changes for {user.email}
                                </SheetDescription>
                              </SheetHeader>
                              <div className="mt-6 space-y-4">
                                {loadingHistory ? (
                                  <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                  </div>
                                ) : planHistory.length === 0 ? (
                                  <p className="text-muted-foreground text-center py-8">
                                    No plan changes recorded
                                  </p>
                                ) : (
                                  planHistory.map((change) => (
                                    <div key={change.id} className="border-l-2 border-primary pl-4 py-2">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                                          {change.old_plan}
                                        </span>
                                        <span>→</span>
                                        <span className="font-mono text-sm bg-primary/10 px-2 py-1 rounded">
                                          {change.new_plan}
                                        </span>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(change.changed_at).toLocaleString()}
                                      </p>
                                      {change.changer_email && (
                                        <p className="text-xs text-muted-foreground">
                                          Changed by: {change.changer_email}
                                        </p>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </SheetContent>
                          </Sheet>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No users found matching your search
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
