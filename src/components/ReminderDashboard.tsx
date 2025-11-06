import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  Calendar,
  Mail,
  Eye,
  Zap
} from 'lucide-react';
import { formatDistanceToNow, format, parseISO } from 'date-fns';

interface BillReminder {
  id: string;
  bill_id: string;
  reminder_date: string;
  reminder_days_before: number;
  status: string;
  email_sent_at: string | null;
  delivery_status: string;
  retry_count: number;
  error_message: string | null;
  priority: string;
  created_at: string;
  bills: {
    name: string;
    amount: number;
    due_date: string;
    category: string;
    status: string;
  };
}

const ReminderDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<BillReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingTest, setSendingTest] = useState<string | null>(null);

  const fetchReminders = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bill_reminders')
        .select(`
          *,
          bills (
            name, amount, due_date, category, status
          )
        `)
        .eq('user_id', user.id)
        .order('reminder_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setReminders(data || []);
    } catch (error: any) {
      console.error('Error fetching reminders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch reminders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshReminders = async () => {
    setRefreshing(true);
    await fetchReminders();
    setRefreshing(false);
  };

  const sendTestReminder = async (reminderId: string) => {
    setSendingTest(reminderId);
    try {
      const { error } = await supabase.functions.invoke('send-individual-reminder', {
        body: {
          reminder_id: reminderId,
          scheduled: false
        }
      });

      if (error) throw error;

      toast({
        title: "Test Reminder Sent",
        description: "The reminder email has been sent successfully",
      });

      await refreshReminders();
    } catch (error: any) {
      console.error('Error sending test reminder:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test reminder",
        variant: "destructive",
      });
    } finally {
      setSendingTest(null);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [user]);

  const getStatusIcon = (status: string, deliveryStatus: string) => {
    switch (status) {
      case 'sent':
        return deliveryStatus === 'delivered' ? 
          <CheckCircle className="h-4 w-4 text-green-600" /> :
          <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: string, deliveryStatus: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant={deliveryStatus === 'delivered' ? 'default' : 'secondary'} className="bg-green-100 text-green-800">
            {deliveryStatus === 'delivered' ? 'Delivered' : 'Sent'}
          </Badge>
        );
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800'
    };
    
    return (
      <Badge variant="secondary" className={colors[priority as keyof typeof colors]}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const stats = {
    total: reminders.length,
    pending: reminders.filter(r => r.status === 'pending').length,
    sent: reminders.filter(r => r.status === 'sent').length,
    failed: reminders.filter(r => r.status === 'failed').length,
    delivered: reminders.filter(r => r.delivery_status === 'delivered').length
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading reminder dashboard...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
            <div className="text-sm text-muted-foreground">Sent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{stats.delivered}</div>
            <div className="text-sm text-muted-foreground">Delivered</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Bill Reminder Dashboard
            </CardTitle>
            <Button 
              onClick={refreshReminders} 
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Reminders Yet</h3>
              <p className="text-muted-foreground">
                When you add bills with reminders enabled, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(reminder.status, reminder.delivery_status)}
                        <h4 className="font-semibold text-lg">{reminder.bills.name}</h4>
                        {getPriorityBadge(reminder.priority)}
                        {getStatusBadge(reminder.status, reminder.delivery_status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Amount:</span>
                          <div className="font-semibold">₹{reminder.bills.amount.toLocaleString('en-IN')}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Due Date:</span>
                          <div className="font-semibold">
                            {format(parseISO(reminder.bills.due_date), 'MMM dd, yyyy')}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Reminder Date:</span>
                          <div className="font-semibold">
                            {format(parseISO(reminder.reminder_date), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </div>

                      {reminder.email_sent_at && (
                        <div className="text-sm text-muted-foreground mt-2">
                          Sent {formatDistanceToNow(parseISO(reminder.email_sent_at), { addSuffix: true })}
                        </div>
                      )}

                      {reminder.error_message && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded mt-2">
                          <strong>Error:</strong> {reminder.error_message}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      {reminder.status === 'pending' && (
                        <Button
                          onClick={() => sendTestReminder(reminder.id)}
                          disabled={sendingTest === reminder.id}
                          size="sm"
                          variant="outline"
                        >
                          {sendingTest === reminder.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Zap className="h-4 w-4 mr-2" />
                          )}
                          Send Now
                        </Button>
                      )}
                      
                      {reminder.status === 'failed' && (
                        <Button
                          onClick={() => sendTestReminder(reminder.id)}
                          disabled={sendingTest === reminder.id}
                          size="sm"
                          variant="outline"
                        >
                          {sendingTest === reminder.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReminderDashboard;