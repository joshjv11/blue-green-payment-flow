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
import { WhatsAppSendModal } from '@/components/WhatsAppSendModal';
import { WhatsAppBroadcastModal } from '@/components/WhatsAppBroadcastModal';
import { supabase } from '@/lib/supabase';
import { MessageCircle, Send, Link as LinkIcon, Clock, CheckCircle2, XCircle, Megaphone, Plus, TrendingUp, Phone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { formatInvoiceForWhatsApp, formatInvoiceSummary, type SalesOrder as SalesOrderType, type OrderLine } from '@/utils/whatsappFormatter';
import { EInvoiceButton } from '@/components/EInvoiceButton';

interface SalesOrder {
  id: string;
  invoice_number: string;
  customer_name: string;
  grand_total: number;
  transaction_date: string;
  payment_status: string;
  billing_snapshot: any;
  subtotal?: number;
  tax_amount?: number;
  amount_paid?: number;
  balance_due?: number;
  customer_gstin?: string;
  customer_address?: string;
  notes?: string;
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
  const [selectedSaleLines, setSelectedSaleLines] = useState<OrderLine[]>([]);
  const [loadingSaleDetails, setLoadingSaleDetails] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
      
      // Set up Realtime subscription for WhatsApp message status updates
      const messagesChannel = supabase
        .channel('whatsapp-messages-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'whatsapp_messages',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('WhatsApp message update:', payload);
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              // Update the message in state
              setWhatsappMessages(prev => {
                const existing = prev.find(m => m.id === payload.new.id);
                if (existing) {
                  // Update existing
                  return prev.map(m => m.id === payload.new.id ? payload.new as WhatsAppMessage : m);
                } else {
                  // Add new
                  return [payload.new as WhatsAppMessage, ...prev].slice(0, 20);
                }
              });
              
              // Show toast for status changes
              if (payload.eventType === 'UPDATE' && payload.old.status !== payload.new.status) {
                const status = (payload.new as any).status;
                if (status === 'sent' || status === 'delivered') {
                  toast.success(`Message ${status} successfully`);
                } else if (status === 'failed') {
                  toast.error('Message failed to send');
                }
              }
            } else if (payload.eventType === 'DELETE') {
              setWhatsappMessages(prev => prev.filter(m => m.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load recent sales orders (including e-invoice fields)
      const { data: sales, error: salesError } = await supabase
        .from('sales_orders')
        .select('*, irn, einvoice_status, eway_bill_no, qr_code_url, gstn_ack_no')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (salesError) throw salesError;
      setSalesOrders((sales || []) as any);

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

  const handleSendInvoice = async (sale: SalesOrder) => {
    setSelectedSale(sale);
    setLoadingSaleDetails(true);
    
    try {
      // Fetch order lines for this sale
      const { data: orderLines, error: linesError } = await supabase
        .from('order_lines')
        .select('*')
        .eq('order_id', sale.id)
        .eq('order_type', 'sale')
        .order('created_at', { ascending: true });
      
      if (linesError) {
        console.error('Error fetching order lines:', linesError);
        toast.error('Failed to load invoice details');
      } else {
        setSelectedSaleLines(orderLines || []);
      }
    } catch (error) {
      console.error('Error loading sale details:', error);
      toast.error('Failed to load invoice details');
    } finally {
      setLoadingSaleDetails(false);
      setModalOpen(true);
    }
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

  // Generate formatted invoice message
  const getDefaultMessage = () => {
    if (!selectedSale) return '';
    
    try {
      // Use full format if we have order lines, otherwise use summary
      if (selectedSaleLines.length > 0) {
        return formatInvoiceForWhatsApp(selectedSale as SalesOrderType, selectedSaleLines, 'sale');
      } else {
        return formatInvoiceSummary(selectedSale as SalesOrderType, 'sale');
      }
    } catch (error) {
      console.error('Error formatting invoice message:', error);
      // Fallback to simple message
      return `🧾 Invoice ${selectedSale.invoice_number || 'N/A'}\nAmount: ₹${(selectedSale.grand_total || 0).toFixed(2)}\nThank you! 🙏`;
    }
  };

  const defaultMessage = getDefaultMessage();
  const defaultPhone = selectedSale?.billing_snapshot?.phone || '';

  return (
    <div className="min-h-screen bg-background">
      
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-6 space-y-4 md:space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 rounded-lg md:rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
                <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              WhatsApp Messages
            </h1>
            <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
              Send private messages directly to your customers
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => {
                setSelectedSale(null);
                setModalOpen(true);
              }} 
              className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 w-full sm:w-auto"
              size="lg"
            >
              <Plus className="h-4 w-4" />
              New Message
            </Button>
            <Button 
              onClick={() => setBroadcastModalOpen(true)} 
              variant="outline" 
              className="gap-2 w-full sm:w-auto"
              size="lg"
            >
              <Megaphone className="h-4 w-4" />
              Broadcast
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4 md:pt-6">
                  <Skeleton className="h-6 md:h-8 w-16 md:w-20 mb-2" />
                  <Skeleton className="h-3 md:h-4 w-24 md:w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Sent</p>
                    <p className="text-2xl md:text-3xl font-bold text-green-700 dark:text-green-400 mt-1">
                      {whatsappMessages.length}
                    </p>
                  </div>
                  <div className="p-2 md:p-3 rounded-lg bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                    <MessageCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-muted-foreground">Delivered</p>
                    <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                      {whatsappMessages.filter(m => m.status === 'delivered' || m.status === 'read').length}
                    </p>
                  </div>
                  <div className="p-2 md:p-3 rounded-lg bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-muted-foreground">Pending</p>
                    <p className="text-2xl md:text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                      {whatsappMessages.filter(m => m.status === 'pending' || m.status === 'queued').length}
                    </p>
                  </div>
                  <div className="p-2 md:p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex-shrink-0">
                    <Clock className="h-4 w-4 md:h-5 md:w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-muted-foreground">Failed</p>
                    <p className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                      {whatsappMessages.filter(m => m.status === 'failed').length}
                    </p>
                  </div>
                  <div className="p-2 md:p-3 rounded-lg bg-red-100 dark:bg-red-900/30 flex-shrink-0">
                    <XCircle className="h-4 w-4 md:h-5 md:w-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        {salesOrders.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Quick Send</CardTitle>
                  <CardDescription>Send invoices or payment links from recent sales</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : salesOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent sales to send</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salesOrders.slice(0, 5).map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="font-medium">{sale.invoice_number}</div>
                          <Badge variant={sale.payment_status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                            {sale.payment_status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {sale.customer_name} • ₹{sale.grand_total.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendInvoice(sale)}
                          className="gap-2"
                        >
                          <Send className="h-3 w-3" />
                          Send
                        </Button>
                        <EInvoiceButton
                          salesOrderId={sale.id}
                          irn={(sale as any).irn}
                          einvoiceStatus={(sale as any).einvoice_status}
                          ewayBillNo={(sale as any).eway_bill_no}
                          qrCodeUrl={(sale as any).qr_code_url}
                          onSuccess={() => loadData()}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Messages */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Messages</CardTitle>
                <CardDescription>Your WhatsApp message history</CardDescription>
              </div>
              {whatsappMessages.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {whatsappMessages.filter(m => m.status === 'delivered' || m.status === 'read').length} delivered
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : whatsappMessages.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 rounded-full bg-muted w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No messages yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start sending messages to your customers
                </p>
                <Button onClick={() => setModalOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Send Your First Message
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {whatsappMessages.slice(0, 10).map((message) => (
                  <div key={message.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {getStatusIcon(message.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{message.phone_number}</span>
                          <Badge variant="outline" className="text-xs">
                            {message.message_type}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {message.sent_at 
                            ? new Date(message.sent_at).toLocaleString('en-IN', { 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })
                            : 'Not sent yet'}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(message.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <WhatsAppSendModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setSelectedSale(null);
            setSelectedSaleLines([]);
            loadData(); // Refresh data when modal closes
          }
        }}
        defaultPhone={defaultPhone}
        defaultMessage={defaultMessage}
        messageType={selectedSale ? "invoice" : "custom"}
        invoiceId={selectedSale?.id}
        amount={selectedSale?.grand_total}
        invoiceNumber={selectedSale?.invoice_number}
        isLoading={loadingSaleDetails}
      />

      <WhatsAppBroadcastModal
        open={broadcastModalOpen}
        onOpenChange={(open) => {
          setBroadcastModalOpen(open);
          if (!open) {
            loadData(); // Refresh data when modal closes
          }
        }}
      />
    </div>
  );
}
