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
import { Plus, Target, CheckCircle2, TrendingUp, Loader2, Trash2, Edit, Calendar } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SavingsGoal {
  id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  goal_type: string;
  target_date: string | null;
  is_completed: boolean;
  notes: string | null;
  created_at: string;
}

export default function SavingsGoals() {
  const { toast } = useToast();
  const { isPremium, isPro } = usePlan();
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  
  const [formData, setFormData] = useState({
    goal_name: '',
    target_amount: '',
    current_amount: '0',
    monthly_contribution: '',
    goal_type: 'emergency_fund',
    target_date: '',
    notes: '',
  });

  useEffect(() => {
    if (isPro || isPremium) {
      loadGoals();
    }
  }, [isPro, isPremium]);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('savings_goals' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Table doesn't exist yet
        console.warn('Savings goals table not available:', error.message);
        setGoals([]);
        return;
      }
      setGoals((data || []) as any);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load savings goals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.goal_name || !formData.target_amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in goal name and target amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const goalData = {
        user_id: user.id,
        goal_name: formData.goal_name,
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount) || 0,
        monthly_contribution: parseFloat(formData.monthly_contribution) || 0,
        goal_type: formData.goal_type,
        target_date: formData.target_date || null,
        notes: formData.notes || null,
        is_completed: false,
      };

      if (editingGoal) {
        const { error } = await supabase
          .from('savings_goals' as any)
          .update(goalData)
          .eq('id', editingGoal.id);

        if (error) throw error;
        toast({
          title: "Goal Updated! ✅",
          description: "Your savings goal has been updated",
        });
      } else {
        const { error } = await supabase
          .from('savings_goals' as any)
          .insert(goalData);

        if (error) throw error;
        toast({
          title: "Goal Created! 🎯",
          description: "Start saving towards your goal",
        });
      }

      setShowAddDialog(false);
      setEditingGoal(null);
      resetForm();
      loadGoals();
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save goal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddContribution = async (goalId: string, amount: number) => {
    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) return;

      const newAmount = goal.current_amount + amount;
      const isCompleted = newAmount >= goal.target_amount;

      const { error } = await supabase
        .from('savings_goals' as any)
        .update({
          current_amount: newAmount,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq('id', goalId);

      if (error) throw error;

      if (isCompleted) {
        toast({
          title: "Goal Achieved! 🎉",
          description: `Congratulations! You've reached your ${goal.goal_name} goal!`,
        });
      } else {
        toast({
          title: "Contribution Added! ✅",
          description: `₹${amount} added to ${goal.goal_name}`,
        });
      }

      loadGoals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add contribution",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('savings_goals' as any)
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      toast({
        title: "Goal Deleted",
        description: "Savings goal has been removed",
      });

      loadGoals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete goal",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      goal_name: '',
      target_amount: '',
      current_amount: '0',
      monthly_contribution: '',
      goal_type: 'emergency_fund',
      target_date: '',
      notes: '',
    });
  };

  const openEditDialog = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setFormData({
      goal_name: goal.goal_name,
      target_amount: goal.target_amount.toString(),
      current_amount: goal.current_amount.toString(),
      monthly_contribution: goal.monthly_contribution.toString(),
      goal_type: goal.goal_type,
      target_date: goal.target_date || '',
      notes: goal.notes || '',
    });
    setShowAddDialog(true);
  };

  const openAddDialog = () => {
    setEditingGoal(null);
    resetForm();
    setShowAddDialog(true);
  };

  if (!isPro && !isPremium) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background p-4">
          <BackToDashboard />
          <PremiumGuard featureName="Savings Goals" requiredPlan="pro">
            <div />
          </PremiumGuard>
        </div>
      </PageTransition>
    );
  }

  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const activeGoals = goals.filter(g => !g.is_completed);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <BackToDashboard />
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Target className="h-8 w-8" />
                Savings Goals
              </h1>
              <p className="text-muted-foreground">
                Set goals, track progress, and build your emergency fund
              </p>
            </div>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Goal
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{goals.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeGoals.length} active, {goals.filter(g => g.is_completed).length} completed
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Saved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalCurrent.toLocaleString('en-IN')}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  of ₹{totalTarget.toLocaleString('en-IN')} target
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0}%
                </div>
                <Progress 
                  value={totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0} 
                  className="mt-2"
                />
              </CardContent>
            </Card>
          </div>

          {/* Goals List */}
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
          ) : goals.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No savings goals yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start saving towards your financial goals
                </p>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((goal) => {
                const progress = (goal.current_amount / goal.target_amount) * 100;
                const remaining = goal.target_amount - goal.current_amount;
                const monthsRemaining = goal.monthly_contribution > 0 
                  ? Math.ceil(remaining / goal.monthly_contribution)
                  : null;

                return (
                  <Card key={goal.id} className={goal.is_completed ? 'border-green-500' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {goal.goal_name}
                            {goal.is_completed && (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-1 capitalize">
                            {goal.goal_type.replace('_', ' ')}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(goal)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(goal.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Progress</span>
                          <span className="font-semibold">
                            ₹{goal.current_amount.toLocaleString('en-IN')} / ₹{goal.target_amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <Progress value={Math.min(progress, 100)} />
                        <p className="text-xs text-muted-foreground mt-2">
                          ₹{remaining.toLocaleString('en-IN')} remaining
                          {monthsRemaining && ` • ${monthsRemaining} months to go`}
                        </p>
                      </div>

                      {goal.target_date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Target: {new Date(goal.target_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      )}

                      {!goal.is_completed && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              const amount = prompt('Enter amount to add (₹):');
                              if (amount && !isNaN(parseFloat(amount))) {
                                handleAddContribution(goal.id, parseFloat(amount));
                              }
                            }}
                          >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Add Money
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Add/Edit Dialog */}
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingGoal ? 'Edit Goal' : 'New Savings Goal'}</DialogTitle>
                <DialogDescription>
                  Set a savings target and track your progress
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="goal_name">Goal Name *</Label>
                  <Input
                    id="goal_name"
                    value={formData.goal_name}
                    onChange={(e) => setFormData({ ...formData, goal_name: e.target.value })}
                    placeholder="e.g., Emergency Fund, Vacation, New Phone"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target_amount">Target Amount (₹) *</Label>
                    <Input
                      id="target_amount"
                      type="number"
                      value={formData.target_amount}
                      onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                      placeholder="10000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current_amount">Current Amount (₹)</Label>
                    <Input
                      id="current_amount"
                      type="number"
                      value={formData.current_amount}
                      onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly_contribution">Monthly Contribution (₹)</Label>
                  <Input
                    id="monthly_contribution"
                    type="number"
                    value={formData.monthly_contribution}
                    onChange={(e) => setFormData({ ...formData, monthly_contribution: e.target.value })}
                    placeholder="500"
                  />
                  <p className="text-xs text-muted-foreground">
                    How much you plan to save each month
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal_type">Goal Type</Label>
                  <Select
                    value={formData.goal_type}
                    onValueChange={(value) => setFormData({ ...formData, goal_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emergency_fund">Emergency Fund</SelectItem>
                      <SelectItem value="vacation">Vacation</SelectItem>
                      <SelectItem value="gadget">Gadget/Electronics</SelectItem>
                      <SelectItem value="home">Home/Down Payment</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_date">Target Date (Optional)</Label>
                  <Input
                    id="target_date"
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes about this goal"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowAddDialog(false);
                      setEditingGoal(null);
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
                      'Save Goal'
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
