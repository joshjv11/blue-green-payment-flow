import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import emailjs from '@emailjs/browser';
import { useToast } from '@/hooks/use-toast';

interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  status: 'paid' | 'unpaid' | 'overdue';
  notes?: string;
}

interface UserSettings {
  defaultReminderDays: number;
  notificationsEnabled: boolean;
  notificationPermission: string;
  emailRemindersEnabled: boolean;
  reminderEmail: string;
}

export const useEmailReminders = () => {
  const { toast } = useToast();
  const [bills] = useLocalStorage<Bill[]>('bills', []);
  const [settings] = useLocalStorage<UserSettings>('userSettings', {
    defaultReminderDays: 3,
    notificationsEnabled: false,
    notificationPermission: 'default',
    emailRemindersEnabled: false,
    reminderEmail: ''
  });

  // Initialize EmailJS with demo public key (for demo purposes only)
  useEffect(() => {
    emailjs.init('demo_public_key');
  }, []);

  const sendDemoEmail = async (subject: string, message: string, billsData: Bill[]) => {
    if (!settings.emailRemindersEnabled || !settings.reminderEmail) {
      return;
    }

    try {
      // Demo email template parameters
      const templateParams = {
        to_email: settings.reminderEmail,
        subject: subject,
        message: message,
        bills_list: billsData.map(bill => 
          `• ${bill.name} - $${bill.amount.toFixed(2)} (Due: ${new Date(bill.due_date).toLocaleDateString()})`
        ).join('\n'),
        app_name: 'InvoiceFlow',
        demo_notice: 'This is a demo email. Upgrade to connect real email reminders.'
      };

      // For demo purposes, we'll simulate sending an email
      console.log('Demo Email would be sent:', templateParams);
      
      // Show a toast notification instead of actual email
      toast({
        title: "Demo Email Sent! 📧",
        description: `Email reminder sent to ${settings.reminderEmail}. This is a demo - upgrade for real email integration.`,
      });

      // In a real implementation, you would use:
      // await emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams);
      
    } catch (error) {
      console.error('Error sending demo email:', error);
      toast({
        title: "Demo Email Error",
        description: "Failed to send demo email. In production, please configure your email service.",
        variant: "destructive"
      });
    }
  };

  const checkBillsForEmailReminders = async () => {
    if (!settings.emailRemindersEnabled || !settings.reminderEmail) {
      return;
    }

    const today = new Date();
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(today.getDate() + 2);

    // Bills due today
    const billsDueToday = bills.filter(bill => {
      if (bill.status === 'paid') return false;
      const dueDate = new Date(bill.due_date);
      return dueDate.toDateString() === today.toDateString();
    });

    // Overdue bills
    const overdueBills = bills.filter(bill => {
      if (bill.status === 'paid') return false;
      const dueDate = new Date(bill.due_date);
      return dueDate < today;
    });

    // Bills due soon (next 2 days)
    const billsDueSoon = bills.filter(bill => {
      if (bill.status === 'paid') return false;
      const dueDate = new Date(bill.due_date);
      return dueDate > today && dueDate <= twoDaysFromNow;
    });

    // Send email for bills due today
    if (billsDueToday.length > 0) {
      await sendDemoEmail(
        `${billsDueToday.length} Bill${billsDueToday.length > 1 ? 's' : ''} Due Today!`,
        `You have ${billsDueToday.length} bill${billsDueToday.length > 1 ? 's' : ''} due today. Don't forget to pay them to avoid late fees.`,
        billsDueToday
      );
    }

    // Send email for overdue bills
    if (overdueBills.length > 0) {
      await sendDemoEmail(
        `${overdueBills.length} Overdue Bill${overdueBills.length > 1 ? 's' : ''} - Action Required`,
        `You have ${overdueBills.length} overdue bill${overdueBills.length > 1 ? 's' : ''}. Please pay them as soon as possible to avoid additional fees.`,
        overdueBills
      );
    }

    // Send email for bills due soon
    if (billsDueSoon.length > 0) {
      await sendDemoEmail(
        `${billsDueSoon.length} Bill${billsDueSoon.length > 1 ? 's' : ''} Due Soon`,
        `Reminder: You have ${billsDueSoon.length} bill${billsDueSoon.length > 1 ? 's' : ''} due in the next 2 days.`,
        billsDueSoon
      );
    }
  };

  // Check for email reminders on mount and when settings/bills change
  useEffect(() => {
    if (settings.emailRemindersEnabled && settings.reminderEmail) {
      // Delay the email check to avoid immediate emails on page load
      const timeoutId = setTimeout(() => {
        checkBillsForEmailReminders();
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
  }, [bills, settings.emailRemindersEnabled, settings.reminderEmail]);

  return {
    sendDemoEmail,
    checkBillsForEmailReminders,
    emailRemindersEnabled: settings.emailRemindersEnabled,
    reminderEmail: settings.reminderEmail
  };
};