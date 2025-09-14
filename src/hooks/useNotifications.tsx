import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  status: 'paid' | 'pending' | 'overdue';
  paymentDate?: string;
}

interface UserSettings {
  defaultReminderDays: number;
  notificationsEnabled: boolean;
  notificationPermission: string;
  emailRemindersEnabled: boolean;
  reminderEmail: string;
}

export const useNotifications = () => {
  const [bills] = useLocalStorage<Bill[]>('bills', []);
  const [settings] = useLocalStorage<UserSettings>('userSettings', {
    defaultReminderDays: 3,
    notificationsEnabled: false,
    notificationPermission: 'default',
    emailRemindersEnabled: false,
    reminderEmail: ''
  });

  const showNotification = (title: string, body: string, icon?: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        tag: 'bill-reminder',
        requireInteraction: false,
      });
    }
  };

  const checkBillsForNotifications = () => {
    if (!settings.notificationsEnabled || Notification.permission !== 'granted') {
      return;
    }

    const today = new Date();
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(today.getDate() + 2);

    const upcomingBills = bills.filter(bill => {
      if (bill.status === 'paid') return false;
      
      const dueDate = new Date(bill.dueDate);
      return dueDate >= today && dueDate <= twoDaysFromNow;
    });

    const billsDueToday = upcomingBills.filter(bill => {
      const dueDate = new Date(bill.dueDate);
      return dueDate.toDateString() === today.toDateString();
    });

    const billsDueSoon = upcomingBills.filter(bill => {
      const dueDate = new Date(bill.dueDate);
      return dueDate.toDateString() !== today.toDateString();
    });

    // Notify about bills due today
    if (billsDueToday.length > 0) {
      const billNames = billsDueToday.map(bill => bill.name).join(', ');
      showNotification(
        `${billsDueToday.length} Bill${billsDueToday.length > 1 ? 's' : ''} Due Today!`,
        `Don't forget: ${billNames}`
      );
    }

    // Notify about bills due soon
    if (billsDueSoon.length > 0) {
      const billNames = billsDueSoon.map(bill => bill.name).join(', ');
      showNotification(
        `${billsDueSoon.length} Bill${billsDueSoon.length > 1 ? 's' : ''} Due Soon`,
        `Coming up: ${billNames}`
      );
    }
  };

  // Check for notifications on mount and when settings/bills change
  useEffect(() => {
    // Delay the notification check slightly to avoid showing notifications immediately on page load
    const timeoutId = setTimeout(() => {
      checkBillsForNotifications();
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [bills, settings.notificationsEnabled]);

  return {
    showNotification,
    checkBillsForNotifications,
    notificationsEnabled: settings.notificationsEnabled,
    hasPermission: Notification.permission === 'granted'
  };
};