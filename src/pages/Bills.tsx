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
import { Plus, Edit, Trash2, ArrowUpDown, LogOut, Calendar, DollarSign, AlertCircle, Crown } from 'lucide-react';
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

interface BillFormData {
  name: string;
  amount: string;
  due_date: string;
  category: string;
  recurring: boolean;
  status: 'unpaid' | 'paid' | 'overdue';
  notes: string;
}

const initialFormData: BillFormData = {
  name: '',
  amount: '',
  due_date: '',
  category: 'utilities',
  recurring: false,
  status: 'unpaid',
  notes: '',
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

        if (error) throw error;
        setBills(data || []);
      } else {
        setBills(localBills);
      }
    } catch (error: any) {
      toast({
        title: "Error fetching bills",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.amount || !formData.due_date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Check bill limit for new bills (not edits)
    if (!editingBill && !canAddBill(bills.length)) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      const billData = {
        id: editingBill ? editingBill.id : crypto.randomUUID(),
        user_id: user!.id,
        name: formData.name,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        category: formData.category,
        recurring: formData.recurring,
        status: formData.status,
        notes: formData.notes || null,
        created_at: editingBill ? editingBill.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured && supabase) {
        if (editingBill) {
          const { error } = await supabase
            .from('bills')
            .update(billData)
            .eq('id', editingBill.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('bills')
            .insert([billData]);
          if (error) throw error;
        }
      } else {
        if (editingBill) {
          const updatedBills = localBills.map(bill =>
            bill.id === editingBill.id ? billData : bill
          );
          setLocalBills(updatedBills);
        } else {
          setLocalBills([...localBills, billData]);
        }
      }

      toast({
        title: editingBill ? "Bill updated successfully!" : "Bill added successfully!",
      });

      setFormData(initialFormData);
      setEditingBill(null);
      setIsDialogOpen(false);
      await fetchBills();
    } catch (error: any) {
      toast({
        title: "Error saving bill",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingBill(null);
    setIsDialogOpen(false);
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
    <div className="min-h-screen bg-background">
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
              <DialogContent className="max-w-md mx-4 sm:mx-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">
                    {editingBill ? 'Edit Bill' : 'Add New Bill'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Bill Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Electric Bill"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button type="submit" className="flex-1">
                      {editingBill ? 'Update Bill' : 'Add Bill'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bills.map((bill) => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-medium">{bill.name}</TableCell>
                          <TableCell>₹{bill.amount.toFixed(2)}</TableCell>
                          <TableCell>{format(parseISO(bill.due_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant={bill.status === 'paid' ? 'default' : 'destructive'}>
                              {bill.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">
                                Edit
                              </Button>
                              <Button size="sm" variant="destructive">
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

          <UpgradeModal
            open={showUpgradeModal}
            onOpenChange={setShowUpgradeModal}
            currentBillCount={bills.length}
            aiQueriesUsed={aiQueriesUsed}
            aiQueriesLimit={aiQueriesLimit}
            trigger="bills"
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
        </div>
      </main>
    </div>
  );
};

export default Bills;