import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FloatingLabelInput } from '@/components/ui/floating-label-input';
import { FloatingLabelTextarea } from '@/components/ui/floating-label-textarea';
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
  AlertTriangle,
  Plus,
  Save,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, format, startOfMonth, addMonths } from 'date-fns';
import { VoiceInput } from '@/components/mobile/VoiceInput';
import { OCRScanner } from '@/components/mobile/OCRScanner';
import { SmartDatePicker } from '@/components/mobile/SmartDatePicker';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Locale, t } from '@/utils/locale';

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
    notes: 'Monthly electricity consumption'
  },
  {
    name: 'Internet & WiFi',
    category: 'utilities',
    icon: Smartphone,
    suggestedAmount: 1500,
    dueDay: 1,
    notes: 'Broadband internet service'
  },
  {
    name: 'House Rent',
    category: 'rent',
    icon: Home,
    suggestedAmount: 25000,
    dueDay: 1,
    notes: 'Monthly house rent payment'
  },
  {
    name: 'Life Insurance',
    category: 'insurance',
    icon: Shield,
    suggestedAmount: 5000,
    dueDay: 10,
    notes: 'Life insurance premium'
  },
  {
    name: 'Credit Card',
    category: 'credit_card',
    icon: CreditCard,
    suggestedAmount: 8000,
    dueDay: 20,
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
  const [locale] = useLocalStorage<Locale>('invoiceflow_locale', 'en-IN');
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

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
      notes: template.notes,
      recurring: true,
      email_reminder: true,
      reminder_days: 1
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
        {/* Bill Name with Smart Detection - Floating Label + Voice Input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <FloatingLabelInput
              id="name"
              label={t('bill_name', locale) + ' *'}
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t('bill_name', locale) + ' *'}
              required
              className="flex-1 min-h-[48px]"
            />
            <VoiceInput
              onTranscript={(text) => {
                handleNameChange(text);
                toast({
                  title: 'Voice Input',
                  description: 'Bill name updated from voice',
                });
              }}
              language={locale}
            />
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lightbulb className="h-3 w-3 text-yellow-500" />
            Category will be auto-detected based on the name
          </p>
        </div>

        {/* Amount with Smart Validation - Floating Label + OCR Scanner */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <FloatingLabelInput
              id="amount"
              type="number"
              step="0.01"
              label={t('amount', locale) + ' (₹) *'}
              value={formData.amount}
              onChange={(e) => {
                setFormData({ ...formData, amount: e.target.value });
                if (e.target.value) validateAmount(e.target.value);
              }}
              placeholder={t('amount', locale) + ' (₹) *'}
              required
              className="flex-1 min-h-[48px]"
            />
            <OCRScanner
              onAmountDetected={(amount) => {
                setFormData({ ...formData, amount: amount.toString() });
                validateAmount(amount.toString());
                toast({
                  title: 'Amount Scanned',
                  description: `₹${amount.toLocaleString('en-IN')} detected`,
                });
              }}
            />
          </div>
        </div>

        {/* Smart Due Date Selection */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            {t('due_date', locale)} *
            <Calendar className="h-3 w-3 text-blue-500" />
          </Label>
          
          <SmartDatePicker
            value={formData.due_date}
            onChange={(date) => setFormData({ ...formData, due_date: date })}
          />
        </div>

        {/* More Options Toggle - Progressive Disclosure */}
        <div className="pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="w-full justify-between h-10 min-h-[48px]"
          >
            <span>{t('more_options', locale)}</span>
            <ArrowRight className={cn("h-4 w-4 transition-transform", showMoreOptions && "rotate-90")} />
          </Button>
        </div>

        {/* Advanced Options - Collapsible */}
        {showMoreOptions && (
          <div className="space-y-4 pt-2 border-t border-border/50">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="category">{t('category', locale)}</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="min-h-[48px]">
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

            {/* Email Reminder Toggle */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2 text-base font-semibold text-blue-700 dark:text-blue-300">
                    📧 {t('email_reminder', locale)}
                  </Label>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Get notified before this bill is due
                  </p>
                </div>
                <Switch
                  checked={formData.email_reminder}
                  onCheckedChange={(checked) => setFormData({ ...formData, email_reminder: checked })}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>

              {formData.email_reminder && (
                <div className="space-y-2 pl-4">
                  <Label>{t('reminder', locale)}:</Label>
                  <Select 
                    value={formData.reminder_days.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, reminder_days: parseInt(value) })}
                  >
                    <SelectTrigger className="min-h-[48px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Same day</SelectItem>
                      <SelectItem value="1">1 day before</SelectItem>
                      <SelectItem value="2">2 days before</SelectItem>
                      <SelectItem value="7">7 days before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Recurring Bill Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  {t('recurring', locale)}
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

            {/* Status Selection */}
            <div className="space-y-2">
              <Label>{t('status', locale)}</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      {t('unpaid', locale)}
                    </div>
                  </SelectItem>
                  <SelectItem value="paid">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      {t('paid', locale)}
                    </div>
                  </SelectItem>
                  <SelectItem value="overdue">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      {t('overdue', locale)}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes - Floating Label */}
            <div className="space-y-2">
              <FloatingLabelTextarea
                id="notes"
                label={t('notes', locale) + ' (Optional)'}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('notes', locale) + ' (Optional)'}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Submit Button with Gradient */}
        <Button 
          type="submit" 
          variant="gradient"
          className="w-full" 
          size="lg"
        >
          {editingBill ? (
            <>
              <Save className="h-5 w-5" />
              Update Bill
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              Add Bill
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default SmartBillForm;