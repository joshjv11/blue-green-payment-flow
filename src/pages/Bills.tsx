import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
// Bills data loaded via invoices API
import { trackFeatureUsage } from '@/lib/analytics';
import SmartBillForm from '@/components/SmartBillForm';
import ReminderSettingsModal from '@/components/ReminderSettingsModal';
import { generateGoogleCalendarUrl, downloadICSFile } from '@/utils/calendar';
import { 
  Plus, 
  Edit, 
  Trash2, 
  ArrowUpDown, 
  LogOut, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  Crown, 
  Bell, 
  CalendarPlus,
  Download,
  Clock,
  RefreshCw,
  FileText,
  Loader2
} from 'lucide-react';
import { format, parseISO, differenceInDays, isAfter, isBefore, addDays } from 'date-fns';
import { useAppPlan } from '@/hooks/useAppPlan';
import UpgradeModal from '@/components/UpgradeModal';
import FreemiumLimitCard from '@/components/FreemiumLimitCard';
import BillLimitBanner from '@/components/BillLimitBanner';
import { usePaymentVerification } from '@/hooks/usePaymentVerification';
import { BackToDashboard } from '@/components/BackToDashboard';
import PlanStatusCard from '@/components/PlanStatusCard';
import UpgradeTrigger from '@/components/UpgradeTrigger';
import { useIsMobile } from '@/hooks/use-mobile';
import { BillReminderSettings } from '@/components/BillReminderSettings';
import { formatINRCompact } from '@/utils/currency';
import { MessageCircle } from 'lucide-react';
import { logError, logInfo } from '@/lib/logger';
import { useLoadingWatchdog } from '@/hooks/useLoadingWatchdog';
import { cancelAllQueries, refetchAllQueries } from '@/lib/query';
import * as invoicesApi from '@/lib/endpoints/invoices';
import * as customersApi from '@/lib/endpoints/customers';
import type { Invoice } from '@/lib/endpoints/invoices';

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
  auto_reminder_enabled?: boolean;
  reminder_days_before?: number;
}

interface BillFormData {
  name: string;
  amount: string;
  due_date: string;
  category: string;
  recurring: boolean;
  status: 'unpaid' | 'paid' | 'overdue';
  notes: string;
  email_reminder: boolean;
  reminder_days: number;
}

const initialFormData: BillFormData = {
  name: '',
  amount: '',
  due_date: '',
  category: 'utilities',
  recurring: false,
  status: 'unpaid',
  notes: '',
  email_reminder: true,
  reminder_days: 1,
};

const categories = [
  'utilities',
  'rent', 
  'insurance',
  'subscription',
  'loan',
  'credit_card',
  'other'
];

function mapInvoiceStatus(status: string, dueDate: string): Bill['status'] {
  if (status === 'paid') return 'paid';
  const due = dueDate ? new Date(dueDate) : null;
  if (due && due < new Date() && status !== 'paid') return 'overdue';
  return 'unpaid';
}

function invoiceToBill(inv: Invoice, userId: string): Bill {
  return {
    id: inv.id,
    user_id: userId,
    name: inv.customername || inv.invoicenumber || 'Invoice',
    amount: Number(inv.amount || 0),
    due_date: inv.duedate || inv.issuedate || new Date().toISOString().slice(0, 10),
    category: 'other',
    recurring: false,
    status: mapInvoiceStatus(inv.status, inv.duedate),
    notes: null,
    created_at: inv.createdat || new Date().toISOString(),
    updated_at: inv.updatedat || new Date().toISOString(),
    auto_reminder_enabled: false,
    reminder_days_before: 1,
  };
}

async function ensureCustomer(name: string): Promise<string> {
  const customers = await customersApi.listCustomers(name);
  const existing = customers.find((c) => c.name === name);
  if (existing) return existing.id;
  const created = await customersApi.createCustomer({ name });
  return created.id;
}

function billStatusToInvoice(status: Bill['status']): string {
  if (status === 'paid') return 'paid';
  if (status === 'overdue') return 'sent';
  return 'draft';
}

