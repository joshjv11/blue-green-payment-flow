// Calendar integration utilities

export interface CalendarEvent {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location?: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  notes?: string;
}

// Generate Google Calendar URL
export const generateGoogleCalendarUrl = (bill: Bill): string => {
  const dueDate = new Date(bill.due_date);

  // Set event time to 9 AM on due date
  const startDateTime = new Date(dueDate);
  startDateTime.setHours(9, 0, 0, 0);

  const endDateTime = new Date(startDateTime);
  endDateTime.setHours(10, 0, 0, 0); // 1 hour duration

  const formatDateForGoogle = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `💰 ${bill.name} - ₹${bill.amount.toLocaleString('en-IN')}`,
    dates: `${formatDateForGoogle(startDateTime)}/${formatDateForGoogle(endDateTime)}`,
    details: `Bill Payment Reminder\n\nAmount: ₹${bill.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\nCategory: ${bill.category ? bill.category.charAt(0).toUpperCase() + bill.category.slice(1).replace('_', ' ') : 'Uncategorized'}\nDue Date: ${dueDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}\n${bill.notes ? `Notes: ${bill.notes}` : ''}\n\n📝 Don't forget to pay this bill on time!\n\n💡 Manage all your bills at invoiceflow.dev`,
    location: 'InvoiceFlow - Bill Management',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// Generate ICS file content for calendar import
export const generateICSFile = (bill: Bill): string => {
  const dueDate = new Date(bill.due_date);
  const startDateTime = new Date(dueDate);
  startDateTime.setHours(9, 0, 0, 0);

  const endDateTime = new Date(startDateTime);
  endDateTime.setHours(10, 0, 0, 0);

  const formatDateForICS = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const now = new Date();
  const timestamp = formatDateForICS(now);

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//InvoiceFlow//Bill Reminder//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
DTSTART:${formatDateForICS(startDateTime)}
DTEND:${formatDateForICS(endDateTime)}
DTSTAMP:${timestamp}
UID:bill-${bill.id}@invoiceflow.dev
CREATED:${timestamp}
DESCRIPTION:Bill Payment Reminder\\n\\nAmount: ₹${bill.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\\nCategory: ${bill.category ? bill.category.charAt(0).toUpperCase() + bill.category.slice(1).replace('_', ' ') : 'Uncategorized'}\\nDue Date: ${dueDate.toLocaleDateString('en-IN')}\\n${bill.notes ? `Notes: ${bill.notes}\\n` : ''}\\nManage at invoiceflow.dev
LAST-MODIFIED:${timestamp}
LOCATION:InvoiceFlow - Bill Management
SEQUENCE:0
STATUS:CONFIRMED
SUMMARY:💰 ${bill.name} - ₹${bill.amount.toLocaleString('en-IN')}
TRANSP:OPAQUE
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Bill payment reminder: ${bill.name}
TRIGGER:-P1D
END:VALARM
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Bill payment reminder: ${bill.name}
TRIGGER:-P3D
END:VALARM
END:VEVENT
END:VCALENDAR`;

  return icsContent;
};

// Download ICS file
export const downloadICSFile = (bill: Bill): void => {
  const icsContent = generateICSFile(bill);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${bill.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_reminder.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

// Create multiple calendar reminders (1 day, 3 days, 1 week before)
export const createMultipleReminders = (bill: Bill): CalendarEvent[] => {
  const dueDate = new Date(bill.due_date);
  const reminders = [1, 3, 7]; // days before

  return reminders.map(days => {
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - days);
    reminderDate.setHours(9, 0, 0, 0);

    const endDate = new Date(reminderDate);
    endDate.setHours(9, 30, 0, 0);

    return {
      title: `📋 Bill Reminder: ${bill.name} (Due in ${days} day${days !== 1 ? 's' : ''})`,
      description: `Reminder: ${bill.name} payment of ₹${bill.amount.toLocaleString('en-IN')} is due ${days === 1 ? 'tomorrow' : `in ${days} days`}.\n\nDue Date: ${dueDate.toLocaleDateString('en-IN')}\nCategory: ${bill.category}\n${bill.notes ? `Notes: ${bill.notes}` : ''}`,
      startDate: reminderDate,
      endDate: endDate,
    };
  });
};