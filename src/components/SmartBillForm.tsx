import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Lightbulb, 
  Calendar,
  DollarSign,
  Zap,
  Smartphone,
  Home,
  Shield,
  CreditCard,
  Loader2,
  Sparkles,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { addDays, format, startOfMonth, addMonths } from 'date-fns';

interface BillFormData {
  name: string;
  amount: string;
  due_date: string;
  category: string;
  recurring: boolean;
  status: 'unpaid' | 'paid' | 'overdue';
  notes: string;
  priority: 'low' | 'medium' | 'high';
  reminder_days: number;
}

interface SmartBillFormProps {
  formData: BillFormData;
  setFormData: (data: BillFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  editingBill?: any;
}

const billTemplates = [
  {
    name: 'Electricity Bill',
    category: 'utilities',
    icon: Zap,
    suggestedAmount: 2500,
    dueDay: 15,
    priority: 'high' as const,
    notes: 'Monthly electricity consumption'
  },
  {
    name: 'Internet & WiFi',
    category: 'utilities',
    icon: Smartphone,
    suggestedAmount: 1500,
    dueDay: 1,
    priority: 'medium' as const,
    notes: 'Broadband internet service'
  },
  {
    name: 'House Rent',
    category: 'rent',
    icon: Home,
    suggestedAmount: 25000,
    dueDay: 1,
    priority: 'high' as const,
    notes: 'Monthly house rent payment'
  },
  {
    name: 'Life Insurance',
    category: 'insurance',
    icon: Shield,
    suggestedAmount: 5000,
    dueDay: 10,
    priority: 'medium' as const,
    notes: 'Life insurance premium'
  },
  {
    name: 'Credit Card',
    category: 'credit_card',
    icon: CreditCard,
    suggestedAmount: 8000,
    dueDay: 20,
    priority: 'high' as const,
    notes: 'Credit card minimum payment'
  }
];

const categoryDetection: Record<string, string> = {
  'electricity': 'utilities',
  'electric': 'utilities', 
  'power': 'utilities',
  'water': 'utilities',
  'gas': 'utilities',
  'internet': 'utilities',
  'wifi': 'utilities',
  'broadband': 'utilities',
  'phone': 'utilities',
  'mobile': 'utilities',
  'rent': 'rent',
  'house': 'rent',
  'apartment': 'rent',
  'insurance': 'insurance',
  'policy': 'insurance',
  'premium': 'insurance',
  'netflix': 'subscription',
  'spotify': 'subscription',
  'amazon': 'subscription',
  'subscription': 'subscription',
  'credit': 'credit_card',
  'card': 'credit_card',
  'loan': 'loan',
  'emi': 'loan',
  'mortgage': 'loan'
};

const SmartBillForm = ({ formData, setFormData, onSubmit, editingBill }: SmartBillFormProps) => {
  const { toast } = useToast();
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Smart category detection
  const detectCategory = (billName: string) => {
    const nameLower = billName.toLowerCase();
    for (const [keyword, category] of Object.entries(categoryDetection)) {
      if (nameLower.includes(keyword)) {
        return category;
      }
    }
    return 'other';
  };

  // Smart due date suggestions
  const getSuggestedDueDates = () => {
    const today = new Date();
    const nextMonth = addMonths(startOfMonth(today), 1);
    
    return [
      { label: 'End of this month', date: format(addDays(startOfMonth(addMonths(today, 1)), -1), 'yyyy-MM-dd') },
      { label: '1st of next month', date: format(nextMonth, 'yyyy-MM-dd') },
      { label: '15th of next month', date: format(addDays(nextMonth, 14), 'yyyy-MM-dd') },
      { label: 'In 7 days', date: format(addDays(today, 7), 'yyyy-MM-dd') },
      { label: 'In 15 days', date: format(addDays(today, 15), 'yyyy-MM-dd') },
      { label: 'In 30 days', date: format(addDays(today, 30), 'yyyy-MM-dd') }
    ];
  };

  // Handle bill name change with smart detection
  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name });
    
    if (name.length > 2) {
      const detectedCategory = detectCategory(name);
      if (detectedCategory !== 'other' && detectedCategory !== formData.category) {
        setFormData({ ...formData, name, category: detectedCategory });
        toast({
          title: "Smart Detection",
          description: `Detected category: ${detectedCategory.charAt(0).toUpperCase() + detectedCategory.slice(1).replace('_', ' ')}`,
        });
      }
    }
  };

  // Apply bill template
  const applyTemplate = (template: typeof billTemplates[0]) => {
    const nextMonth = addMonths(startOfMonth(new Date()), 1);
    const suggestedDate = format(addDays(nextMonth, template.dueDay - 1), 'yyyy-MM-dd');
    
    setFormData({
      ...formData,
      name: template.name,
      category: template.category,
      amount: template.suggestedAmount.toString(),
      due_date: suggestedDate,
      priority: template.priority,
      notes: template.notes,
      recurring: true
    });
    
    toast({
      title: "Template Applied",
      description: `Applied ${template.name} template with smart defaults`,
    });
  };

  // Smart amount validation
  const validateAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return false;
    if (num > 1000000) {
      toast({
        title: "Large Amount Detected",
        description: "This seems like a large amount. Please verify it's correct.",
        variant: "destructive",
      });
    }
    return true;
  };

  const dueDateSuggestions = getSuggestedDueDates();

  return (
    <div className="space-y-6">
      {/* Quick Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Quick Bill Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {billTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <Button
                  key={template.name}
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(template)}
                  className="flex flex-col items-center gap-2 h-auto p-3"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-xs text-center">{template.name}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Form */}
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Bill Name with Smart Detection */}
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            Bill Name *
            <Lightbulb className="h-3 w-3 text-yellow-500" />
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g., Electricity Bill, Internet Payment..."
            required
          />
          <p className="text-xs text-muted-foreground">
            💡 Category will be auto-detected based on the name
          </p>
        </div>

        {/* Amount with Smart Validation */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="flex items-center gap-2">
            Amount (₹) *
            <DollarSign className="h-3 w-3 text-green-500" />
          </Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => {
              setFormData({ ...formData, amount: e.target.value });
              if (e.target.value) validateAmount(e.target.value);
            }}
            placeholder="0.00"
            required
          />
        </div>

        {/* Smart Due Date Selection */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            Due Date *
            <Calendar className="h-3 w-3 text-blue-500" />
          </Label>
          
          <Input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            required
          />
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {dueDateSuggestions.map((suggestion) => (
              <Button
                key={suggestion.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, due_date: suggestion.date })}
                className="text-xs"
              >
                {suggestion.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Category Selection */}
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="utilities">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Utilities
                </div>
              </SelectItem>
              <SelectItem value="rent">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Rent
                </div>
              </SelectItem>
              <SelectItem value="insurance">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Insurance
                </div>
              </SelectItem>
              <SelectItem value="subscription">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Subscription
                </div>
              </SelectItem>
              <SelectItem value="loan">Loan</SelectItem>
              <SelectItem value="credit_card">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Credit Card
                </div>
              </SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority & Reminder Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Priority Level</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value: 'low' | 'medium' | 'high') => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Low Priority
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    Medium Priority
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    High Priority
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Remind Me (days before)</Label>
            <Select 
              value={formData.reminder_days.toString()} 
              onValueChange={(value) => setFormData({ ...formData, reminder_days: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day before</SelectItem>
                <SelectItem value="3">3 days before</SelectItem>
                <SelectItem value="7">1 week before</SelectItem>
                <SelectItem value="14">2 weeks before</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Auto Reminder Toggle */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-base font-semibold text-blue-700 dark:text-blue-300">
              📅 Auto-Remind Me
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                Recommended
              </Badge>
            </Label>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Get email reminders {formData.reminder_days} day{formData.reminder_days !== 1 ? 's' : ''} before due date
            </p>
          </div>
          <Switch
            checked={true}
            onCheckedChange={() => {}}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>

        {/* Recurring Bill Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Recurring Bill
            </Label>
            <p className="text-xs text-muted-foreground">
              This bill repeats every month
            </p>
          </div>
          <Switch
            checked={formData.recurring}
            onCheckedChange={(checked) => setFormData({ ...formData, recurring: checked })}
          />
        </div>

        {/* Add to Calendar Toggle */}
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-green-700 dark:text-green-300">
              📅 Add to Google Calendar
            </Label>
            <p className="text-xs text-green-600 dark:text-green-400">
              Create calendar event for this bill
            </p>
          </div>
          <Switch
            checked={true}
            onCheckedChange={() => {}}
            className="data-[state=checked]:bg-green-600"
          />
        </div>

        {/* Status Selection */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Unpaid
                </div>
              </SelectItem>
              <SelectItem value="paid">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Paid
                </div>
              </SelectItem>
              <SelectItem value="overdue">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Overdue
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any additional notes about this bill..."
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full" size="lg">
          {editingBill ? 'Update Bill' : 'Add Bill'}
        </Button>
      </form>
    </div>
  );
};

export default SmartBillForm;