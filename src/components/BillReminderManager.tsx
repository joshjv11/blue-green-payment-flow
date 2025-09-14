import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const BillReminderManager = () => {
  const { toast } = useToast();
  const [isTestingSend, setIsTestingSend] = useState(false);
  const [isSettingUpSchedule, setIsSettingUpSchedule] = useState(false);

  const testBillReminders = async () => {
    setIsTestingSend(true);
    try {
      console.log('🧪 Testing bill reminder system...');
      
      const { data, error } = await supabase.functions.invoke('send-bill-reminders', {
        body: { test: true, manual: true }
      });

      if (error) throw error;

      toast({
        title: "✅ Test Completed",
        description: `Bill reminders processed: ${data?.billsProcessed || 0} bills, ${data?.emailsSent || 0} emails sent`,
      });

    } catch (error: any) {
      console.error('❌ Test failed:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test bill reminders",
        variant: "destructive",
      });
    } finally {
      setIsTestingSend(false);
    }
  };

  const setupScheduledReminders = async () => {
    setIsSettingUpSchedule(true);
    try {
      console.log('⏰ Setting up scheduled bill reminders...');
      
      const { data, error } = await supabase.functions.invoke('schedule-bill-reminders');

      if (error) throw error;

      toast({
        title: "✅ Reminders Scheduled",
        description: "Daily bill reminders are now active at 9 AM daily",
        duration: 5000,
      });

    } catch (error: any) {
      console.error('❌ Scheduling failed:', error);
      toast({
        title: "Scheduling Failed",
        description: error.message || "Failed to schedule bill reminders",
        variant: "destructive",
      });
    } finally {
      setIsSettingUpSchedule(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Bill Reminder System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <h3 className="font-semibold">Automated Reminders</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Users receive email reminders for bills due today and tomorrow, sent daily at 9 AM.
            </p>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Clock className="h-3 w-3 mr-1" />
              Daily at 9:00 AM
            </Badge>
          </div>

          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold">Smart Notifications</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Only sends reminders for unpaid and overdue bills, with beautiful formatted emails.
            </p>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Contextual & Smart
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={testBillReminders}
              disabled={isTestingSend}
              variant="outline"
              className="flex-1"
            >
              {isTestingSend ? (
                <>Testing...</>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Test Reminders Now
                </>
              )}
            </Button>

            <Button 
              onClick={setupScheduledReminders}
              disabled={isSettingUpSchedule}
              className="flex-1"
            >
              {isSettingUpSchedule ? (
                <>Setting up...</>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Activate Daily Schedule
                </>
              )}
            </Button>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-medium text-amber-800 dark:text-amber-400">Setup Required</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Make sure you have configured the RESEND_API_KEY in your Supabase Edge Functions settings.
                  The system will send emails using your Resend account.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  💡 Tip: Test the system first to ensure everything works before activating daily reminders.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BillReminderManager;