const Bills = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<BillFormData>(initialFormData);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<keyof Bill>('due_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [submitting, setSubmitting] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [reminderModalBill, setReminderModalBill] = useState<Bill | null>(null);
  const isMobile = useIsMobile();
  
  const planData = useAppPlan();
  const { plan, billLimit, canAddBill, loading: planLoading, aiQueriesUsed, aiQueriesLimit } = planData;
  const isPro = plan === 'pro' || plan === 'premium';
  
  // Payment verification moved to App.tsx to prevent duplicate calls

  // Loading watchdog to detect stuck states
  useLoadingWatchdog({
    enabled: true,
    onTimeout: () => {
      console.warn('⚠️ Loading timeout in Bills page');
    }
  });

  const handleRetryAll = async () => {
    try {
      await cancelAllQueries();
      await refetchAllQueries();
      await fetchBills();
      toast({
        title: 'Refreshed',
        description: 'All data has been reloaded',
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
      // Track bills page view
      trackFeatureUsage('bills', 'view');
      fetchBills();

      // PostgREST has no realtime WebSocket support; mutations refresh state directly.
    }
  }, [user]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const invoices = await invoicesApi.listInvoices();
      const billsData = invoices.map((inv) => invoiceToBill(inv, user!.id));
      setBills(billsData);
      console.log(`✅ Loaded ${billsData.length} bills successfully`);
    } catch (error: any) {
      console.error('❌ Error in fetchBills:', error);
      toast({
        title: "Failed to load bills",
        description: error.message || "Unable to fetch your bills. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitting) return; // Prevent double submission
    
    setSubmitting(true);
    console.log('💾 Submitting bill form:', { name: formData.name, amount: formData.amount, editing: !!editingBill });
    
    // Enhanced validation
    if (!formData.name.trim()) {
      toast({
        title: "Missing Bill Name",
        description: "Please enter a name for your bill",
        variant: "destructive",
      });
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!formData.due_date) {
      toast({
        title: "Missing Due Date",
        description: "Please select a due date for your bill",
        variant: "destructive",
      });
      return;
    }

    // Check bill limit for new bills (not edits)
    if (!editingBill && !canAddBill(bills.length)) {
      console.log('🚫 Bill limit reached, showing upgrade modal');
      setShowUpgradeModal(true);
      setSubmitting(false);
      return;
    }

    try {
      const billData = {
        id: editingBill ? editingBill.id : crypto.randomUUID(),
        user_id: user!.id,
        name: formData.name.trim(),
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        category: formData.category,
        recurring: formData.recurring,
        status: formData.status,
        notes: formData.notes?.trim() || null,
        reminder_days_before: formData.reminder_days || 1,
        auto_reminder_enabled: formData.email_reminder,
        created_at: editingBill ? editingBill.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log(`💾 ${editingBill ? 'Updating' : 'Creating'} bill:`, billData);

      if (editingBill) {
        await invoicesApi.updateInvoice(editingBill.id, {
          amount: billData.amount,
          duedate: billData.due_date,
          status: billStatusToInvoice(billData.status),
        });
        trackFeatureUsage('Bills', 'submit', { action: 'update' });
        toast({
          title: "✅ Bill Updated Successfully!",
          description: `${billData.name} has been updated`,
          duration: 4000,
        });
      } else {
        const customerId = await ensureCustomer(billData.name);
        const inv = await invoicesApi.createInvoice({
          customerid: customerId,
          invoicenumber: `BILL-${Date.now()}`,
          issuedate: new Date().toISOString().slice(0, 10),
          duedate: billData.due_date,
          amount: billData.amount,
          status: billStatusToInvoice(billData.status),
        });
        trackFeatureUsage('bills', 'create', {
          category: billData.category,
          amount: billData.amount,
        });
        if (billData.auto_reminder_enabled && billData.due_date) {
          console.warn('Reminder scheduling not migrated');
          toast({
            title: "Bill Added",
            description: "Bill saved. Reminder scheduling is not available yet.",
          });
        } else {
          toast({
            title: "✅ Bill Added Successfully!",
            description: `${billData.name} added to your bills list`,
            duration: 4000,
          });
        }
        void inv;
      }

      console.log(`✅ Bill ${editingBill ? 'updated' : 'created'} successfully`);

      // Reset form and close dialog
      setFormData(initialFormData);
      setEditingBill(null);
      setIsDialogOpen(false);
      
      // Refresh bills list
      await fetchBills();
      
    } catch (error: any) {
      console.error('❌ Error in handleSubmit:', error);
      
      // Log error for debugging
      await logError(error, 'Bills', 'add_bill_submit', {
        billName: formData.name,
        amount: formData.amount,
        editing: !!editingBill,
      });
      
      // Show user-friendly error message
      const errorMessage = error.message || "Something went wrong. Please try again.";
      
      toast({
        title: "Failed to Save Bill",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingBill(null);
    setIsDialogOpen(false);
  };

  const editBill = (bill: Bill) => {
    setFormData({
      name: bill.name,
      amount: bill.amount.toString(),
      due_date: bill.due_date,
      category: bill.category,
      recurring: bill.recurring,
      status: bill.status,
      notes: bill.notes || '',
      email_reminder: bill.auto_reminder_enabled ?? true,
      reminder_days: bill.reminder_days_before || 1,
    });
    setEditingBill(bill);
    setIsDialogOpen(true);
  };

  const deleteBill = async (billId: string) => {
    try {
      console.log('🗑️ Deleting bill:', billId);
      
      await invoicesApi.deleteInvoice(billId);
      
      // Track bill deletion
      trackFeatureUsage('Bills', 'click', { action: 'delete' });
      
      toast({
        title: "✅ Bill Deleted Successfully!",
        description: "The bill has been removed from your list",
        duration: 4000,
      });
      
      console.log('✅ Bill deleted successfully');
      await fetchBills();
      
    } catch (error: any) {
      console.error('❌ Error in deleteBill:', error);
      
      toast({
        title: "Failed to Delete Bill",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getBillStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'overdue':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const [schedulingReminder, setSchedulingReminder] = useState<string | null>(null);

  const handleScheduleWhatsAppReminder = async (billId: string) => {
    setSchedulingReminder(billId);
    try {
      console.warn('WhatsApp reminder scheduling not migrated');
      toast({
        title: 'Reminders not available',
        description: 'Bill reminder scheduling has not been migrated yet.',
        variant: 'destructive',
      });
    } catch (error: any) {
      toast({
        title: "Scheduling Failed",
        description: error.message || "Failed to schedule WhatsApp reminders",
        variant: "destructive",
      });
    } finally {
      setSchedulingReminder(null);
    }
  };

  const BillCard = ({ bill }: { bill: Bill }) => {
    const dueDate = new Date(bill.due_date);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const getUrgencyColor = () => {
      if (daysUntilDue <= 0) return 'text-red-600 dark:text-red-400';
      if (daysUntilDue <= 1) return 'text-orange-600 dark:text-orange-400';
      if (daysUntilDue <= 7) return 'text-yellow-600 dark:text-yellow-400';
      return 'text-blue-600 dark:text-blue-400';
    };

    return (
      <Card className="p-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground truncate">{bill.name}</h3>
            <p className="text-xs text-muted-foreground capitalize">{bill.category}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={getBillStatusColor(bill.status)} className="text-xs">
              {bill.status}
            </Badge>
            {daysUntilDue <= 7 && (
              <div className={`text-xs ${getUrgencyColor()} flex items-center gap-0.5`}>
                <Clock className="h-3 w-3" />
                {daysUntilDue <= 0 ? 'Overdue' : `${daysUntilDue}d left`}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{formatINRCompact(bill.amount)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs">{format(parseISO(bill.due_date), 'MMM dd, yyyy')}</span>
          </div>
        </div>

        {bill.notes && (
          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-[8px] border border-border/50">
            {bill.notes}
          </p>
        )}

        {/* Action Buttons - Improved Spacing */}
        <div className="pt-1 space-y-1.5 border-t border-border/50">
          <div className="grid grid-cols-2 gap-1.5">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => editBill(bill)}
              className="h-9 text-xs"
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setReminderModalBill(bill)}
              className="h-9 text-xs"
            >
              <Bell className="h-3 w-3 mr-1" />
              Remind
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-1.5">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.open(generateGoogleCalendarUrl(bill), '_blank')}
              className="h-9 text-xs"
            >
              <CalendarPlus className="h-3 w-3 mr-1" />
              Calendar
            </Button>
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={() => deleteBill(bill.id)}
              className="h-9 text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="shadow-soft">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="container mx-auto px-3 py-4 md:px-4 md:py-6">
        <div className="max-w-6xl mx-auto space-y-3 md:space-y-4">
          <BackToDashboard />
          
          {/* Sticky Header */}
          <div className="sticky top-[73px] md:top-[73px] z-40 bg-background/95 backdrop-blur-sm -mx-3 px-3 md:-mx-4 md:px-4 py-3 border-b">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-foreground">Bills</h1>
                <p className="text-xs text-muted-foreground truncate">
                  {bills.length} {bills.length === 1 ? 'bill' : 'bills'}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRetryAll}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm"
                      disabled={!canAddBill(bills.length) && !editingBill}
                      onClick={() => {
                        if (!canAddBill(bills.length) && !editingBill) {
                          setShowUpgradeModal(true);
                        } else {
                          resetForm();
                        }
                      }}
                      className="min-h-[48px] min-w-[48px]"
                      data-tour="add-bill"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1.5">Add</span>
                      {!canAddBill(bills.length) && (
                        <Crown className="h-3 w-3 ml-1 text-yellow-500" />
                      )}
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-2xl mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-base md:text-lg">
                      {editingBill ? 'Edit Bill' : 'Add New Bill'}
                    </DialogTitle>
                  </DialogHeader>
                  
                    <SmartBillForm
                      formData={formData}
                      setFormData={setFormData}
                      onSubmit={handleSubmit}
                      editingBill={editingBill}
                      submitting={submitting}
                    />
                </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Limit Warnings - Compact */}
          <div className="space-y-2">
            <FreemiumLimitCard
              type="bills"
              currentCount={bills.length}
              onUpgrade={() => setShowUpgradeModal(true)}
            />
          </div>

          {/* Bills List */}
          {bills.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <h3 className="text-base md:text-lg font-semibold mb-1.5">No bills yet</h3>
                <p className="text-xs md:text-sm text-muted-foreground mb-4">
                  Add your first bill to get started
                </p>
                <Button onClick={() => setIsDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add First Bill
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">All Bills</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Mobile Cards View */}
                {isMobile ? (
                  <div className="space-y-2">
                    {bills.map((bill) => (
                      <BillCard key={bill.id} bill={bill} />
                    ))}
                  </div>
                ) : (
                  /* Desktop Table View */
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bills.map((bill) => (
                            <TableRow key={bill.id}>
                              <TableCell className="font-medium">{bill.name}</TableCell>
                              <TableCell>{formatINRCompact(bill.amount)}</TableCell>
                              <TableCell>{format(parseISO(bill.due_date), 'MMM dd, yyyy')}</TableCell>
                              <TableCell className="capitalize">{bill.category}</TableCell>
                              <TableCell>
                                <Badge variant={getBillStatusColor(bill.status)}>
                                  {bill.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => editBill(bill)}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                  {isPro && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleScheduleWhatsAppReminder(bill.id)}
                                      disabled={schedulingReminder === bill.id}
                                      title="Schedule WhatsApp Reminder"
                                    >
                                      {schedulingReminder === bill.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <MessageCircle className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setReminderModalBill(bill)}
                                  >
                                    <Bell className="h-4 w-4 mr-1" />
                                    Remind
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => window.open(generateGoogleCalendarUrl(bill), '_blank')}
                                  >
                                    <CalendarPlus className="h-4 w-4 mr-1" />
                                    Calendar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => deleteBill(bill.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}

          {/* Modals & Components */}
          <UpgradeModal
            open={showUpgradeModal}
            onOpenChange={setShowUpgradeModal}
            currentBillCount={bills.length}
            aiQueriesUsed={aiQueriesUsed}
            aiQueriesLimit={aiQueriesLimit}
            trigger="bills"
          />

          <ReminderSettingsModal
            bill={reminderModalBill}
            isOpen={!!reminderModalBill}
            onClose={() => setReminderModalBill(null)}
            onReminderScheduled={() => {
              toast({
                title: "Reminder Scheduled",
                description: "Your bill reminder has been set up successfully",
              });
            }}
          />

        </div>
      </main>
    </div>
  );
};

export default Bills;