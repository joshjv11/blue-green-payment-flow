import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AppNavigation from '@/components/AppNavigation';
import { WhatsAppSendModal } from '@/components/WhatsAppSendModal';
import { WhatsAppBroadcastModal } from '@/components/WhatsAppBroadcastModal';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Send, Link as LinkIcon, Clock, CheckCircle2, XCircle, Megaphone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SalesOrder {
  id: string;
  invoice_number: string;
  customer_name: string;
  grand_total: number;
  transaction_date: string;
  payment_status: string;
  billing_snapshot: any;
}

interface WhatsAppMessage {
  id: string;
  phone_number: string;
  message_type: string;
  status: string;
  sent_at: string;
  created_at: string;
}

export default function WhatsAppDashboard() {
  const { user } = useAuth();
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [whatsappMessages, setWhatsappMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SalesOrder | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load recent sales orders
      const { data: sales, error: salesError } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (salesError) throw salesError;
      setSalesOrders(sales || []);

      // Load recent WhatsApp messages
      const { data: messages, error: messagesError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (messagesError) throw messagesError;
      setWhatsappMessages(messages || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = (sale: SalesOrder) => {
    setSelectedSale(sale);
    setModalOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'read':
      case 'sent':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending':
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      delivered: "default",
      read: "default",
      sent: "secondary",
      failed: "destructive",
      pending: "outline",
      queued: "outline"
    };

    return (
      <Badge variant={variants[status] || "outline"} className="gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  const defaultMessage = selectedSale
    ? `🧾 *Invoice Notification*\n\nInvoice No: ${selectedSale.invoice_number}\nAmount: ₹${selectedSale.grand_total.toFixed(2)}\nDate: ${new Date(selectedSale.transaction_date).toLocaleDateString('en-IN')}\n\nThank you for your business! 🙏`
    : '';

  const defaultPhone = selectedSale?.billing_snapshot?.phone || '';

  return (
    <div className="min-h-screen bg-background">
      <AppNavigation />
      
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MessageCircle className="h-8 w-8 text-green-600" />
              WhatsApp Business
            </h1>
            <p className="text-muted-foreground mt-1">
              Send invoices, payment links, and reminders directly via WhatsApp
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setBroadcastModalOpen(true)} variant="outline" className="gap-2">
              <Megaphone className="h-4 w-4" />
              Broadcast
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Sent</CardDescription>
              <CardTitle className="text-2xl">{whatsappMessages.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Delivered</CardDescription>
              <CardTitle className="text-2xl text-green-600">
                {whatsappMessages.filter(m => m.status === 'delivered' || m.status === 'read').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-2xl text-yellow-600">
                {whatsappMessages.filter(m => m.status === 'pending' || m.status === 'queued').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Failed</CardDescription>
              <CardTitle className="text-2xl text-destructive">
                {whatsappMessages.filter(m => m.status === 'failed').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Recent Sales - Ready to Send */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales - Send via WhatsApp</CardTitle>
            <CardDescription>Send invoice notifications and payment links to your customers</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesOrders.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.invoice_number}</TableCell>
                    <TableCell>{sale.customer_name}</TableCell>
                    <TableCell>₹{sale.grand_total.toFixed(2)}</TableCell>
                    <TableCell>{new Date(sale.transaction_date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>
                      <Badge variant={sale.payment_status === 'paid' ? 'default' : 'secondary'}>
                        {sale.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendInvoice(sale)}
                        className="gap-2"
                      >
                        <Send className="h-3 w-3" />
                        Invoice
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleSendInvoice(sale)}
                        className="gap-2"
                      >
                        <LinkIcon className="h-3 w-3" />
                        Pay Link
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent WhatsApp Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Recent WhatsApp Messages</CardTitle>
            <CardDescription>Track your sent messages and their delivery status</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {whatsappMessages.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell className="font-mono">{message.phone_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{message.message_type}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(message.status)}</TableCell>
                    <TableCell>
                      {message.sent_at 
                        ? new Date(message.sent_at).toLocaleString('en-IN')
                        : 'Not sent'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Feature Info */}
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="text-green-900 dark:text-green-100">
              Why WhatsApp for Business?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <strong>90%+ Open Rate</strong> vs 15-20% for Email
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Instant delivery to customer's most-used app
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Send invoices, payment reminders, and payment links
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Customers can reply with payment proof directly
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Automated payment reminders 24hrs before due date
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {selectedSale && (
        <WhatsAppSendModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          defaultPhone={defaultPhone}
          defaultMessage={defaultMessage}
          messageType="invoice"
          invoiceId={selectedSale.id}
          amount={selectedSale.grand_total}
          invoiceNumber={selectedSale.invoice_number}
        />
      )}

      <WhatsAppBroadcastModal
        open={broadcastModalOpen}
        onOpenChange={setBroadcastModalOpen}
      />
    </div>
  );
}
