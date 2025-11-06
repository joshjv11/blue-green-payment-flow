import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { usePlan } from '@/contexts/PlanContext';
import { BackToDashboard } from '@/components/BackToDashboard';
import { PageTransition } from '@/components/PageTransition';
import { PremiumGuard } from '@/components/PremiumGuard';
import { Plus, CreditCard, TrendingDown, Calendar, Loader2, Trash2, Edit, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EMI {
  id: string;
  loan_name: string;
  lender_name: string | null;
  loan_type: string;
  principal_amount: number;
  emi_amount: number;
  interest_rate: number | null;
  total_tenure_months: number;
  remaining_tenure_months: number;
  due_date_day: number;
  next_due_date: string | null;
  total_paid: number;
  total_remaining: number;
  is_active: boolean;
  notes: string | null;
}

export default function EMIManager() {
  const { toast } = useToast();
  const { isPremium, isPro } = usePlan();
  const [loading, setLoading] = useState(false);
  const [emis, setEmis] = useState<EMI[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEmi, setEditingEmi] = useState<EMI | null>(null);

  const [formData, setFormData] = useState({
    loan_name: '',
    lender_name: '',
    loan_type: 'credit_card',
    principal_amount: '',
    emi_amount: '',
    interest_rate: '',
    total_tenure_months: '',
    due_date_day: '5',
    notes: '',
  });

  useEffect(() => {
    if (isPro || isPremium) {
      loadEMIs();
    }
  }, [isPro, isPremium]);

  const loadEMIs = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('emi_tracker')
        .select('*')
        .eq('user_id', user.id)
        .order('next_due_date', { ascending: true });

      if (error) throw error;

      // Update next_due_date for each EMI
      const updatedEmis = (data || []).map(emi => {
        const nextDue = calculateNextDueDate(emi.due_date_day);
        if (emi.next_due_date !== nextDue) {
          // Update in database
          supabase
            .from('emi_tracker')
            .update({ next_due_date: nextDue })
            .eq('id', emi.id)
            .then(() => {});
        }
        return { ...emi, next_due_date: nextDue };
      });

      setEmis(updatedEmis);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load EMIs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateNextDueDate = (dueDay: number): string => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let dueDate = new Date(currentYear, currentMonth, dueDay);
    
    // If due date has passed this month, set for next month
    if (dueDate < today) {
      dueDate = new Date(currentYear, currentMonth + 1, dueDay);
    }
    
    return dueDate.toISOString().split('T')[0];
  };

  const handleSave = async () => {
    if (!formData.loan_name || !formData.emi_amount || !formData.total_tenure_months) {
      toast({
        title: "Validation Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const principalAmount = parseFloat(formData.principal_amount) || 0;
      const emiAmount = parseFloat(formData.emi_amount);
      const totalTenure = parseInt(formData.total_tenure_months);
      const nextDueDate = calculateNextDueDate(parseInt(formData.due_date_day));

      const emiData = {
        user_id: user.id,
        loan_name: formData.loan_name,
        lender_name: formData.lender_name || null,
        loan_type: formData.loan_type,
        principal_amount: principalAmount,
        emi_amount: emiAmount,
        interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : null,
        total_tenure_months: totalTenure,
        remaining_tenure_months: editingEmi ? editingEmi.remaining_tenure_months : totalTenure,
        due_date_day: parseInt(formData.due_date_day),
        next_due_date: nextDueDate,
        total_paid: editingEmi ? editingEmi.total_paid : 0,
        total_remaining: principalAmount,
        is_active: true,
        notes: formData.notes || null,
      };

      if (editingEmi) {
        const { error } = await supabase
          .from('emi_tracker')
          .update(emiData)
          .eq('id', editingEmi.id);

        if (error) throw error;
        toast({
          title: "EMI Updated! ✅",
          description: "Your EMI details have been updated",
        });
      } else {
        const { error } = await supabase
          .from('emi_tracker')
          .insert(emiData);

        if (error) throw error;
        toast({
          title: "EMI Added! 📝",
          description: "Start tracking your EMI payments",
        });
      }

      setShowAddDialog(false);
      setEditingEmi(null);
      resetForm();
      loadEMIs();
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save EMI",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (emiId: string) => {
    try {
      const emi = emis.find(e => e.id === emiId);
      if (!emi) return;

      const newPaid = emi.total_paid + emi.emi_amount;
      const newRemaining = Math.max(0, emi.total_remaining - emi.emi_amount);
      const newRemainingTenure = Math.max(0, emi.remaining_tenure_months - 1);
      const nextDueDate = newRemainingTenure > 0 ? calculateNextDueDate(emi.due_date_day) : null;

      const { error } = await supabase
        .from('emi_tracker')
        .update({
          total_paid: newPaid,
          total_remaining: newRemaining,
          remaining_tenure_months: newRemainingTenure,
          next_due_date: nextDueDate,
          is_active: newRemainingTenure > 0,
        })
        .eq('id', emiId);

      if (error) throw error;

      toast({
        title: "Payment Recorded! ✅",
        description: `₹${emi.emi_amount.toFixed(2)} payment recorded for ${emi.loan_name}`,
      });

      loadEMIs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (emiId: string) => {
    try {
      const { error } = await supabase
        .from('emi_tracker')
        .delete()
        .eq('id', emiId);

      if (error) throw error;

      toast({
        title: "EMI Deleted",
        description: "EMI has been removed from tracking",
      });

      loadEMIs();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete EMI",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      loan_name: '',
      lender_name: '',
      loan_type: 'credit_card',
      principal_amount: '',
      emi_amount: '',
      interest_rate: '',
      total_tenure_months: '',
      due_date_day: '5',
      notes: '',
    });
  };

  const openEditDialog = (emi: EMI) => {
    setEditingEmi(emi);
    setFormData({
      loan_name: emi.loan_name,
      lender_name: emi.lender_name || '',
      loan_type: emi.loan_type,
      principal_amount: emi.principal_amount.toString(),
      emi_amount: emi.emi_amount.toString(),
      interest_rate: emi.interest_rate?.toString() || '',
      total_tenure_months: emi.total_tenure_months.toString(),
      due_date_day: emi.due_date_day.toString(),
      notes: emi.notes || '',
    });
    setShowAddDialog(true);
  };

  const openAddDialog = () => {
    setEditingEmi(null);
    resetForm();
    setShowAddDialog(true);
  };

  const calculateTotalEMI = () => {
    return emis.filter(e => e.is_active).reduce((sum, e) => sum + e.emi_amount, 0);
  };

  const calculateTotalRemaining = () => {
    return emis.filter(e => e.is_active).reduce((sum, e) => sum + e.total_remaining, 0);
  };

  const getUpcomingEMIs = () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return emis.filter(e => {
      if (!e.next_due_date || !e.is_active) return false;
      const dueDate = new Date(e.next_due_date);
      return dueDate <= nextWeek && dueDate >= today;
    });
  };

  if (!isPro && !isPremium) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background p-4">
          <BackToDashboard />
          <PremiumGuard featureName="EMI Manager" requiredPlan="pro">
            <div />
          </PremiumGuard>
        </div>
      </PageTransition>
    );
  }

  const upcomingEmis = getUpcomingEMIs();
  const totalMonthlyEMI = calculateTotalEMI();
  const totalRemaining = calculateTotalRemaining();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <BackToDashboard />
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <CreditCard className="h-8 w-8" />
                EMI & Debt Manager
              </h1>
              <p className="text-muted-foreground">
                Track your EMIs, loans, and credit card payments
              </p>
            </div>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add EMI
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active EMIs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {emis.filter(e => e.is_active).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {emis.filter(e => !e.is_active).length} completed
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly EMI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalMonthlyEMI.toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total monthly payments
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Remaining</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalRemaining.toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Outstanding debt
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming EMIs Alert */}
          {upcomingEmis.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{upcomingEmis.length} EMI{upcomingEmis.length > 1 ? 's' : ''} due in next 7 days!</strong>
                {' '}Total: ₹{upcomingEmis.reduce((sum, e) => sum + e.emi_amount, 0).toLocaleString('en-IN')}
              </AlertDescription>
            </Alert>
          )}

          {/* EMIs List */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : emis.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CreditCard className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No EMIs tracked yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add your loans and credit cards to track payments
                </p>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First EMI
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {emis.map((emi) => {
                const dueDate = emi.next_due_date ? new Date(emi.next_due_date) : null;
                const daysUntilDue = dueDate 
                  ? Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                const progress = emi.total_tenure_months > 0
                  ? ((emi.total_tenure_months - emi.remaining_tenure_months) / emi.total_tenure_months) * 100
                  : 0;

                return (
                  <Card key={emi.id} className={!emi.is_active ? 'opacity-60' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {emi.loan_name}
                            {!emi.is_active && (
                              <Badge variant="secondary">Completed</Badge>
                            )}
                            {daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0 && (
                              <Badge variant="destructive">Due Soon</Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-1 capitalize">
                            {emi.loan_type.replace('_', ' ')}
                            {emi.lender_name && ` • ${emi.lender_name}`}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(emi)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(emi.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">EMI Amount</div>
                          <div className="font-semibold">₹{emi.emi_amount.toLocaleString('en-IN')}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Remaining</div>
                          <div className="font-semibold">₹{emi.total_remaining.toLocaleString('en-IN')}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Progress</div>
                          <div className="font-semibold">
                            {Math.round(progress)}% ({emi.total_tenure_months - emi.remaining_tenure_months}/{emi.total_tenure_months} months)
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Next Due</div>
                          <div className="font-semibold flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {dueDate 
                              ? dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                              : 'N/A'}
                            {daysUntilDue !== null && daysUntilDue >= 0 && (
                              <span className="text-xs text-muted-foreground">
                                ({daysUntilDue}d)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {emi.is_active && (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleMarkPaid(emi.id)}
                        >
                          <TrendingDown className="h-4 w-4 mr-2" />
                          Mark as Paid
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Add/Edit Dialog */}
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEmi ? 'Edit EMI' : 'Add New EMI'}</DialogTitle>
                <DialogDescription>
                  Track your loan or credit card EMI payments
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loan_name">Loan Name *</Label>
                  <Input
                    id="loan_name"
                    value={formData.loan_name}
                    onChange={(e) => setFormData({ ...formData, loan_name: e.target.value })}
                    placeholder="e.g., Credit Card, Home Loan, Personal Loan"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lender_name">Lender/Bank Name</Label>
                  <Input
                    id="lender_name"
                    value={formData.lender_name}
                    onChange={(e) => setFormData({ ...formData, lender_name: e.target.value })}
                    placeholder="e.g., HDFC Bank, SBI"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loan_type">Loan Type</Label>
                  <Select
                    value={formData.loan_type}
                    onValueChange={(value) => setFormData({ ...formData, loan_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="personal_loan">Personal Loan</SelectItem>
                      <SelectItem value="home_loan">Home Loan</SelectItem>
                      <SelectItem value="car_loan">Car Loan</SelectItem>
                      <SelectItem value="education_loan">Education Loan</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="principal_amount">Principal Amount (₹)</Label>
                    <Input
                      id="principal_amount"
                      type="number"
                      value={formData.principal_amount}
                      onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })}
                      placeholder="100000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emi_amount">EMI Amount (₹) *</Label>
                    <Input
                      id="emi_amount"
                      type="number"
                      value={formData.emi_amount}
                      onChange={(e) => setFormData({ ...formData, emi_amount: e.target.value })}
                      placeholder="5000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                    <Input
                      id="interest_rate"
                      type="number"
                      step="0.1"
                      value={formData.interest_rate}
                      onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                      placeholder="12.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="total_tenure_months">Tenure (Months) *</Label>
                    <Input
                      id="total_tenure_months"
                      type="number"
                      value={formData.total_tenure_months}
                      onChange={(e) => setFormData({ ...formData, total_tenure_months: e.target.value })}
                      placeholder="60"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date_day">Due Date (Day of Month) *</Label>
                  <Input
                    id="due_date_day"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.due_date_day}
                    onChange={(e) => setFormData({ ...formData, due_date_day: e.target.value })}
                    placeholder="5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Which day of the month is your EMI due?
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowAddDialog(false);
                      setEditingEmi(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingEmi ? 'Update EMI' : 'Add EMI'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </PageTransition>
  );
}
