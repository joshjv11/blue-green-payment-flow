import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { formatINRCompact } from '@/utils/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useNotifications } from '@/hooks/useNotifications';
import { useEmailReminders } from '@/hooks/useEmailReminders';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { LogOut, User, Building, Mail, FileText, ArrowRight, Plus, DollarSign, Calendar, AlertCircle, CheckCircle, Clock, BarChart3, Settings, Download, Upload, Crown, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { parseISO, differenceInDays, isBefore, isToday, isAfter, addDays, format } from 'date-fns';
// Dashboard component with bills management
import ExportImport from '@/components/ExportImport';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';
import { Navigation } from '@/components/Navigation';
import { usePaymentVerification } from '@/hooks/usePaymentVerification';
import FreemiumLimitCard from '@/components/FreemiumLimitCard';
import AIQueryCounter from '@/components/AIQueryCounter';
import EnhancedAIAssistantV2 from '@/components/EnhancedAIAssistantV2';
import PlanStatusCard from '@/components/PlanStatusCard';
import UpgradeTrigger from '@/components/UpgradeTrigger';
import UpgradeModal from '@/components/UpgradeModal';
import AddPasskeyBanner from '@/components/auth/AddPasskeyBanner';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useLoadingWatchdog } from '@/hooks/useLoadingWatchdog';
import { cancelAllQueries, refetchAllQueries } from '@/lib/query';
import { usePlan } from '@/contexts/PlanContext';
import { cn } from '@/lib/utils';

interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  recurring: boolean;
  status: 'unpaid' | 'paid' | 'overdue';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const { user, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { track } = useAnalytics();
  const { plan: contextPlan } = usePlan();
  const isPro = contextPlan === 'pro';
  const { plan, aiQueriesUsed, aiQueriesLimit, loading: planLoading } = useSupabasePlan();
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [localBills, setLocalBills] = useLocalStorage<Bill[]>(`bills_${user?.id}`, []);
  const [showExportImport, setShowExportImport] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPasskeyBanner, setShowPasskeyBanner] = useState(false);
  const { billLimit, canAddBill, canMakeAIQuery, getAIQueriesRemaining } = useSupabasePlan();
  
  // Initialize notifications, email reminders, and payment verification
  useNotifications();
  useEmailReminders();
  usePaymentVerification();

  // Loading watchdog to detect stuck states
  useLoadingWatchdog({
    enabled: true,
    onTimeout: () => {
      console.warn('⚠️ Loading timeout in Dashboard page');
    }
  });

  const handleRetryAll = async () => {
    try {
      await cancelAllQueries();
      await refetchAllQueries();
      await fetchProfile();
      await fetchBills();
      toast({
        title: 'Refreshed',
        description: 'Dashboard data has been reloaded',
      });
    } catch (error) {
      toast({
        title: 'Retry failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchBills();
      
      // Check if we should show the passkey banner
      const checkPasskeySupport = async () => {
        if (window.PublicKeyCredential && 
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable() &&
            !localStorage.getItem('invoiceflow_has_passkey') &&
            !localStorage.getItem('invoiceflow_passkey_banner_dismissed')) {
          setShowPasskeyBanner(true);
        }
      };

      checkPasskeySupport();
      track('dashboard_viewed', { user_id: user?.id });
    }
  }, [user, track]);

  const fetchProfile = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user!.id)
          .single();

        if (error) throw error;

        setProfile(data);
        setFullName(data.full_name || '');
        setCompany(data.company || '');
      } else {
        // localStorage mode - get user data from the user object
        const userData = {
          id: user!.id,
          email: user!.email,
          full_name: (user as any).full_name || null,
          company: (user as any).company || null,
        };
        setProfile(userData);
        setFullName(userData.full_name || '');
        setCompany(userData.company || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchBills = async () => {
    try {
      setBillsLoading(true);

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('bills')
          .select('*')
          .eq('user_id', user!.id)
          .order('due_date', { ascending: true });

        if (error) throw error;

        // Auto-update overdue bills
        const updatedBills = data.map(bill => {
          const today = new Date();
          const dueDate = parseISO(bill.due_date);
          
          if (bill.status === 'unpaid' && isBefore(dueDate, today)) {
            return { ...bill, status: 'overdue' as const };
          }
          return bill;
        });

        setBills(updatedBills);
      } else {
        // localStorage mode
        const updatedBills = localBills.map(bill => {
          const today = new Date();
          const dueDate = parseISO(bill.due_date);
          
          if (bill.status === 'unpaid' && isBefore(dueDate, today)) {
            return { ...bill, status: 'overdue' as const };
          }
          return bill;
        });

        setBills(updatedBills);
        
        // Update overdue bills in localStorage
        const hasOverdueChanges = updatedBills.some((bill, index) => 
          bill.status !== localBills[index]?.status
        );
        
        if (hasOverdueChanges) {
          setLocalBills(updatedBills);
        }
      }
    } catch (error: any) {
      console.error('Error fetching bills:', error);
    } finally {
      setBillsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      await updateProfile(fullName, company);
      await fetchProfile();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBillStatus = async (bill: Bill) => {
    const newStatus = bill.status === 'paid' ? 'unpaid' : 'paid';
    
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('bills')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', bill.id);

        if (error) throw error;
      } else {
        // localStorage mode
        const updatedBills = localBills.map(b =>
          b.id === bill.id ? { ...b, status: newStatus as 'unpaid' | 'paid' | 'overdue', updated_at: new Date().toISOString() } : b
        );
        setLocalBills(updatedBills);
      }

      toast({
        title: `Bill marked as ${newStatus}!`,
      });
      await fetchBills();
    } catch (error: any) {
      toast({
        title: "Error updating bill status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleImportBills = async (importedBills: Partial<Bill>[]) => {
    try {
      const billsToImport = importedBills.map(bill => ({
        ...bill,
        id: bill.id || crypto.randomUUID(),
        user_id: user!.id,
        created_at: bill.created_at || new Date().toISOString(),
        updated_at: bill.updated_at || new Date().toISOString(),
      })) as Bill[];

      if (isSupabaseConfigured && supabase) {
        // For Supabase, insert the bills
        const { error } = await supabase
          .from('bills')
          .insert(billsToImport);

        if (error) throw error;
      } else {
        // For localStorage, merge with existing bills
        const existingIds = new Set(localBills.map(b => b.id));
        const newBills = billsToImport.filter(b => !existingIds.has(b.id));
        setLocalBills([...localBills, ...newBills]);
      }

      await fetchBills();
      toast({
        title: "Bills imported successfully!",
        description: `Added ${billsToImport.length} bills to your account.`,
      });
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Calculate statistics
  const activeBills = bills.filter(bill => bill.status !== 'paid');
  const overdueBills = bills.filter(bill => bill.status === 'overdue');
  const billsDueIn7Days = bills.filter(bill => {
    const dueDate = parseISO(bill.due_date);
    const today = new Date();
    const daysUntilDue = differenceInDays(dueDate, today);
    return bill.status === 'unpaid' && daysUntilDue >= 0 && daysUntilDue <= 7;
  });
  const paidBills = bills.filter(bill => bill.status === 'paid');
  const billsDueToday = bills.filter(bill => {
    const dueDate = parseISO(bill.due_date);
    return bill.status === 'unpaid' && isToday(dueDate);
  });

  const getBillStatusColor = (bill: Bill) => {
    if (bill.status === 'paid') return 'bg-green-100 text-green-800 border-green-200';
    if (bill.status === 'overdue') return 'bg-red-100 text-red-800 border-red-200';
    
    const daysUntilDue = differenceInDays(parseISO(bill.due_date), new Date());
    if (daysUntilDue <= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const handlePasskeyBannerDismiss = () => {
    setShowPasskeyBanner(false);
    localStorage.setItem('invoiceflow_passkey_banner_dismissed', 'true');
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      {/* Main Content */}
      <main className="container mx-auto px-3 py-4 md:px-4 md:py-6">
        <div className="max-w-6xl mx-auto space-y-3 md:space-y-4">
          {/* Passkey Banner */}
          {showPasskeyBanner && (
            <AddPasskeyBanner onDismiss={handlePasskeyBannerDismiss} />
          )}

          {/* Profile & Plan Section - Mobile First */}
          <Card className={cn(
            "transition-all duration-300",
            isPro && "glass-pro border-[hsl(45,100%,60%)]/30 shadow-pro-strong shimmer"
          )}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h1 className={cn(
                    "text-lg md:text-xl font-bold truncate transition-colors duration-300",
                    isPro ? "pro-gradient-text" : "text-foreground"
                  )}>
                    {profile?.full_name || user?.email?.split('@')[0] || 'Welcome'}
                  </h1>
                  <p className={cn(
                    "text-xs md:text-sm truncate transition-colors duration-300",
                    isPro ? "text-foreground/90" : "text-muted-foreground"
                  )}>
                    {user?.email}
                  </p>
                  {profile?.company && (
                    <p className={cn(
                      "text-xs mt-0.5 transition-colors duration-300",
                      isPro ? "text-foreground/70" : "text-muted-foreground"
                    )}>
                      {profile.company}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRetryAll}
                  disabled={loading || billsLoading}
                  className={cn(
                    "shrink-0 transition-colors duration-300",
                    isPro && "hover:bg-[hsl(45,100%,60%)]/10"
                  )}
                >
                  <RefreshCw className={`h-4 w-4 ${(loading || billsLoading) ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              {/* Plan Status Inline */}
              <PlanStatusCard 
                compact={true}
                onUpgrade={() => setShowUpgradeModal(true)}
              />
            </CardContent>
          </Card>

          {/* Bill Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            <Card className={cn(
              "transition-all duration-300",
              isPro && "glass-pro border-[hsl(45,100%,60%)]/20 hover:shadow-pro-glow"
            )}>
              <CardContent className="p-3 md:p-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <FileText className={cn(
                      "h-4 w-4 transition-colors duration-300",
                      isPro ? "text-[hsl(45,100%,60%)]" : "text-primary"
                    )} />
                    <span className="text-xs text-muted-foreground">Active</span>
                  </div>
                  <div className={cn(
                    "text-xl md:text-2xl font-bold transition-colors duration-300",
                    isPro ? "pro-gradient-text" : "text-foreground"
                  )}>
                    {activeBills.length}
                  </div>
                  {plan === 'free' && (
                    <div className="text-xs text-muted-foreground">
                      {bills.length}/{billLimit} bills
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className={cn(
              "transition-all duration-300",
              isPro && "glass-pro border-[hsl(45,100%,60%)]/20 hover:shadow-pro-glow"
            )}>
              <CardContent className="p-3 md:p-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-xs text-muted-foreground">Overdue</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-destructive">{overdueBills.length}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card className={cn(
              "transition-all duration-300",
              isPro && "glass-pro border-[hsl(45,100%,60%)]/20 hover:shadow-pro-glow"
            )}>
              <CardContent className="p-3 md:p-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs text-muted-foreground">Due Soon</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-yellow-600">{billsDueIn7Days.length}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card className={cn(
              "transition-all duration-300",
              isPro && "glass-pro border-[hsl(45,100%,60%)]/20 hover:shadow-pro-glow"
            )}>
              <CardContent className="p-3 md:p-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">Paid</span>
                  </div>
                  <div className="text-xl md:text-2xl font-bold text-green-600">{paidBills.length}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Plan Limit Warnings */}
          <div className="space-y-2">
            <FreemiumLimitCard
              type="bills"
              currentCount={bills.length}
              onUpgrade={() => setShowUpgradeModal(true)}
            />
            <FreemiumLimitCard
              type="ai"
              currentCount={aiQueriesUsed}
              onUpgrade={() => setShowUpgradeModal(true)}
            />
          </div>

          {/* Bills Due Today */}
          {billsDueToday.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-yellow-800 text-base">
                  <Calendar className="h-4 w-4" />
                  <span>Due Today ({billsDueToday.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {billsDueToday.map((bill) => (
                  <div key={bill.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-[10px] border border-yellow-100">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">{bill.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatINRCompact(bill.amount)} • {bill.category.charAt(0).toUpperCase() + bill.category.slice(1)}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => toggleBillStatus(bill)}
                      className="w-full sm:w-auto shrink-0"
                    >
                      Mark as Paid
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className={cn(
            "transition-all duration-300",
            isPro && "glass-pro border-[hsl(45,100%,60%)]/20"
          )}>
            <CardHeader className="pb-3">
              <CardTitle className={cn(
                "text-base transition-colors duration-300",
                isPro && "pro-gradient-text"
              )}>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
              <Button 
                onClick={() => {
                  if (!canAddBill(bills.length)) {
                    setShowUpgradeModal(true);
                  } else {
                    navigate('/bills');
                  }
                }}
                className={cn(
                  "h-auto p-3 justify-start transition-all duration-300",
                  isPro && "glass-pro hover:border-[hsl(45,100%,60%)]/40 hover:shadow-pro-glow"
                )}
                variant="outline"
              >
                <div className="flex items-center gap-2.5 w-full">
                  <Plus className={cn(
                    "h-5 w-5 shrink-0 transition-colors duration-300",
                    isPro ? "text-[hsl(45,100%,60%)]" : "text-primary"
                  )} />
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      Add New Bill
                      {!canAddBill(bills.length) && (
                        <Crown className="h-3 w-3 text-yellow-500 shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {canAddBill(bills.length) 
                        ? 'Create a new bill entry'
                        : 'Upgrade for unlimited'
                      }
                    </div>
                  </div>
                </div>
              </Button>
              
              <Button 
                onClick={() => navigate('/bills')}
                className="h-auto p-3 justify-start"
                variant="outline"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm">Manage Bills</div>
                    <div className="text-xs text-muted-foreground">View and edit all</div>
                  </div>
                </div>
              </Button>
              
              <Button 
                onClick={() => navigate('/analytics')}
                className="h-auto p-3 justify-start"
                variant="outline"
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="h-5 w-5 text-primary shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      Analytics
                      {plan === 'free' && (
                        <Crown className="h-3 w-3 text-yellow-500 shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {plan === 'pro' ? 'Financial insights' : 'Basic analytics'}
                    </div>
                  </div>
                </div>
              </Button>
              
              <Button 
                onClick={() => navigate('/settings')}
                className="h-auto p-3 justify-start"
                variant="outline"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="h-5 w-5 text-primary shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm">Settings</div>
                    <div className="text-xs text-muted-foreground">Manage preferences</div>
                  </div>
                </div>
              </Button>

              <Button 
                onClick={() => setShowExportImport(true)}
                className="h-auto p-3 justify-start sm:col-span-2"
                variant="outline"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="h-5 w-5 text-primary shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm">Export/Import</div>
                    <div className="text-xs text-muted-foreground">Backup or import data</div>
                  </div>
                </div>
              </Button>
              
              {/* Always show upgrade option for free users */}
              {plan === 'free' && (
                <UpgradeTrigger 
                  className="h-auto p-3 justify-start sm:col-span-2"
                  variant="default"
                  trigger="general"
                >
                  <div className="flex items-center gap-2.5">
                    <Crown className="h-5 w-5 text-white shrink-0" />
                    <div className="text-left flex-1">
                      <div className="font-medium text-sm text-white">Upgrade to Pro</div>
                      <div className="text-xs text-white/90">₹99/mo • Unlimited bills & AI</div>
                    </div>
                  </div>
                </UpgradeTrigger>
              )}
            </CardContent>
          </Card>

          {/* Recent Bills Table */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Recent Bills</CardTitle>
            </CardHeader>
            <CardContent>
              {billsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                      <Skeleton className="h-8 flex-1" />
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-32" />
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))}
                </div>
              ) : bills.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No bills yet</h3>
                  <p className="text-muted-foreground mb-4">Get started by adding your first bill</p>
                  <Button onClick={() => navigate('/bills')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Bill
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-full inline-block align-middle">
                    <Table className="min-w-[600px] sm:min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Bill Name</TableHead>
                          <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                          <TableHead className="text-xs sm:text-sm">Due Date</TableHead>
                          <TableHead className="text-xs sm:text-sm">Status</TableHead>
                          <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bills.slice(0, 5).map((bill) => (
                          <TableRow key={bill.id}>
                            <TableCell className="font-medium text-xs sm:text-sm">{bill.name}</TableCell>
                            <TableCell className="text-xs sm:text-sm">{formatINRCompact(bill.amount)}</TableCell>
                            <TableCell className="text-xs sm:text-sm">{format(parseISO(bill.due_date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <Badge className={`${getBillStatusColor(bill)} text-xs`}>
                                {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => toggleBillStatus(bill)}
                                disabled={bill.status === 'paid'}
                                className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                              >
                                {bill.status === 'paid' ? 'Paid' : 'Mark Paid'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {bills.length > 5 && (
                      <div className="text-center mt-4">
                        <Button variant="outline" onClick={() => navigate('/bills')}>
                          View All Bills
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export/Import Section */}
          {showExportImport && (
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Export/Import Bills</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowExportImport(false)}
                  >
                    ✕
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ExportImport 
                  bills={bills} 
                  onImportBills={handleImportBills}
                  userId={user!.id}
                />
              </CardContent>
            </Card>
          )}

          {/* Upgrade Modal */}
          <UpgradeModal 
            open={showUpgradeModal}
            onOpenChange={setShowUpgradeModal}
            currentBillCount={bills.length}
          />

          {/* Profile Card */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <span>Profile Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEditing ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="font-medium">{user?.email}</span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Full Name:</span>
                    <span className="font-medium">{profile?.full_name || 'Not set'}</span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Company:</span>
                    <span className="font-medium">{profile?.company || 'Not set'}</span>
                  </div>
                  
                  <Button onClick={() => setIsEditing(true)} className="mt-4">
                    Edit Profile
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Enter your company name"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button onClick={handleUpdateProfile} disabled={loading}>
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false);
                        setFullName(profile?.full_name || '');
                        setCompany(profile?.company || '');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>

      <EnhancedAIAssistantV2 
        bills={bills}
        context="dashboard - managing bills and getting financial insights"
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        currentBillCount={bills.length}
        aiQueriesUsed={aiQueriesUsed}
        aiQueriesLimit={aiQueriesLimit}
        trigger="general"
      />
    </div>
  );
};

export default Dashboard;