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
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
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
  Clock
} from 'lucide-react';
import { format, parseISO, differenceInDays, isAfter, isBefore, addDays } from 'date-fns';
import { useSupabasePlan } from '@/hooks/useSupabasePlan';
import UpgradeModal from '@/components/UpgradeModal';
import FreemiumLimitCard from '@/components/FreemiumLimitCard';
import BillLimitBanner from '@/components/BillLimitBanner';
import EnhancedAIAssistantV2 from '@/components/EnhancedAIAssistantV2';
import { usePaymentVerification } from '@/hooks/usePaymentVerification';
import { Navigation } from '@/components/Navigation';
import PlanStatusCard from '@/components/PlanStatusCard';
import UpgradeTrigger from '@/components/UpgradeTrigger';
import { useIsMobile } from '@/hooks/use-mobile';
import BillReminderManager from '@/components/BillReminderManager';
import { formatINRCompact } from '@/utils/currency';
import { logError, logInfo } from '@/lib/logger';

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
  const [localBills, setLocalBills] = useLocalStorage<Bill[]>(`bills_${user?.id}`, []);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [reminderModalBill, setReminderModalBill] = useState<Bill | null>(null);
  const isMobile = useIsMobile();
  
  const { plan, billLimit, canAddBill, loading: planLoading, aiQueriesUsed, aiQueriesLimit } = useSupabasePlan();
  
  // Initialize payment verification
  usePaymentVerification();

  useEffect(() => {
    if (user) {
      fetchBills();
    }
  }, [user]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('bills')
          .select('*')
          .eq('user_id', user!.id)
          .order('due_date', { ascending: true });

        if (error) {
          console.error('🔴 Bills fetch error:', error);
          
          // Handle specific Supabase errors
          if (error.code === 'PGRST116') {
            throw new Error('No bills found. Start by adding your first bill!');
          } else if (error.code === '42501') {
            throw new Error('Permission denied. Please log in again.');
          } else if (error.message.includes('network')) {
            throw new Error('Network error. Please check your connection and try again.');
          } else {
            throw new Error(`Database error: ${error.message}`);
          }
        }
        
        setBills(data || []);
        console.log(`✅ Loaded ${data?.length || 0} bills successfully`);
      } else {
        setBills(localBills);
        console.log(`📱 Loaded ${localBills.length} bills from local storage`);
      }
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

      if (isSupabaseConfigured && supabase) {
        if (editingBill) {
          const { error } = await supabase
            .from('bills')
            .update(billData)
            .eq('id', editingBill.id);
          
          if (error) {
            console.error('🔴 Bill update error:', error);
            
            if (error.code === '42501') {
              throw new Error('Permission denied. This bill may belong to another user.');
            } else if (error.code === 'PGRST116') {
              throw new Error('Bill not found. It may have been deleted.');
            } else {
              throw new Error(`Failed to update bill: ${error.message}`);
            }
          }
        } else {
          const { data: insertedBill, error } = await supabase
            .from('bills')
            .insert([billData])
            .select()
            .single();
          
          if (error) {
            console.error('🔴 Bill creation error:', error);
            
            if (error.code === '23505') {
              throw new Error('A bill with this information already exists.');
            } else if (error.code === '42501') {
              throw new Error('Permission denied. Please log in again.');
            } else {
              throw new Error(`Failed to create bill: ${error.message}`);
            }
          }

          // Auto-schedule reminder for new bills
          if (insertedBill && billData.auto_reminder_enabled && billData.due_date) {
            try {
              console.log('🔔 Auto-scheduling reminder for new bill:', insertedBill.name);
              
              const { error: reminderError } = await supabase.functions.invoke('schedule-individual-reminder', {
                body: {
                  bill_id: insertedBill.id,
                  reminder_days_before: billData.reminder_days_before || 1
                }
              });

              if (reminderError) {
                console.error('❌ Failed to auto-schedule reminder:', reminderError);
                // Don't throw error here - bill creation succeeded
                toast({
                  title: "Bill Added",
                  description: "Bill saved, but reminder scheduling failed. You can set it up manually.",
                  variant: "destructive",
                });
              } else {
                console.log('✅ Auto-reminder scheduled successfully');
                toast({
                  title: "Bill Added with Reminder!",
                  description: `${billData.name} saved and reminder scheduled for ${billData.reminder_days_before} day(s) before due date`,
                });
              }
            } catch (reminderError: any) {
              console.error('❌ Auto-reminder scheduling error:', reminderError);
              // Don't throw error here - bill creation succeeded
            }
          } else if (!editingBill) {
            toast({
              title: "✅ Bill Added!",
              description: `${billData.name} added to your bills list`,
            });
          }
        }
      } else {
        // Local storage fallback
        if (editingBill) {
          const updatedBills = localBills.map(bill =>
            bill.id === editingBill.id ? billData : bill
          );
          setLocalBills(updatedBills);
        } else {
          setLocalBills([...localBills, billData]);
        }
      }

      // Only show success toast for edits (new bills handle their own toasts above)
      if (editingBill) {
        toast({
          title: "✅ Bill Updated!",
          description: `${billData.name} has been updated successfully`,
        });
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
      
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('bills')
          .delete()
          .eq('id', billId);
        
        if (error) {
          console.error('🔴 Bill deletion error:', error);
          
          if (error.code === '42501') {
            throw new Error('Permission denied. You can only delete your own bills.');
          } else if (error.code === 'PGRST116') {
            throw new Error('Bill not found. It may have already been deleted.');
          } else {
            throw new Error(`Failed to delete bill: ${error.message}`);
          }
        }
      } else {
        const updatedBills = localBills.filter(bill => bill.id !== billId);
        setLocalBills(updatedBills);
      }
      
      toast({
        title: "✅ Bill Deleted!",
        description: "The bill has been removed from your list",
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
      <Card className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{bill.name}</h3>
            <p className="text-sm text-muted-foreground capitalize">{bill.category}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={getBillStatusColor(bill.status)} className="ml-2">
              {bill.status}
            </Badge>
            {daysUntilDue <= 7 && (
              <div className={`text-xs ${getUrgencyColor()} flex items-center gap-1`}>
                <Clock className="h-3 w-3" />
                {daysUntilDue <= 0 ? 'Overdue' : `${daysUntilDue}d left`}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatINRCompact(bill.amount)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(parseISO(bill.due_date), 'MMM dd, yyyy')}</span>
          </div>
        </div>

        {bill.notes && (
          <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
            {bill.notes}
          </p>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => editBill(bill)}
            className="text-xs"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setReminderModalBill(bill)}
            className="text-xs"
          >
            <Bell className="h-3 w-3 mr-1" />
            Remind
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => window.open(generateGoogleCalendarUrl(bill), '_blank')}
            className="text-xs"
          >
            <CalendarPlus className="h-3 w-3 mr-1" />
            Calendar
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={() => deleteBill(bill.id)}
            className="text-xs"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Bills Management</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Track and manage all your bills in one place</p>
            </div>

            <BillLimitBanner 
              currentCount={bills.length}
              onUpgrade={() => setShowUpgradeModal(true)}
            />
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="flex items-center space-x-2 h-10 w-full sm:w-auto"
                  disabled={!canAddBill(bills.length) && !editingBill}
                  onClick={() => {
                    if (!canAddBill(bills.length) && !editingBill) {
                      setShowUpgradeModal(true);
                    } else {
                      resetForm();
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Bill</span>
                  {!canAddBill(bills.length) && (
                    <Crown className="h-4 w-4 ml-1 text-yellow-500" />
                  )}
                </Button>
              </DialogTrigger>
                <DialogContent className="max-w-2xl mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">
                      {editingBill ? 'Edit Bill' : 'Add New Bill'}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <SmartBillForm
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleSubmit}
                    editingBill={editingBill}
                  />
                </DialogContent>
            </Dialog>
          </div>

          {/* Bills Table */}
          <Card>
            <CardHeader>
              <CardTitle>Your Bills ({bills.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {bills.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No bills found. Add your first bill to get started!</p>
                </div>
              ) : (
                <>
                  {/* Mobile Cards View */}
                  {isMobile ? (
                    <div className="space-y-4">
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
                </>
              )}
            </CardContent>
          </Card>

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

          <FreemiumLimitCard
            type="bills"
            currentCount={bills.length}
            onUpgrade={() => setShowUpgradeModal(true)}
            className="shadow-lg"
          />

          <EnhancedAIAssistantV2
            bills={bills}
            context="bills page - managing and organizing bills, payment tracking"
          />

          <BillReminderManager />
        </div>
      </main>
    </div>
  );
};

export default Bills;