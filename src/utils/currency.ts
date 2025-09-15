/**
 * Currency utility functions for Indian Rupees
 */

/**
 * Format amount as Indian Rupees with proper locale
 */
export const formatINR = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format amount as Indian Rupees with symbol only (compact)
 */
export const formatINRCompact = (amount: number): string => {
  return `₹${amount.toFixed(2)}`;
};

/**
 * Get currency symbol for Indian Rupees
 */
export const getCurrencySymbol = (): string => {
  return '₹';
};

/**
 * Parse Indian Rupee string back to number
 */
export const parseINR = (value: string): number => {
  // Remove ₹ symbol, commas, and spaces, then parse
  const numericValue = value.replace(/[₹,\s]/g, '');
  return parseFloat(numericValue) || 0;
};