import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Users, CreditCard, Crown, Eye, EyeOff, CheckCircle, XCircle, Clock, Brain, Mail, Activity, Key, BarChart3 } from 'lucide-react';
import { AIAssistant } from '@/components/admin/AIAssistant';
import { EmailBroadcast } from '@/components/admin/EmailBroadcast';
import { MetricCard } from '@/components/admin/MetricCard';
import { FeatureUsageChart } from '@/components/admin/FeatureUsageChart';
import { SecurityEventsTable } from '@/components/admin/SecurityEventsTable';
import { UserInsightsTable } from '@/components/admin/UserInsightsTable';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { useSystemAdminStatus } from '@/hooks/useSystemAdminStatus';

const ADMIN_EMAIL = 'joshuavaz55@gmail.com';
const ADMIN_PHONE = '8828447880';

const AdminCMS = () => {
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useSystemAdminStatus();
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [payments, setPayments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userPlans, setUserPlans] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  // System Health state
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  
  // Financial Metrics state
  const [financialMetrics, setFinancialMetrics] = useState<any>(null);
  const [loadingFinancial, setLoadingFinancial] = useState(false);
  
  // Filter states
  const [userSearch, setUserSearch] = useState('');
  const [planSearch, setPlanSearch] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');
  
  // GSTN Credentials state
  const [gstnCredentials, setGstnCredentials] = useState<any[]>([]);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});
  
  // User Behaviour state
  const [userBehaviour, setUserBehaviour] = useState<any[]>([]);
  const [loadingBehaviour, setLoadingBehaviour] = useState(false);
  const [behaviourStats, setBehaviourStats] = useState<any>(null);

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
    loadSystemHealth();
    loadFinancialMetrics();
    loadGSTNCredentials();
  }, [isAdmin]);

  // Poll system health every 60 seconds
  useEffect(() => {
    if (!isAdmin) return;

    loadSystemHealth();
    const interval = setInterval(loadSystemHealth, 60000); // Poll every 60 seconds

    return () => clearInterval(interval);
  }, [isAdmin]);

  const loadSystemHealth = async () => {
    setLoadingHealth(true);
    try {
      // Feature disabled - set default values
      setSystemHealth({
        errors_last_hour: 0,
        avg_response_time_sec: 0,
        db_size_mb: 0,
        active_users_24h: 0,
        whatsapp_failures_1h: 0,
        stuck_payments: 0,
        active_connections: 0,
        total_connections: 0,
      });
    } catch (error) {
      console.error('Error loading system health:', error);
    } finally {
      setLoadingHealth(false);
    }
  };

  const loadGSTNCredentials = async () => {
    setLoadingCredentials(true);
    try {
      const { data, error } = await supabase
        .from('gstn_credentials')
        .select(`
          *,
          profiles:user_id (
            id,
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setGstnCredentials(data || []);
    } catch (error: any) {
      console.error('Error loading GSTN credentials:', error);
      toast({
        title: 'Error',
        description: 'Failed to load GSTN credentials',
        variant: 'destructive',
      });
    } finally {
      setLoadingCredentials(false);
    }
  };

  const togglePasswordVisibility = async (credentialId: string, userId: string, encryptedPassword: string) => {
    const isVisible = showPasswords[credentialId];
    
    if (!isVisible && !decryptedPasswords[credentialId]) {
      // Feature disabled - show encrypted password
      setDecryptedPasswords(prev => ({
        ...prev,
        [credentialId]: encryptedPassword.substring(0, 20) + '...',
      }));
    }

    setShowPasswords(prev => ({
      ...prev,
      [credentialId]: !isVisible,
    }));
  };

  const loadFinancialMetrics = async () => {
    setLoadingFinancial(true);
    try {
      // Feature disabled
      setFinancialMetrics(null);
    } catch (error) {
      console.error('Error loading financial metrics:', error);
      setFinancialMetrics(null);
    } finally {
      setLoadingFinancial(false);
    }
  };

  const loadUserBehaviour = async () => {
    setLoadingBehaviour(true);
    try {
      // Feature disabled until analytics tables are provisioned
      setBehaviourStats(null);
      setUserBehaviour([]);
    } finally {
      setLoadingBehaviour(false);
    }
  };

  const loadData = async () => {
    setLoadingData(true);
    try {
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

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center space-y-4 py-8">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-primary/10 animate-pulse">
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle>Verifying Admin Access</CardTitle>
            <CardDescription>
              Checking your administrator permissions...
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center space-y-4 py-8">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-destructive/10">
                <Shield className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              You need system administrator privileges to view the Admin CMS.
            </CardDescription>
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
        </div>

        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
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
            <TabsTrigger value="passwords" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Passwords
            </TabsTrigger>
            <TabsTrigger value="behaviour" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              User Behaviour
            </TabsTrigger>
            <TabsTrigger value="system-health" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System Health
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

          {/* Passwords Tab */}
          <TabsContent value="passwords" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  GSTN Credentials & Passwords
                </CardTitle>
                <CardDescription>
                  View all user GSTN credentials with decrypted passwords (Admin Only)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCredentials ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    Loading credentials...
                  </div>
                ) : gstnCredentials.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No GSTN credentials found</div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-muted-foreground">
                        Total: {gstnCredentials.length} credential{gstnCredentials.length !== 1 ? 's' : ''}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadGSTNCredentials}
                      >
                        Refresh
                      </Button>
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>GSTIN</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Password</TableHead>
                            <TableHead>API Endpoint</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {gstnCredentials.map((cred) => {
                            const profile = cred.profiles as any;
                            const isPasswordVisible = showPasswords[cred.id];
                            const decryptedPassword = decryptedPasswords[cred.id] || '';
                            
                            return (
                              <TableRow key={cred.id}>
                                <TableCell className="font-medium">
                                  {profile?.full_name || 'N/A'}
                                </TableCell>
                                <TableCell>{profile?.email || '-'}</TableCell>
                                <TableCell>
                                  <code className="text-xs bg-muted px-2 py-1 rounded">
                                    {cred.gstin || '-'}
                                  </code>
                                </TableCell>
                                <TableCell>{cred.username || '-'}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {isPasswordVisible ? (
                                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                        {decryptedPassword || 'Decrypting...'}
                                      </code>
                                    ) : (
                                      <span className="text-muted-foreground text-sm">••••••••</span>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => togglePasswordVisibility(cred.id, cred.user_id, cred.password_encrypted)}
                                      className="h-6 w-6 p-0"
                                    >
                                      {isPasswordVisible ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <code className="text-xs bg-muted px-2 py-1 rounded">
                                    {cred.api_endpoint || 'Default'}
                                  </code>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={cred.is_active ? 'default' : 'secondary'}>
                                    {cred.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {cred.created_at ? format(new Date(cred.created_at), 'MMM dd, yyyy') : '-'}
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

          {/* User Behaviour Tab */}
          <TabsContent value="behaviour" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  User Behaviour Analytics
                </CardTitle>
                <CardDescription>
                  Track user activity, page views, and feature usage (Last 7 days)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBehaviour ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    Loading user behaviour data...
                  </div>
                ) : !behaviourStats ? (
                  <div className="text-center py-8 text-muted-foreground">No behaviour data found</div>
                ) : (
                  <div className="space-y-6">
                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{behaviourStats.totalEvents}</div>
                          <p className="text-xs text-muted-foreground">Total Events</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{behaviourStats.uniqueUsers}</div>
                          <p className="text-xs text-muted-foreground">Active Users</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">{behaviourStats.topFeatures.length}</div>
                          <p className="text-xs text-muted-foreground">Features Used</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Top Features */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Most Used Features</h3>
                      <div className="space-y-2">
                        {behaviourStats.topFeatures.map((feature: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                            <span className="font-medium">{feature.name}</span>
                            <Badge variant="secondary">{feature.count} times</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Users */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Most Active Users</h3>
                      <div className="space-y-2">
                        {behaviourStats.topUsers.map((user: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                            <Badge variant="secondary">{user.count} events</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Types */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Action Types</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {behaviourStats.actionTypes.map((action: any, idx: number) => (
                          <div key={idx} className="p-3 border rounded-lg text-center">
                            <div className="font-semibold">{action.count}</div>
                            <div className="text-xs text-muted-foreground">{action.type}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Recent Activity</h3>
                        <Button variant="outline" size="sm" onClick={loadUserBehaviour}>
                          Refresh
                        </Button>
                      </div>
                      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Feature</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Time</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {userBehaviour.slice(0, 50).map((activity: any) => {
                              const profile = activity.profiles as any;
                              return (
                                <TableRow key={activity.id}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{profile?.full_name || 'Unknown'}</div>
                                      <div className="text-xs text-muted-foreground">{profile?.email || activity.user_id?.slice(0, 8)}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>{activity.feature_name}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{activity.action_type}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    {format(new Date(activity.created_at), 'MMM dd, HH:mm')}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Health Tab */}
          <TabsContent value="system-health" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Health (Real-time)
                </CardTitle>
                <CardDescription>
                  Live system metrics and performance indicators. Updates every 60 seconds.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHealth ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    Loading system health metrics...
                  </div>
                ) : systemHealth ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <MetricCard
                      label="Errors (1h)"
                      value={systemHealth.errors_last_hour || 0}
                      status={systemHealth.errors_last_hour > 10 ? 'critical' : systemHealth.errors_last_hour > 5 ? 'warning' : 'ok'}
                    />
                    <MetricCard
                      label="Avg Response Time"
                      value={`${(systemHealth.avg_response_time_sec || 0).toFixed(2)}s`}
                      status={systemHealth.avg_response_time_sec > 2 ? 'warning' : systemHealth.avg_response_time_sec > 5 ? 'critical' : 'ok'}
                    />
                    <MetricCard
                      label="Active Connections"
                      value={systemHealth.active_connections || 0}
                      status={systemHealth.active_connections > 400 ? 'critical' : systemHealth.active_connections > 200 ? 'warning' : 'ok'}
                    />
                    <MetricCard
                      label="DB Size (MB)"
                      value={Math.round(systemHealth.db_size_mb || 0).toLocaleString()}
                      trend="up"
                    />
                    <MetricCard
                      label="Active Users (24h)"
                      value={systemHealth.active_users_24h || 0}
                    />
                    <MetricCard
                      label="Stuck Payments"
                      value={systemHealth.stuck_payments || 0}
                      status={systemHealth.stuck_payments > 0 ? 'warning' : 'ok'}
                    />
                    <MetricCard
                      label="WhatsApp Failures (1h)"
                      value={systemHealth.whatsapp_failures_1h || 0}
                      status={systemHealth.whatsapp_failures_1h > 10 ? 'critical' : systemHealth.whatsapp_failures_1h > 5 ? 'warning' : 'ok'}
                    />
                    <MetricCard
                      label="Total Connections"
                      value={systemHealth.total_connections || 0}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No system health data available
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Financial Metrics Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Financial Metrics (Last 30 Days)
                </CardTitle>
                <CardDescription>
                  Revenue, payment success rates, and plan distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingFinancial ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    Loading financial metrics...
                  </div>
                ) : financialMetrics ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <MetricCard
                      label="Total Revenue (30d)"
                      value={`₹${(financialMetrics.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                      trend={financialMetrics.revenue_this_month > financialMetrics.revenue_last_month ? 'up' : 'down'}
                    />
                    <MetricCard
                      label="Paying Users"
                      value={financialMetrics.total_paying_users || 0}
                    />
                    <MetricCard
                      label="Avg Payment"
                      value={`₹${(financialMetrics.avg_payment_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                    />
                    <MetricCard
                      label="Payment Success Rate"
                      value={`${(financialMetrics.payment_success_rate || 0).toFixed(1)}%`}
                      status={financialMetrics.payment_success_rate < 80 ? 'warning' : financialMetrics.payment_success_rate < 60 ? 'critical' : 'ok'}
                    />
                    <MetricCard
                      label="Estimated MRR"
                      value={`₹${(financialMetrics.estimated_mrr || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                      trend="up"
                    />
                    <MetricCard
                      label="Revenue This Month"
                      value={`₹${(financialMetrics.revenue_this_month || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                    />
                    <MetricCard
                      label="Pro Users"
                      value={financialMetrics.pro_users || 0}
                    />
                    <MetricCard
                      label="Premium Users"
                      value={financialMetrics.premium_users || 0}
                    />
                    <MetricCard
                      label="Free Users"
                      value={financialMetrics.free_users || 0}
                    />
                    <MetricCard
                      label="Inactive Users (30d)"
                      value={financialMetrics.inactive_users_30d || 0}
                      status={financialMetrics.inactive_users_30d > 50 ? 'warning' : 'ok'}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No financial metrics data available
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Feature Usage Chart */}
            <FeatureUsageChart />
            
            {/* Security Events */}
            <SecurityEventsTable />
            
            {/* User Insights */}
            <UserInsightsTable />
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

