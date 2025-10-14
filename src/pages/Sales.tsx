import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, DollarSign, FileText, Filter, Calendar as CalendarIcon, Download, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Navigation } from '@/components/Navigation';
import { MobileLayout } from '@/components/MobileLayout';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { formatINR } from '@/utils/currency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface OrderLine {
  id?: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
}

interface SalesOrder {
  id: string;
  customer_name: string;
  invoice_number: string;
  transaction_date: string;
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
  const [sales, setSales] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
  
  // Form state
  const [customerName, setCustomerName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid' | 'partial'>('unpaid');
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState('');
  const [orderLines, setOrderLines] = useState<OrderLine[]>([{
    product_name: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 0,
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
  }]);

  useEffect(() => {
    if (user) {
      fetchSales();
      generateInvoiceNumber();
    }
  }, [user]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('user_id', user!.id)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setSales((data || []) as SalesOrder[]);
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
    const totalAmount = orderLines.reduce((sum, line) => sum + line.subtotal, 0);
    const taxAmount = orderLines.reduce((sum, line) => sum + line.tax_amount, 0);
    const grandTotal = totalAmount + taxAmount;
    return { totalAmount, taxAmount, grandTotal };
  };

  const updateLineCalculations = (index: number, updates: Partial<OrderLine>) => {
    const newLines = [...orderLines];
    newLines[index] = { ...newLines[index], ...updates };
    
    const qty = newLines[index].quantity;
    const price = newLines[index].unit_price;
    const taxRate = newLines[index].tax_rate;
    
    const subtotal = qty * price;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    
    newLines[index] = {
      ...newLines[index],
      subtotal,
      tax_amount: tax,
      total_amount: total,
    };
    
    setOrderLines(newLines);
  };

  const addLine = () => {
    setOrderLines([...orderLines, {
      product_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
    }]);
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

    const { totalAmount, taxAmount, grandTotal } = calculateTotals();

    try {
      const orderData = {
        user_id: user!.id,
        customer_name: customerName,
        invoice_number: invoiceNumber,
        transaction_date: format(transactionDate, 'yyyy-MM-dd'),
        total_amount: totalAmount,
        tax_amount: taxAmount,
        grand_total: grandTotal,
        payment_status: paymentStatus,
        amount_paid: amountPaid,
        notes: notes || null,
      };

      let orderId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from('sales_orders')
          .update(orderData)
          .eq('id', editingId);
        if (error) throw error;
        
        // Delete existing lines
        await supabase.from('order_lines').delete().eq('order_id', editingId);
      } else {
        const { data, error } = await supabase
          .from('sales_orders')
          .insert(orderData)
          .select()
          .single();
        if (error) throw error;
        orderId = data.id;
      }

      // Insert order lines
      const linesData = orderLines.map(line => ({
        order_id: orderId,
        order_type: 'sale' as const,
        ...line,
      }));
      
      const { error: linesError } = await supabase.from('order_lines').insert(linesData);
      if (linesError) throw linesError;

      toast({ title: editingId ? 'Sale updated!' : 'Sale created!' });
      resetForm();
      setShowForm(false);
      fetchSales();
    } catch (error: any) {
      toast({ title: 'Error saving sale', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setTransactionDate(new Date());
    setPaymentStatus('unpaid');
    setAmountPaid(0);
    setNotes('');
    setOrderLines([{
      product_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
    }]);
    setEditingId(null);
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
      const date = new Date(s.transaction_date);
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
      const month = format(new Date(sale.transaction_date), 'MMM yyyy');
      monthData[month] = (monthData[month] || 0) + Number(sale.grand_total);
    });
    return Object.entries(monthData).map(([month, amount]) => ({ month, amount }));
  };

  const filteredSales = sales.filter(s => {
    if (filterStatus !== 'all' && s.payment_status !== filterStatus) return false;
    const date = new Date(s.transaction_date);
    return date >= dateRange.from && date <= dateRange.to;
  });

  const stats = getStats();

  return (
    <MobileLayout>
      <div className="min-h-screen bg-background pb-24 md:pb-6">
        <Navigation />

        <main className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
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
                        <TableCell>{format(new Date(sale.transaction_date), 'PP')}</TableCell>
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
                  <Label>Invoice Number *</Label>
                  <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} required />
                </div>
                <div>
                  <Label>Transaction Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(transactionDate, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={transactionDate} onSelect={(d) => d && setTransactionDate(d)} 
                        className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <Select value={paymentStatus} onValueChange={(v: any) => setPaymentStatus(v)}>
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
                {paymentStatus !== 'unpaid' && (
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
