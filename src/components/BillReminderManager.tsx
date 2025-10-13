import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Clock, CheckCircle, AlertCircle, TestTube, Calendar, Send, Loader2, Settings } from 'lucide-react';

const BillReminderManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isTestingSend, setIsTestingSend] = useState(false);
  const [isSettingUpSchedule, setIsSettingUpSchedule] = useState(false);
  const [isTestingComprehensive, setIsTestingComprehensive] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const testBillReminders = async () => {
    setIsTestingSend(true);
    try {
      console.log('🧪 Testing enhanced bill reminder system...');
      
      const { data, error } = await supabase.functions.invoke('send-bill-reminders-enhanced', {
        body: { test: true, manual: true }
      });

      if (error) throw error;

      toast({
        title: "✅ Test Completed",
        description: `Enhanced bill reminders processed: ${data?.billsProcessed || 0} bills, ${data?.emailsSent || 0} emails sent`,
      });

    } catch (error: any) {
      console.error('❌ Test failed:', error);
      toast({
        title: "Test Failed", 
        description: error.message || "Failed to test enhanced bill reminders",
        variant: "destructive",
      });
    } finally {
      setIsTestingSend(false);
    }
  };

  const sendComprehensiveTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: "Email Required",
        description: "Please enter an email address for the test",
        variant: "destructive",
      });
      return;
    }

    setIsTestingComprehensive(true);
    try {
      console.log('📧 Sending comprehensive test email...');
      
      const { data, error } = await supabase.functions.invoke('send-comprehensive-test-email', {
        body: { 
          email: testEmail,
          testType: 'manual_admin_test'
        }
      });

      if (error) throw error;

      toast({
        title: "✅ Test Email Sent!",
        description: `Comprehensive test email sent to ${testEmail} with sample bill data`,
      });

    } catch (error: any) {
      console.error('❌ Test email failed:', error);
      toast({
        title: "Test Email Failed",
        description: error.message || "Failed to send comprehensive test email",
        variant: "destructive",
      });
    } finally {
      setIsTestingComprehensive(false);
    }
  };

  const setupScheduledReminders = async () => {
    setIsSettingUpSchedule(true);
    try {
      console.log('⏰ Setting up enhanced scheduled bill reminders...');
      
      const { data, error } = await supabase.functions.invoke('schedule-bill-reminders');

      if (error) throw error;

      toast({
        title: "✅ Enhanced Reminders Scheduled",
        description: "Daily bill reminders are now active at 9:00 AM IST with professional formatting",
        duration: 7000,
      });

    } catch (error: any) {
      console.error('❌ Enhanced scheduling failed:', error);
      toast({
        title: "Scheduling Failed",
        description: error.message || "Failed to schedule enhanced bill reminders", 
        variant: "destructive",
      });
    } finally {
      setIsSettingUpSchedule(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Enhanced Email Bill Reminder System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* System Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <h3 className="font-semibold text-green-800 dark:text-green-400">Professional Emails</h3>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              Beautiful HTML emails with INR formatting, bill details, and call-to-action buttons.
            </p>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Mail className="h-3 w-3 mr-1" />
              HTML & Responsive
            </Badge>
          </div>

          <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-blue-800 dark:text-blue-400">Smart Scheduling</h3>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Automated daily reminders at 9:00 AM IST with retry mechanisms and error handling.
            </p>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Calendar className="h-3 w-3 mr-1" />
              9:00 AM IST Daily
            </Badge>
          </div>

          <div className="space-y-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-purple-600" />
              <h3 className="font-semibold text-purple-800 dark:text-purple-400">Advanced Features</h3>
            </div>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              User preferences, professional formatting, comprehensive logging, and delivery verification.
            </p>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              Enterprise Grade
            </Badge>
          </div>
        </div>

        {/* Test Functions */}
        <div className="space-y-6">
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TestTube className="h-5 w-5 text-blue-600" />
              Testing & Verification
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Live System Test */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium">Live System Test</h4>
                <p className="text-sm text-muted-foreground">
                  Test the actual bill reminder system with your current bills and user data.
                </p>
                <Button 
                  onClick={testBillReminders}
                  disabled={isTestingSend}
                  variant="outline"
                  className="w-full"
                >
                  {isTestingSend ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing Live System...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Test Live Bill Reminders
                    </>
                  )}
                </Button>
              </div>

              {/* Comprehensive Test Email */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium">Comprehensive Test Email</h4>
                <p className="text-sm text-muted-foreground">
                  Send a sample email with mock bill data to verify formatting and delivery.
                </p>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="test-email">Test Email Address</Label>
                    <Input
                      id="test-email"
                      type="email"
                      placeholder="admin@company.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={sendComprehensiveTestEmail}
                    disabled={isTestingComprehensive}
                    className="w-full"
                  >
                    {isTestingComprehensive ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending Test...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Test Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Management */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Schedule Management
            </h3>
            
            <div className="space-y-4">
              <Button 
                onClick={setupScheduledReminders}
                disabled={isSettingUpSchedule}
                size="lg"
                className="w-full"
              >
                {isSettingUpSchedule ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting Up Enhanced Schedule...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Activate Enhanced Daily Schedule (9:00 AM IST)
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BillReminderManager;