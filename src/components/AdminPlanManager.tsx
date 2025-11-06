import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, Search, Zap, Loader2 } from 'lucide-react';

interface UserPlan {
  id: string;
  user_id: string;
  plan: 'free' | 'pro';
  ai_queries_used: number;
  ai_queries_limit: number;
  ai_queries_reset_date: string;
  created_at: string;
  updated_at: string;
  profile?: {
    email: string;
    full_name: string | null;
  };
}

export default function AdminPlanManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userPlans, setUserPlans] = useState<UserPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<UserPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<UserPlan | null>(null);
  const [newPlan, setNewPlan] = useState<'free' | 'pro'>('free');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUserPlans();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredPlans(
        userPlans.filter(
          (up) =>
            up.profile?.email?.toLowerCase().includes(query) ||
            up.profile?.full_name?.toLowerCase().includes(query) ||
            up.user_id.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredPlans(userPlans);
    }
  }, [searchQuery, userPlans]);

  const fetchUserPlans = async () => {
    try {
      setLoading(true);

      // Fetch user plans
      const { data: plans, error: plansError } = await supabase
        .from('user_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;

      // Fetch profiles separately and merge
      if (plans && plans.length > 0) {
        const userIds = plans.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const plansWithProfiles = plans.map(plan => ({
          ...plan,
          profile: profileMap.get(plan.user_id) || { email: '', full_name: null }
        })) as UserPlan[];

        setUserPlans(plansWithProfiles);
        setFilteredPlans(plansWithProfiles);
      } else {
        setUserPlans([]);
        setFilteredPlans([]);
      }
    } catch (error: any) {
      console.error('Error fetching user plans:', error);
      toast({
        title: 'Error loading plans',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlanUpdate = async () => {
    if (!editingUser) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('user_plans')
        .update({
          plan: newPlan,
          ai_queries_limit: newPlan === 'pro' ? 999999 : 3,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', editingUser.user_id);

      if (error) throw error;

      toast({
        title: 'Plan updated successfully',
        description: `User plan changed to ${newPlan.toUpperCase()}`,
      });

      setEditingUser(null);
      await fetchUserPlans();
    } catch (error: any) {
      console.error('Error updating plan:', error);
      toast({
        title: 'Failed to update plan',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (userPlan: UserPlan) => {
    setEditingUser(userPlan);
    setNewPlan(userPlan.plan);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-600" />
            Admin Plan Manager
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage user subscription plans - upgrade or downgrade any user instantly
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, name, or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{userPlans.length}</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400">Pro Users</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {userPlans.filter((up) => up.plan === 'pro').length}
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-400">Free Users</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {userPlans.filter((up) => up.plan === 'free').length}
              </p>
            </div>
          </div>

          {/* User Plans Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>AI Queries</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No user plans found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlans.map((userPlan) => (
                    <TableRow key={userPlan.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {userPlan.profile?.full_name || 'No name'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {userPlan.profile?.email || userPlan.user_id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={userPlan.plan === 'pro' ? 'default' : 'secondary'}
                          className={
                            userPlan.plan === 'pro'
                              ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                              : ''
                          }
                        >
                          {userPlan.plan === 'pro' && <Crown className="mr-1 h-3 w-3" />}
                          {userPlan.plan.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {userPlan.ai_queries_used} / {userPlan.ai_queries_limit === 999999 ? '∞' : userPlan.ai_queries_limit}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(userPlan.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(userPlan)}
                        >
                          <Zap className="mr-2 h-3 w-3" />
                          Change Plan
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Plan</DialogTitle>
            <DialogDescription>
              Instantly upgrade or downgrade this user's subscription plan.
              This bypasses all payment and verification requirements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">User Details</p>
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p className="text-sm font-medium">
                  {editingUser?.profile?.full_name || 'No name'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {editingUser?.profile?.email}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Current Plan</p>
              <Badge
                variant={editingUser?.plan === 'pro' ? 'default' : 'secondary'}
                className={
                  editingUser?.plan === 'pro'
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                    : ''
                }
              >
                {editingUser?.plan === 'pro' && <Crown className="mr-1 h-3 w-3" />}
                {editingUser?.plan.toUpperCase()}
              </Badge>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">New Plan</p>
              <Select value={newPlan} onValueChange={(v: 'free' | 'pro') => setNewPlan(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">
                    <div className="flex items-center gap-2">
                      Free Plan (3 AI queries/day)
                    </div>
                  </SelectItem>
                  <SelectItem value="pro">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-600" />
                      Pro Plan (Unlimited)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handlePlanUpdate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
