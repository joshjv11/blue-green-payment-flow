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
import { useUserPlan } from '@/hooks/useUserPlan';
import UpgradeModal from '@/components/UpgradeModal';
import { Navigation } from '@/components/Navigation';
import { AIAssistant } from '@/components/AIAssistant';

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
  const { plan, billLimit, canAddBill } = useUserPlan();

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
        
        // Update overdue bills in database
        const overdueBills = updatedBills.filter(bill => 
          bill.status === 'overdue' && data.find(b => b.id === bill.id)?.status !== 'overdue'
        );
        
        if (overdueBills.length > 0) {
          await Promise.all(
            overdueBills.map(bill =>
              supabase
                .from('bills')
                .update({ status: 'overdue' })
                .eq('id', bill.id)
            )
          );
        }
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
            .update({ ...billData, updated_at: new Date().toISOString() })
            .eq('id', editingBill.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('bills')
            .insert([billData]);

          if (error) throw error;
        }
      } else {
        // localStorage mode
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

  const handleEdit = (bill: Bill) => {
    setEditingBill(bill);
    setFormData({
      name: bill.name,
      amount: bill.amount.toString(),
      due_date: bill.due_date,
      category: bill.category,
      recurring: bill.recurring,
      status: bill.status,
      notes: bill.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (billId: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return;

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('bills')
          .delete()
          .eq('id', billId);

        if (error) throw error;
      } else {
        // localStorage mode
        const updatedBills = localBills.filter(bill => bill.id !== billId);
        setLocalBills(updatedBills);
      }

      toast({
        title: "Bill deleted successfully!",
      });
      await fetchBills();
    } catch (error: any) {
      toast({
        title: "Error deleting bill",
        description: error.message,
        variant: "destructive",
      });
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

  const sortBills = (field: keyof Bill) => {
    const direction = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(direction);

    const sortedBills = [...bills].sort((a, b) => {
      let aValue = a[field];
      let bValue = b[field];

      if (field === 'due_date') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setBills(sortedBills);
  };

  const getBillStatusColor = (bill: Bill) => {
    if (bill.status === 'paid') return 'bg-green-100 text-green-800 border-green-200';
    if (bill.status === 'overdue') return 'bg-red-100 text-red-800 border-red-200';
    
    const daysUntilDue = differenceInDays(parseISO(bill.due_date), new Date());
    if (daysUntilDue <= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getBillRowColor = (bill: Bill) => {
    if (bill.status === 'overdue') return 'bg-red-50 border-l-4 border-l-red-500';
    
    const daysUntilDue = differenceInDays(parseISO(bill.due_date), new Date());
    if (bill.status === 'unpaid' && daysUntilDue <= 3) return 'bg-yellow-50 border-l-4 border-l-yellow-500';
    if (bill.status === 'paid') return 'bg-green-50 border-l-4 border-l-green-500';
    
    return '';
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingBill(null);
    setIsDialogOpen(false);
  };

  const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const unpaidAmount = bills.filter(bill => bill.status !== 'paid').reduce((sum, bill) => sum + bill.amount, 0);
  const overdueBills = bills.filter(bill => bill.status === 'overdue').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-hero-gradient rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm"></div>
              </div>
              <span className="text-lg sm:text-xl font-bold text-foreground">InvoiceFlow</span>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="flex items-center space-x-1 sm:space-x-2 h-9"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden xs:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Bills Management</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Track and manage all your bills in one place</p>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={resetForm} 
                  className="flex items-center space-x-2 h-10 w-full sm:w-auto"
                  disabled={!canAddBill(bills.length) && !editingBill}
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

                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date *</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="recurring"
                      checked={formData.recurring}
                      onCheckedChange={(checked) => setFormData({ ...formData, recurring: !!checked })}
                    />
                    <Label htmlFor="recurring">Recurring bill</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>

                  <div className="flex space-x-2 pt-4">
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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  <div>
                    <div className="text-lg sm:text-2xl font-bold">${totalAmount.toFixed(2)}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Total Bills</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
                  <div>
                    <div className="text-lg sm:text-2xl font-bold">${unpaidAmount.toFixed(2)}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Outstanding</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-4">
                    <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                    <div>
                      <div className="text-lg sm:text-2xl font-bold text-red-500">{overdueBills}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Overdue Bills</div>
                    </div>
                  </div>
                  {plan === 'free' && (
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Plan</div>
                      <div className="text-sm font-medium">{bills.length}/{billLimit}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Plan Limit Warning */}
          {plan === 'free' && bills.length >= billLimit - 1 && (
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-800 mb-1">
                    {bills.length >= billLimit ? 'You\'ve reached your limit!' : 'Almost at your limit!'}
                  </h3>
                  <p className="text-sm text-orange-700 mb-3">
                    {bills.length >= billLimit 
                      ? `You have ${bills.length} bills (free limit: ${billLimit}). Upgrade to Pro for unlimited bills and advanced features.`
                      : `You have ${bills.length} of ${billLimit} bills. Upgrade to Pro for unlimited bills, advanced analytics, and more.`
                    }
                  </p>
                  <Button 
                    size="sm" 
                    onClick={() => setShowUpgradeModal(true)}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Bills Table */}
          <Card>
            <CardHeader>
              <CardTitle>Your Bills</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading bills...</div>
              ) : bills.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No bills found. Add your first bill to get started!
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block sm:hidden space-y-4">
                    {bills.map((bill) => (
                      <Card key={bill.id} className={`${getBillRowColor(bill)} p-4`}>
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-foreground">{bill.name}</h3>
                              <p className="text-lg font-bold text-foreground">${bill.amount.toFixed(2)}</p>
                            </div>
                            <Badge className={getBillStatusColor(bill)}>
                              {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Due: {format(parseISO(bill.due_date), 'MMM dd, yyyy')}</p>
                            <p>Category: {bill.category.charAt(0).toUpperCase() + bill.category.slice(1).replace('_', ' ')}</p>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleBillStatus(bill)}
                              disabled={bill.status === 'paid'}
                              className="flex-1 min-w-0 h-9"
                            >
                              {bill.status === 'paid' ? 'Paid' : 'Mark Paid'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(bill)}
                              className="h-9 px-3"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(bill.id)}
                              className="text-destructive hover:text-destructive h-9 px-3"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Button variant="ghost" onClick={() => sortBills('name')} className="h-auto p-0 font-semibold text-xs sm:text-sm">
                              Name <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" onClick={() => sortBills('amount')} className="h-auto p-0 font-semibold text-xs sm:text-sm">
                              Amount <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button variant="ghost" onClick={() => sortBills('due_date')} className="h-auto p-0 font-semibold text-xs sm:text-sm">
                              Due Date <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-xs sm:text-sm">Category</TableHead>
                          <TableHead className="text-xs sm:text-sm">Status</TableHead>
                          <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bills.map((bill) => (
                          <TableRow key={bill.id} className={getBillRowColor(bill)}>
                            <TableCell className="font-medium text-xs sm:text-sm">
                              <div className="flex items-center space-x-2">
                                <span>{bill.name}</span>
                                {bill.recurring && (
                                  <Badge variant="secondary" className="text-xs">Recurring</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold text-xs sm:text-sm">${bill.amount.toFixed(2)}</TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              <div className="flex flex-col">
                                <span>{format(parseISO(bill.due_date), 'MMM dd, yyyy')}</span>
                                <span className="text-xs text-muted-foreground">
                                  {differenceInDays(parseISO(bill.due_date), new Date()) === 0
                                    ? 'Due today'
                                    : differenceInDays(parseISO(bill.due_date), new Date()) > 0
                                    ? `${differenceInDays(parseISO(bill.due_date), new Date())} days left`
                                    : `${Math.abs(differenceInDays(parseISO(bill.due_date), new Date()))} days overdue`
                                  }
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="capitalize text-xs sm:text-sm">
                              {bill.category.replace('_', ' ')}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={`capitalize cursor-pointer hover:opacity-80 transition-opacity text-xs ${getBillStatusColor(bill)}`}
                                onClick={() => toggleBillStatus(bill)}
                              >
                                {bill.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(bill)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(bill.id)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Upgrade Modal */}
          <UpgradeModal 
            open={showUpgradeModal}
            onOpenChange={setShowUpgradeModal}
            currentBillCount={bills.length}
          />
        </div>
      </main>

      <AIAssistant 
        bills={bills}
        context="bills management - adding, editing, and organizing bills"
      />
    </div>
  );
};

export default Bills;