import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, DollarSign, FileText, Filter, Calendar as CalendarIcon, Download, Edit, Trash2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Navigation } from '@/components/Navigation';
import { MobileLayout } from '@/components/MobileLayout';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { BackToDashboard } from '@/components/BackToDashboard';
import { calculateLineTax, getCurrencySymbol, formatCurrency } from '@/utils/taxCalculations';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { formatINR } from '@/utils/currency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface OrderLine {
  id?: string;
  product_name: string;
  description?: string;
  hsn_sac_code?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  zero_rated: boolean;
  rcm: boolean;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  taxable_amount: number;
  tax_amount: number;
  total_amount: number;
}

interface SalesOrder {
  id: string;
  customer_name: string;
  invoice_number: string;
  transaction_date?: string; // Legacy field
  order_date: string;
  total_amount: number;
  tax_amount: number;
  grand_total: number;
  payment_status: 'paid' | 'unpaid' | 'partial';
  amount_paid: number;
  notes?: string;
}

export default function Sales() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { settings, loading: settingsLoading } = useBusinessSettings();
  const [sales, setSales] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isIGST, setIsIGST] = useState(false);
  
  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [customerCountry, setCustomerCountry] = useState('IN');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [sendInvoiceByEmail, setSendInvoiceByEmail] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [orderDate, setOrderDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [currency, setCurrency] = useState<string>('');
  const [fxCurrency, setFxCurrency] = useState<string>('');
  const [fxRate, setFxRate] = useState(1.0);
  const [status, setStatus] = useState<'paid' | 'unpaid' | 'partial'>('unpaid');
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState('');
  const [orderLines, setOrderLines] = useState<OrderLine[]>([{
    product_name: '',
    description: '',
    hsn_sac_code: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 18,
    zero_rated: false,
    rcm: false,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    taxable_amount: 0,
    tax_amount: 0,
    total_amount: 0,
  }]);

  useEffect(() => {
    if (user) {
      fetchSales();
      generateInvoiceNumber();
    }
  }, [user]);

  useEffect(() => {
    if (settings.currency && !currency) {
      setCurrency(settings.currency);
      setFxCurrency(settings.currency);
    }
  }, [settings.currency]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('user_id', user!.id)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setSales((data || []) as any); // Handle both transaction_date and order_date fields
    } catch (error: any) {
      toast({ title: 'Error loading sales', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = async () => {
    const { data } = await supabase.rpc('generate_invoice_number', {
      p_order_type: 'sale',
      p_user_id: user!.id
    });
    if (data) setInvoiceNumber(data);
  };

  const calculateTotals = () => {
    const totalAmount = orderLines.reduce((sum, line) => sum + line.taxable_amount, 0);
    const taxAmount = orderLines.reduce((sum, line) => sum + line.tax_amount, 0);
    const grandTotal = totalAmount + taxAmount;
    return { totalAmount, taxAmount, grandTotal };
  };

  const updateLineCalculations = (index: number, updates: Partial<OrderLine>) => {
    const newLines = [...orderLines];
    newLines[index] = { ...newLines[index], ...updates };
    
    const item = newLines[index];
    const taxableAmount = item.quantity * item.unit_price;
    
    // Calculate tax using regime-aware logic
    const taxBreakdown = calculateLineTax(
      {
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        zero_rated: item.zero_rated,
        rcm: item.rcm,
      },
      settings.tax_regime,
      isIGST
    );
    
    newLines[index] = {
      ...newLines[index],
      taxable_amount: taxableAmount,
      cgst_amount: taxBreakdown.cgst,
      sgst_amount: taxBreakdown.sgst,
      igst_amount: taxBreakdown.igst,
      tax_amount: taxBreakdown.total,
      total_amount: taxableAmount + taxBreakdown.total,
    };
    
    setOrderLines(newLines);
    setHasUnsavedChanges(true);
  };

  const addLine = () => {
    setOrderLines([...orderLines, {
      product_name: '',
      description: '',
      hsn_sac_code: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 18,
      zero_rated: false,
      rcm: false,
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: 0,
      taxable_amount: 0,
      tax_amount: 0,
      total_amount: 0,
    }]);
    setHasUnsavedChanges(true);
  };

  const removeLine = (index: number) => {
    if (orderLines.length > 1) {
      setOrderLines(orderLines.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName.trim() || !invoiceNumber.trim() || orderLines.length === 0) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    if (orderLines.some(line => !line.product_name.trim())) {
      toast({ title: 'All line items must have a product name', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      const { totalAmount, taxAmount, grandTotal } = calculateTotals();
      
      // Aggregate tax amounts
      const totalCGST = orderLines.reduce((sum, line) => sum + line.cgst_amount, 0);
      const totalSGST = orderLines.reduce((sum, line) => sum + line.sgst_amount, 0);
      const totalIGST = orderLines.reduce((sum, line) => sum + line.igst_amount, 0);

      // Normalize empty strings to null for database operations
      const normalizedEmail = customerEmail?.trim() || null;
      const normalizedPhone = customerPhone?.trim() || null;
      
      // Resolve or create customer using flexible matching
      let resolvedCustomerId = customerId;
      if (!resolvedCustomerId) {
        let existingCustomer = null;

        // Priority 1: Match by email if provided
        if (normalizedEmail) {
          const { data } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', user!.id)
            .ilike('email', normalizedEmail)
            .maybeSingle();
          existingCustomer = data;
        }

        // Priority 2: Match by phone if no email match
        if (!existingCustomer && normalizedPhone) {
          const { data } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', user!.id)
            .eq('phone', normalizedPhone)
            .maybeSingle();
          existingCustomer = data;
        }

        // Priority 3: Match by name as fallback
        if (!existingCustomer) {
          const { data } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', user!.id)
            .eq('name', customerName.trim())
            .maybeSingle();
          existingCustomer = data;
        }

        if (existingCustomer) {
          resolvedCustomerId = existingCustomer.id;
          
          // Update existing customer with new info if provided
          await supabase
            .from('customers')
            .update({
              email: normalizedEmail,
              phone: normalizedPhone,
              address: customerAddress?.trim() || null,
              party_gstin: customerGstin?.trim() || null,
              party_state: customerState?.trim() || null,
              country: customerCountry || 'IN',
            })
            .eq('id', existingCustomer.id);
        } else {
          // Create new customer - explicitly omit email/phone if null
          const customerData: any = {
            user_id: user!.id,
            name: customerName.trim(),
            address: customerAddress?.trim() || null,
            party_gstin: customerGstin?.trim() || null,
            party_state: customerState?.trim() || null,
            country: customerCountry || 'IN',
          };
          
          // Only include email/phone if they have values
          if (normalizedEmail) customerData.email = normalizedEmail;
          if (normalizedPhone) customerData.phone = normalizedPhone;
          
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert(customerData)
            .select('id')
            .single();

          if (customerError) {
            console.error('❌ Customer creation error:', customerError);
            throw new Error('Failed to create customer: ' + customerError.message);
          }
          resolvedCustomerId = newCustomer.id;
        }
      }

      const orderData = {
        user_id: user!.id,
        customer_id: resolvedCustomerId,
        customer_name: customerName,
        customer_address: customerAddress || null,
        customer_gstin: customerGstin || null,
        customer_state: customerState || null,
        invoice_number: invoiceNumber,
        order_date: format(orderDate, 'yyyy-MM-dd'),
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        currency: currency || settings.currency,
        fx_currency: fxCurrency || currency || settings.currency,
        fx_rate_to_base: fxRate,
        total_amount: totalAmount,
        tax_amount: taxAmount,
        cgst_amount: totalCGST,
        sgst_amount: totalSGST,
        igst_amount: totalIGST,
        grand_total: grandTotal,
        status: status,
        amount_paid: amountPaid,
        is_igst: isIGST,
        tax_regime: settings.tax_regime,
        notes: notes || null,
      };

      let orderId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from('sales_orders')
          .update(orderData)
          .eq('id', editingId)
          .eq('user_id', user!.id); // RLS safety
        
        if (error) {
          if (error.code === '42501') {
            throw new Error('Permission denied: please ensure you\'re signed in and RLS policies allow updates for your user.');
          }
          throw error;
        }
        
        // Delete existing lines and re-insert
        await supabase.from('order_lines').delete().eq('order_id', editingId).eq('order_type', 'sale');
      } else {
        const { data, error } = await supabase
          .from('sales_orders')
          .insert(orderData)
          .select()
          .single();
        
        if (error) {
          console.error('❌ Sale insert error:', error);
          if (error.code === '42501') {
            throw new Error('Permission denied: please ensure you\'re signed in and RLS policies allow inserts for your user.');
          }
          if (error.code === '23505' && error.message.includes('invoice_number')) {
            // Suggest next invoice number
            const nextNum = invoiceNumber.replace(/\d+$/, (num) => String(Number(num) + 1));
            throw new Error(`Invoice number ${invoiceNumber} already exists. Try: ${nextNum}`);
          }
          throw error;
        }
        orderId = data.id;
      }

      // Insert order lines with RLS-safe pattern
      const linesData = orderLines.map(line => ({
        order_id: orderId,
        order_type: 'sale' as const,
        product_name: line.product_name,
        description: line.description || null,
        hsn_sac_code: line.hsn_sac_code || null,
        quantity: line.quantity,
        unit_price: line.unit_price,
        tax_rate: line.tax_rate,
        zero_rated: line.zero_rated,
        rcm: line.rcm,
        taxable_amount: line.taxable_amount,
        cgst_amount: line.cgst_amount,
        sgst_amount: line.sgst_amount,
        igst_amount: line.igst_amount,
        tax_amount: line.tax_amount,
        subtotal: line.taxable_amount,
        total_amount: line.total_amount,
      }));
      
      const { error: linesError } = await supabase.from('order_lines').insert(linesData);
      if (linesError) {
        console.error('❌ Line items insert error:', linesError);
        if (linesError.code === '42501') {
          throw new Error('Permission denied when saving line items. Please check RLS policies.');
        }
        throw linesError;
      }

      // Fetch the completed order with computed totals
      const { data: completedOrder } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      console.log('✅ Sale saved:', completedOrder);

      toast({ 
        title: editingId ? 'Sale updated successfully!' : 'Sale created successfully!',
        description: `Invoice ${invoiceNumber} has been saved.`,
      });

      setHasUnsavedChanges(false);
      resetForm();
      setShowForm(false);
      fetchSales();
      
      // Navigate to detail page
      if (orderId) {
        navigate(`/sales/${orderId}`);
      }
    } catch (error: any) {
      console.error('❌ Error saving sale:', error);
      toast({ 
        title: 'Failed to save sale', 
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerGstin('');
    setCustomerState('');
    setCustomerCountry('IN');
    setCustomerId(null);
    setSendInvoiceByEmail(false);
    setOrderDate(new Date());
    setDueDate(undefined);
    setCurrency(settings.currency);
    setFxCurrency(settings.currency);
    setFxRate(1.0);
    setStatus('unpaid');
    setAmountPaid(0);
    setNotes('');
    setIsIGST(false);
    setOrderLines([{
      product_name: '',
      description: '',
      hsn_sac_code: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 18,
      zero_rated: false,
      rcm: false,
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: 0,
      taxable_amount: 0,
      tax_amount: 0,
      total_amount: 0,
    }]);
    setEditingId(null);
    setHasUnsavedChanges(false);
    generateInvoiceNumber();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sale?')) return;
    
    try {
      await supabase.from('order_lines').delete().eq('order_id', id);
      const { error } = await supabase.from('sales_orders').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Sale deleted' });
      fetchSales();
    } catch (error: any) {
      toast({ title: 'Error deleting sale', description: error.message, variant: 'destructive' });
    }
  };

  const getStats = () => {
    const thisMonth = sales.filter(s => {
      const date = new Date(s.transaction_date || s.order_date);
      return date >= dateRange.from && date <= dateRange.to;
    });

    const totalSales = thisMonth.reduce((sum, s) => sum + Number(s.grand_total), 0);
    const outstanding = thisMonth.filter(s => s.payment_status === 'unpaid' || s.payment_status === 'partial')
      .reduce((sum, s) => sum + (Number(s.grand_total) - Number(s.amount_paid)), 0);
    
    return { totalSales, outstanding, count: thisMonth.length };
  };

  const getChartData = () => {
    const monthData: { [key: string]: number } = {};
    sales.forEach(sale => {
      const month = format(new Date(sale.transaction_date || sale.order_date), 'MMM yyyy');
      monthData[month] = (monthData[month] || 0) + Number(sale.grand_total);
    });
    return Object.entries(monthData).map(([month, amount]) => ({ month, amount }));
  };

  const filteredSales = sales.filter(s => {
    if (filterStatus !== 'all' && s.payment_status !== filterStatus) return false;
    const date = new Date(s.transaction_date || s.order_date);
    return date >= dateRange.from && date <= dateRange.to;
  });

  const stats = getStats();

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background pb-24 md:pb-6">
        <Navigation />

        <main className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
          <BackToDashboard />
          
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-foreground">Sales</h1>
              <p className="text-muted-foreground">Track your revenue and customer transactions</p>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
              <Plus className="w-4 h-4" />
              New Sale
            </Button>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">This Month's Sales</CardTitle>
                <DollarSign className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatINR(stats.totalSales)}</div>
                <p className="text-xs text-muted-foreground">{stats.count} transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{formatINR(stats.outstanding)}</div>
                <p className="text-xs text-muted-foreground">Unpaid amount</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <FileText className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sales.length}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatINR(Number(value))} />
                  <Legend />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" name="Sales" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Sales List */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map(sale => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono">{sale.invoice_number}</TableCell>
                        <TableCell>{sale.customer_name}</TableCell>
                        <TableCell>{format(new Date(sale.transaction_date || sale.order_date), 'PP')}</TableCell>
                        <TableCell className="font-bold">{formatINR(sale.grand_total)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            sale.payment_status === 'paid' ? 'default' :
                            sale.payment_status === 'partial' ? 'secondary' : 'destructive'
                          }>
                            {sale.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(sale.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'New'} Sale</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer Name *</Label>
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)} required />
                </div>
                <div>
                  <Label>Customer Email {sendInvoiceByEmail && '*'}</Label>
                  <Input 
                    type="email"
                    value={customerEmail} 
                    onChange={e => setCustomerEmail(e.target.value)} 
                    placeholder="Optional"
                    required={sendInvoiceByEmail}
                  />
                </div>
                <div>
                  <Label>Phone / WhatsApp</Label>
                  <Input 
                    value={customerPhone} 
                    onChange={e => setCustomerPhone(e.target.value)} 
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label>Customer GSTIN / Tax ID</Label>
                  <Input 
                    value={customerGstin} 
                    onChange={e => setCustomerGstin(e.target.value)} 
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Select value={customerCountry} onValueChange={setCustomerCountry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">India</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="AE">UAE</SelectItem>
                      <SelectItem value="SG">Singapore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="sendEmail" 
                      checked={sendInvoiceByEmail} 
                      onCheckedChange={(checked) => setSendInvoiceByEmail(checked as boolean)} 
                    />
                    <Label htmlFor="sendEmail" className="text-sm cursor-pointer">
                      Send invoice by email (requires customer email)
                    </Label>
                  </div>
                </div>
                <div>
                  <Label>Invoice Number *</Label>
                  <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} required />
                </div>
                <div>
                  <Label>Order Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(orderDate, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar 
                        mode="single" 
                        selected={orderDate} 
                        onSelect={(d) => d && setOrderDate(d)} 
                        className="pointer-events-auto" 
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {status !== 'unpaid' && (
                  <div>
                    <Label>Amount Paid</Label>
                    <Input type="number" value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))} />
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Order Items</Label>
                  <Button type="button" size="sm" onClick={addLine}>Add Item</Button>
                </div>
                <div className="space-y-2">
                  {orderLines.map((line, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        <Input placeholder="Product" value={line.product_name} 
                          onChange={e => updateLineCalculations(idx, { product_name: e.target.value })} />
                        <Input placeholder="Qty" type="number" value={line.quantity} 
                          onChange={e => updateLineCalculations(idx, { quantity: Number(e.target.value) })} />
                        <Input placeholder="Price" type="number" value={line.unit_price} 
                          onChange={e => updateLineCalculations(idx, { unit_price: Number(e.target.value) })} />
                        <Input placeholder="Tax %" type="number" value={line.tax_rate} 
                          onChange={e => updateLineCalculations(idx, { tax_rate: Number(e.target.value) })} />
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span>Total: {formatINR(line.total_amount)}</span>
                        {orderLines.length > 1 && (
                          <Button type="button" size="sm" variant="ghost" onClick={() => removeLine(idx)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-right">
                  <div>Subtotal: {formatINR(calculateTotals().totalAmount)}</div>
                  <div>Tax: {formatINR(calculateTotals().taxAmount)}</div>
                  <div className="text-xl font-bold">Total: {formatINR(calculateTotals().grandTotal)}</div>
                </div>
                <Button type="submit">Save Sale</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}
