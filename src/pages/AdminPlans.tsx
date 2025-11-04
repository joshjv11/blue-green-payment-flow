import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, UserCheck, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Navigation } from '@/components/Navigation';
import { BackToDashboard } from '@/components/BackToDashboard';
import { format } from 'date-fns';

interface PlanChange {
  id: string;
  user_id: string;
  old_plan: string;
  new_plan: string;
  changed_at: string;
  changed_by: string | null;
}

export default function AdminPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'premium'>('free');
  const [duration, setDuration] = useState('30');
  const [loading, setLoading] = useState(false);
  const [planChanges, setPlanChanges] = useState<PlanChange[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchPlanChanges();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();
    
    // Check if admin via RPC or fallback to profile check
    const { data: isAdminData } = await supabase.rpc('is_system_admin');
    setIsAdmin(!!isAdminData);
  };

  const fetchPlanChanges = async () => {
    try {
      const { data, error } = await supabase
        .from('user_plan_changes')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setPlanChanges(data || []);
    } catch (error: any) {
      console.error('Error fetching plan changes:', error);
    }
  };

  const handleSetPlan = async () => {
    if (!email.trim()) {
      toast({ title: 'Please enter an email address', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      // First, find user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) {
        toast({ title: 'User not found', description: 'No user with that email exists', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const days = duration === 'no-expiry' ? null : parseInt(duration);
      const expiresAt = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;

      // Direct upsert (set_user_plan RPC not available)
      const { error: upsertError } = await supabase
        .from('user_plans')
        .upsert({
          user_id: userData.id,
          plan: selectedPlan,
          is_active: true,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'user_id' 
        });

      if (upsertError) throw upsertError;

      toast({ 
        title: 'Plan updated successfully',
        description: `${email} is now on ${selectedPlan} plan`,
      });

      setEmail('');
      fetchPlanChanges();
    } catch (error: any) {
      console.error('Error setting plan:', error);
      toast({ 
        title: 'Failed to update plan', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Admin Access Required
            </CardTitle>
            <CardDescription>
              You need admin privileges to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-6">
      <Navigation />

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        <BackToDashboard />
        
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl md:text-4xl font-black text-foreground flex items-center gap-2">
            <Shield className="w-8 h-8" />
            User Plans Management
          </h1>
          <p className="text-muted-foreground">Manage user subscription plans and access levels</p>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle>Set User Plan</CardTitle>
            <CardDescription>
              Search by email and assign a plan to any user
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">User Email</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Plan</Label>
              <RadioGroup value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="free" id="free" />
                  <Label htmlFor="free" className="cursor-pointer">
                    Free - Basic features
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pro" id="pro" />
                  <Label htmlFor="pro" className="cursor-pointer">
                    Pro - ₹100/month - Advanced bills, sales, purchases
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="premium" id="premium" />
                  <Label htmlFor="premium" className="cursor-pointer">
                    Premium - ₹999/month - Full access + Inventory, GST, Reports
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">365 days (1 year)</SelectItem>
                  <SelectItem value="no-expiry">No expiry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleSetPlan} 
              disabled={loading || !email.trim()}
              className="w-full gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  Apply Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Plan Changes</CardTitle>
            <CardDescription>Last 20 plan modifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Old Plan</TableHead>
                    <TableHead>New Plan</TableHead>
                    <TableHead>Changed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planChanges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No plan changes yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    planChanges.map((change) => (
                      <TableRow key={change.id}>
                        <TableCell className="font-mono text-xs">{change.user_id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge variant="outline">{change.old_plan}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge>{change.new_plan}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(change.changed_at), 'PPp')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
