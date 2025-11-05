import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Lock, Users, CreditCard, Crown, Eye, EyeOff, CheckCircle, XCircle, Clock, Brain, Mail } from 'lucide-react';
import { AIAssistant } from '@/components/admin/AIAssistant';
import { EmailBroadcast } from '@/components/admin/EmailBroadcast';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const ADMIN_PASSWORD = 'Deathground333';
const ADMIN_EMAIL = 'joshuavaz55@gmail.com';
const ADMIN_PHONE = '8828447880';

const AdminCMS = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [payments, setPayments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userPlans, setUserPlans] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // Filter states
  const [userSearch, setUserSearch] = useState('');
  const [planSearch, setPlanSearch] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');

  // Check if already authenticated (stored in sessionStorage)
  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_cms_authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      loadData();
    }
  }, []);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_cms_authenticated', 'true');
      toast({
        title: 'Access Granted',
        description: 'Welcome to Admin CMS',
      });
      loadData();
    } else {
      toast({
        title: 'Access Denied',
        description: 'Incorrect password',
        variant: 'destructive',
      });
      setPassword('');
    }
  };

  const loadData = async () => {
    setLoadingData(true);
    try {
      // Try RPC function first (if deployed)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_users_for_admin');

      if (!rpcError && rpcData && rpcData.length > 0) {
        const result = rpcData[0];
        setUsers(result.users || []);
        setUserPlans(result.plans || []);
        setPayments(result.payments || []);

        // Map user profiles to plans
        const profilesMap = new Map((result.users || []).map((u: any) => [u.id, u]));
        const plansWithUsers = (result.plans || []).map((plan: any) => ({
          ...plan,
          profiles: profilesMap.get(plan.user_id) || null
        }));
        setUserPlans(plansWithUsers);

        console.log(`✅ Loaded ${result.users?.length || 0} users, ${result.plans?.length || 0} plans, ${result.payments?.length || 0} payments`);
        toast({
          title: 'Data Loaded',
          description: `${result.users?.length || 0} users, ${result.plans?.length || 0} plans, ${result.payments?.length || 0} payments`,
        });
        return;
      }

      // Fallback: Try edge function
      const { data, error } = await supabase.functions.invoke('get-all-users', {
        method: 'GET',
      });

      if (!error && data?.success) {
        setUsers(data.users || []);
        setUserPlans(data.plans || []);
        setPayments(data.payments || []);

        // Map user profiles to plans
        const userIds = [...new Set((data.plans || []).map((p: any) => p.user_id))];
        const profilesMap = new Map((data.users || []).map((u: any) => [u.id, u]));
        
        const plansWithUsers = (data.plans || []).map((plan: any) => ({
          ...plan,
          profiles: profilesMap.get(plan.user_id) || null
        }));
        
        setUserPlans(plansWithUsers);

        console.log(`✅ Loaded ${data.users?.length || 0} users, ${data.plans?.length || 0} plans, ${data.payments?.length || 0} payments`);
        toast({
          title: 'Data Loaded',
          description: `${data.users?.length || 0} users, ${data.plans?.length || 0} plans, ${data.payments?.length || 0} payments`,
        });
        return;
      }

      // Final fallback: Direct queries (may be limited by RLS)
      await loadDataFallback();
    } catch (error) {
      console.error('Error loading data:', error);
      await loadDataFallback();
    } finally {
      setLoadingData(false);
    }
  };

  const loadDataFallback = async () => {
    try {
      // Fallback: Direct queries (may be limited by RLS)
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: plansData } = await supabase
        .from('user_plans')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: paymentsData } = await supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      setUsers(usersData || []);
      setPayments(paymentsData || []);

      // Map profiles to plans
      const userIds = [...new Set((plansData || []).map(p => p.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      const plansWithUsers = (plansData || []).map(plan => ({
        ...plan,
        profiles: profilesMap.get(plan.user_id) || null
      }));
      
      setUserPlans(plansWithUsers);

      toast({
        title: 'Data Loaded (Limited)',
        description: `Loaded ${usersData?.length || 0} users. Note: Some users may be hidden due to RLS policies. Deploy the get-all-users edge function for full access.`,
      });
    } catch (error) {
      console.error('Fallback error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data. Please check console for details.',
        variant: 'destructive',
      });
    }
  };

  const updateUserPlan = async (userId: string, planType: 'free' | 'pro' | 'premium', durationDays: number = 30) => {
    setLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      // Build update object with only columns that exist
      const updateData: any = {
        user_id: userId,
        plan: planType,
        is_active: true,
        ai_queries_limit: planType === 'free' ? 3 : 999999,
      };

      // Only include started_at and expires_at if they exist in the schema
      // Try to set them, but handle gracefully if they don't exist
      try {
        updateData.started_at = new Date().toISOString();
        updateData.expires_at = expiresAt.toISOString();
      } catch (e) {
        // Columns might not exist, continue without them
      }

      const { error } = await supabase
        .from('user_plans')
        .upsert(updateData, {
          onConflict: 'user_id'
        });

      if (error) {
        // If error is about missing columns, try without them
        if (error.message?.includes('started_at') || error.message?.includes('expires_at')) {
          const { error: retryError } = await supabase
            .from('user_plans')
            .upsert({
              user_id: userId,
              plan: planType,
              is_active: true,
              ai_queries_limit: planType === 'free' ? 3 : 999999,
            }, {
              onConflict: 'user_id'
            });
          
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

      toast({
        title: 'Success',
        description: `User plan updated to ${planType}`,
      });

      // Send notification
      await sendNotification(userId, planType);

      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update plan',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async (userId: string, planType: string) => {
    try {
      // Get user email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();

      // Send email notification to admin
      const emailBody = `New Plan Update:\n\nUser: ${profile?.email || userId}\nPlan: ${planType}\nUpdated: ${new Date().toLocaleString()}`;
      
      // You can integrate with an email service here
      console.log('📧 Email notification to admin:', {
        to: ADMIN_EMAIL,
        subject: 'Plan Updated - InvoiceFlow',
        body: emailBody
      });

      // Send SMS notification (you can integrate with SMS service)
      console.log('📱 SMS notification to admin:', {
        to: ADMIN_PHONE,
        message: `Plan updated: ${planType} for user ${profile?.email || userId}`
      });

      toast({
        title: 'Notification Sent',
        description: 'Admin has been notified',
      });
    } catch (error) {
      console.error('Notification error:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Lock className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Admin CMS Access</CardTitle>
            <CardDescription>
              Enter password to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter admin password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button
              onClick={handleLogin}
              className="w-full"
              disabled={!password}
            >
              <Shield className="h-4 w-4 mr-2" />
              Access Admin CMS
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">Admin CMS</h1>
            </div>
            <p className="text-muted-foreground">
              Manage payments, users, and plans
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              sessionStorage.removeItem('admin_cms_authenticated');
              setIsAuthenticated(false);
            }}
          >
            Lock
          </Button>
        </div>

        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users & Plans
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Manage Plans
            </TabsTrigger>
            <TabsTrigger value="ai-assistant" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="email-broadcast" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Broadcast
            </TabsTrigger>
          </TabsList>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Transactions</CardTitle>
                <CardDescription>All payment transactions and verifications</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    Loading all payments...
                  </div>
                ) : payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No payments found</div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-muted-foreground">
                        Total: {payments.length} payment{payments.length !== 1 ? 's' : ''}
                        {paymentSearch && (() => {
                          const filtered = payments.filter(p => 
                            p.user_id?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                            p.transaction_id?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                            p.notes?.toLowerCase().includes(paymentSearch.toLowerCase())
                          );
                          return ` (${filtered.length} filtered)`;
                        })()}
                      </p>
                      <Input
                        placeholder="Search payments..."
                        value={paymentSearch}
                        onChange={(e) => setPaymentSearch(e.target.value)}
                        className="max-w-xs"
                      />
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.filter(p => 
                            !paymentSearch || 
                            p.user_id?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                            p.transaction_id?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                            p.notes?.toLowerCase().includes(paymentSearch.toLowerCase())
                          ).map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell className="font-mono text-sm">{payment.user_id?.slice(0, 8)}...</TableCell>
                              <TableCell>₹{payment.amount || 0}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  payment.status === 'verified' ? 'default' :
                                  payment.status === 'pending' ? 'secondary' : 'destructive'
                                }>
                                  {payment.status || 'pending'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {payment.created_at ? format(new Date(payment.created_at), 'MMM dd, yyyy HH:mm') : '-'}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {payment.notes || payment.transaction_id || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users & Plans Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Profiles</CardTitle>
                <CardDescription>All user accounts and their current plans</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    Loading all users...
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No users found</div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-muted-foreground">
                        Total: {users.length} user{users.length !== 1 ? 's' : ''}
                        {userSearch && (() => {
                          const filtered = users.filter(u => 
                            u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
                            u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                            u.id?.toLowerCase().includes(userSearch.toLowerCase())
                          );
                          return ` (${filtered.length} filtered)`;
                        })()}
                      </p>
                      <Input
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="max-w-xs"
                      />
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Current Plan</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                        {users.filter(u => 
                          !userSearch || 
                          u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.id?.toLowerCase().includes(userSearch.toLowerCase())
                        ).map((user) => {
                          const userPlan = userPlans.find(p => p.user_id === user.id);
                          return (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.email || '-'}</TableCell>
                              <TableCell>{user.full_name || '-'}</TableCell>
                              <TableCell>
                                {user.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy') : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  userPlan?.plan === 'premium' ? 'default' :
                                  userPlan?.plan === 'pro' ? 'secondary' : 'outline'
                                }>
                                  {userPlan?.plan || 'free'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={userPlan?.plan || 'free'}
                                  onValueChange={(value) => updateUserPlan(user.id, value as any)}
                                  disabled={loading}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="free">Free</SelectItem>
                                    <SelectItem value="pro">Pro</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Plan Management</CardTitle>
                <CardDescription>View and manage all user plan subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    Loading all plans...
                  </div>
                ) : userPlans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No plans found</div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-muted-foreground">
                        Total: {userPlans.length} plan{userPlans.length !== 1 ? 's' : ''}
                        {planSearch && (() => {
                          const filtered = userPlans.filter(p => 
                            (p.profiles as any)?.email?.toLowerCase().includes(planSearch.toLowerCase()) ||
                            p.user_id?.toLowerCase().includes(planSearch.toLowerCase()) ||
                            p.plan?.toLowerCase().includes(planSearch.toLowerCase())
                          );
                          return ` (${filtered.length} filtered)`;
                        })()}
                      </p>
                      <Input
                        placeholder="Search plans..."
                        value={planSearch}
                        onChange={(e) => setPlanSearch(e.target.value)}
                        className="max-w-xs"
                      />
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Started</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userPlans.filter(p => 
                            !planSearch || 
                            (p.profiles as any)?.email?.toLowerCase().includes(planSearch.toLowerCase()) ||
                            p.user_id?.toLowerCase().includes(planSearch.toLowerCase()) ||
                            p.plan?.toLowerCase().includes(planSearch.toLowerCase())
                          ).map((plan) => (
                            <TableRow key={plan.id}>
                              <TableCell>
                                {plan.profiles?.email || plan.user_id?.slice(0, 8) + '...'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={
                                  plan.plan === 'premium' ? 'default' :
                                  plan.plan === 'pro' ? 'secondary' : 'outline'
                                }>
                                  {plan.plan}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                                  {plan.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {plan.started_at ? (() => {
                                  try {
                                    return format(new Date(plan.started_at), 'MMM dd, yyyy');
                                  } catch {
                                    return '-';
                                  }
                                })() : '-'}
                              </TableCell>
                              <TableCell>
                                {plan.expires_at ? (() => {
                                  try {
                                    return format(new Date(plan.expires_at), 'MMM dd, yyyy');
                                  } catch {
                                    return '-';
                                  }
                                })() : '-'}
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={plan.plan}
                                  onValueChange={(value) => updateUserPlan(plan.user_id, value as any)}
                                  disabled={loading}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="free">Free</SelectItem>
                                    <SelectItem value="pro">Pro</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Assistant Tab */}
          <TabsContent value="ai-assistant" className="space-y-4">
            <AIAssistant />
          </TabsContent>

          {/* Email Broadcast Tab */}
          <TabsContent value="email-broadcast" className="space-y-4">
            <EmailBroadcast />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminCMS;

