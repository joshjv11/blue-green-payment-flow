// Payment configuration for production
export const PAYMENT_CONFIG = {
  UPI_ID: 'joshuavaz55@okicici',
  UPI_NAME: 'InvoiceFlow',
  VERIFICATION_TIME: '24 hours',
  SUPPORT_EMAIL: 'support@invoiceflow.com',
  PLANS: {
    monthly: {
      id: 'pro_monthly',
      amount: 99,
      currency: 'INR',
      name: 'Pro Monthly',
      description: 'Monthly subscription with all Pro features'
    },
    yearly: {
      id: 'pro_yearly', 
      amount: 999,
      currency: 'INR',
      name: 'Pro Yearly',
      description: 'Yearly subscription with all Pro features',
      discount: 189
    }
  }
} as const;

export const getUPIPaymentString = (amount: number, note: string = '') => {
  return `upi://pay?pa=${PAYMENT_CONFIG.UPI_ID}&am=${amount}&cu=${PAYMENT_CONFIG.PLANS.monthly.currency}&tn=${encodeURIComponent(note)}`;
};