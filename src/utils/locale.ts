// Locale utilities for Indian number formatting and language support

export type Locale = 'en-IN' | 'hi-IN';

export const formatCurrency = (amount: number, locale: Locale = 'en-IN'): string => {
  if (locale === 'hi-IN') {
    // Indian numbering system: ₹1,00,000
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }
  
  // Default English format
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (num: number, locale: Locale = 'en-IN'): string => {
  return new Intl.NumberFormat(locale === 'hi-IN' ? 'en-IN' : 'en-US', {
    maximumFractionDigits: 2,
  }).format(num);
};

// Hindi translations
export const translations: Record<Locale, Record<string, string>> = {
  'en-IN': {
    'add_bill': 'Add Bill',
    'bill_name': 'Bill Name',
    'amount': 'Amount',
    'due_date': 'Due Date',
    'category': 'Category',
    'status': 'Status',
    'notes': 'Notes',
    'save': 'Save',
    'cancel': 'Cancel',
    'today': 'Today',
    'tomorrow': 'Tomorrow',
    'next_monday': 'Next Monday',
    'unpaid': 'Unpaid',
    'paid': 'Paid',
    'overdue': 'Overdue',
    'voice_input': 'Voice Input',
    'scan_amount': 'Scan Amount',
    'syncing': 'Syncing...',
    'offline': 'Offline',
    'online': 'Online',
  },
  'hi-IN': {
    'add_bill': 'बिल जोड़ें',
    'bill_name': 'बिल का नाम',
    'amount': 'राशि',
    'due_date': 'नियत तारीख',
    'category': 'श्रेणी',
    'status': 'स्थिति',
    'notes': 'नोट्स',
    'save': 'सहेजें',
    'cancel': 'रद्द करें',
    'today': 'आज',
    'tomorrow': 'कल',
    'next_monday': 'अगला सोमवार',
    'unpaid': 'अवैतनिक',
    'paid': 'भुगतान किया',
    'overdue': 'अतिदेय',
    'voice_input': 'आवाज़ इनपुट',
    'scan_amount': 'राशि स्कैन करें',
    'syncing': 'सिंक हो रहा है...',
    'offline': 'ऑफ़लाइन',
    'online': 'ऑनलाइन',
  },
};

export const t = (key: string, locale: Locale = 'en-IN'): string => {
  return translations[locale]?.[key] || translations['en-IN'][key] || key;
};

