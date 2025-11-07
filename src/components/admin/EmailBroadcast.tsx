import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Send, Loader2, X, Plus, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const FROM_EMAILS = [
  { value: 'personal', label: 'joshuavaz55@gmail.com', address: 'joshuavaz55@gmail.com' },
  { value: 'invoiceflow', label: 'InvoiceFlow (no-reply@invoiceflow.dev)', address: 'InvoiceFlow <no-reply@invoiceflow.dev>' },
];

export function EmailBroadcast() {
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [fromEmail, setFromEmail] = useState('invoiceflow');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState('');
  const [sending, setSending] = useState(false);
  const [userEmails, setUserEmails] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Load user emails for quick selection
  const loadUserEmails = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .not('email', 'is', null);

      if (error) throw error;

      const emails = (data || []).map(u => u.email).filter(Boolean) as string[];
      setUserEmails(emails);
      
      toast({
        title: 'User Emails Loaded',
        description: `Found ${emails.length} user email addresses`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load user emails',
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Add recipient
  const addRecipient = () => {
    const email = newRecipient.trim().toLowerCase();
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    if (recipients.includes(email)) {
      toast({
        title: 'Duplicate Email',
        description: 'This email is already in the recipient list',
        variant: 'destructive',
      });
      return;
    }

    setRecipients([...recipients, email]);
    setNewRecipient('');
  };

  // Remove recipient
  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(e => e !== email));
  };

  // Add multiple emails from user list
  const addUserEmails = (emails: string[]) => {
    const newEmails = emails.filter(e => !recipients.includes(e.toLowerCase()));
    setRecipients([...recipients, ...newEmails.map(e => e.toLowerCase())]);
  };

  // Send broadcast email
  const sendBroadcast = async () => {
    if (!subject.trim()) {
      toast({
        title: 'Subject Required',
        description: 'Please enter an email subject',
        variant: 'destructive',
      });
      return;
    }

    if (!body.trim()) {
      toast({
        title: 'Body Required',
        description: 'Please enter email content',
        variant: 'destructive',
      });
      return;
    }

    if (recipients.length === 0) {
      toast({
        title: 'Recipients Required',
        description: 'Please add at least one recipient',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const selectedFrom = FROM_EMAILS.find(e => e.value === fromEmail);
      const fromAddress = selectedFrom?.address || FROM_EMAILS[0].address;

      // Create HTML email template
      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px 25px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">💰 InvoiceFlow</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 25px;">
              <div style="font-size: 16px; line-height: 1.6; color: #1f2937; white-space: pre-wrap;">
                ${body.replace(/\n/g, '<br>')}
              </div>
            </div>
            
            <!-- Footer -->
            <hr style="border: none; border-top: 2px solid #e5e7eb; margin: 35px 0;">
            <div style="text-align: center; padding: 20px;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                This email was sent from InvoiceFlow Admin Panel
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send via edge function (which uses Resend)
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // First, check if the edge function is accessible
      try {
        const testResponse = await supabase.functions.invoke('send-broadcast-email', {
          body: { test: true },
        });
      } catch (testErr: any) {
        // If edge function doesn't exist, show helpful message
        if (testErr.message?.includes('not found') || testErr.message?.includes('404')) {
          toast({
            title: 'Edge Function Not Deployed',
            description: 'Please deploy the send-broadcast-email edge function first. Run: supabase functions deploy send-broadcast-email',
            variant: 'destructive',
          });
          setSending(false);
          return;
        }
      }

      for (const recipient of recipients) {
        try {
          const { data, error } = await supabase.functions.invoke('send-broadcast-email', {
            body: {
              to: recipient,
              from: fromAddress,
              subject: subject,
              html: htmlBody,
              text: body,
            },
          });

          if (error) {
            console.error(`Failed to send to ${recipient}:`, error);
            const errorMsg = error.message || 'Unknown error';
            errors.push(`${recipient}: ${errorMsg}`);
            errorCount++;
          } else if (data && !data.success) {
            // Edge function returned an error response
            const errorMsg = data.error || data.message || 'Failed to send email';
            console.error(`Failed to send to ${recipient}:`, data);
            errors.push(`${recipient}: ${errorMsg}`);
            errorCount++;
          } else {
            console.log(`✅ Email sent to ${recipient}`);
            successCount++;
          }
        } catch (err: any) {
          console.error(`Error sending to ${recipient}:`, err);
          const errorMsg = err.message || 'Network error or edge function not deployed';
          errors.push(`${recipient}: ${errorMsg}`);
          errorCount++;
        }
      }

      // Show detailed error message
      if (errorCount > 0) {
        const errorDetails = errors.slice(0, 3).join('; '); // Show first 3 errors
        const moreErrors = errors.length > 3 ? ` (and ${errors.length - 3} more)` : '';
        
        toast({
          title: 'Broadcast Complete',
          description: `Sent ${successCount} email${successCount !== 1 ? 's' : ''}. ${errorCount} failed.${errorDetails ? ` Errors: ${errorDetails}${moreErrors}` : ''}`,
          variant: errorCount === recipients.length ? 'destructive' : 'default',
        });
      } else {
        toast({
          title: 'Broadcast Complete',
          description: `Successfully sent ${successCount} email${successCount !== 1 ? 's' : ''}`,
        });
      }

      // Clear form on success
      if (successCount > 0) {
        setSubject('');
        setBody('');
        setRecipients([]);
      }
    } catch (error: any) {
      console.error('Broadcast error:', error);
      toast({
        title: 'Broadcast Failed',
        description: error.message || 'Failed to send emails',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Broadcast
          </CardTitle>
          <CardDescription>
            Send emails to multiple recipients using Resend API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* From Email Selection */}
          <div className="space-y-2">
            <Label htmlFor="from-email">From Email</Label>
            <Select value={fromEmail} onValueChange={setFromEmail}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FROM_EMAILS.map((email) => (
                  <SelectItem key={email.value} value={email.value}>
                    {email.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fromEmail === 'personal' && (
              <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                <AlertDescription className="text-xs">
                  <strong>Note:</strong> Personal Gmail addresses need to be verified in Resend. If not verified, emails will be sent from the default InvoiceFlow address.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line..."
            />
          </div>

          {/* Email Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Email Body</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email message here..."
              className="min-h-[200px]"
            />
          </div>

          {/* Recipients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Recipients ({recipients.length})</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={loadUserEmails}
                disabled={loadingUsers}
                className="gap-2"
              >
                {loadingUsers ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                Load User Emails
              </Button>
            </div>

            {/* Add Recipient */}
            <div className="flex gap-2">
              <Input
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addRecipient();
                  }
                }}
                placeholder="Enter email address..."
              />
              <Button onClick={addRecipient} variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Add from User List */}
            {userEmails.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Quick Add Users:</Label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
                  {userEmails.slice(0, 20).map((email) => (
                    <Badge
                      key={email}
                      variant={recipients.includes(email.toLowerCase()) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        if (recipients.includes(email.toLowerCase())) {
                          removeRecipient(email.toLowerCase());
                        } else {
                          setRecipients([...recipients, email.toLowerCase()]);
                        }
                      }}
                    >
                      {email}
                    </Badge>
                  ))}
                </div>
                {userEmails.length > 20 && (
                  <p className="text-xs text-muted-foreground">
                    Showing first 20 of {userEmails.length} emails. Add individually or select all.
                  </p>
                )}
              </div>
            )}

            {/* Recipient List */}
            {recipients.length > 0 && (
              <div className="space-y-2">
                <Label>Recipient List</Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[60px]">
                  {recipients.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {email}
                      <button
                        onClick={() => removeRecipient(email)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Send Button */}
          <Button
            onClick={sendBroadcast}
            disabled={sending || !subject.trim() || !body.trim() || recipients.length === 0}
            className="w-full gap-2"
            size="lg"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending to {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send to {recipients.length} Recipient{recipients.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>

          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription className="text-xs space-y-1">
              <p><strong>Requirements:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Deploy edge function: <code className="bg-muted px-1 rounded">supabase functions deploy send-broadcast-email</code></li>
                <li>Set <code className="bg-muted px-1 rounded">RESEND_API_KEY</code> in Supabase Edge Functions secrets</li>
                <li>Verify domain/email in Resend dashboard if using custom from address</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

