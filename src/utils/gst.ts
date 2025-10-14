// Indian states for GST compliance
export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

// Common GST rates
export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];

// Calculate GST breakdown based on intra/inter state
export interface GSTBreakdown {
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export function calculateGST(
  taxableAmount: number,
  gstRate: number,
  isIGST: boolean
): GSTBreakdown {
  const totalGST = (taxableAmount * gstRate) / 100;

  if (isIGST) {
    return {
      cgst: 0,
      sgst: 0,
      igst: totalGST,
      total: totalGST,
    };
  } else {
    const halfGST = totalGST / 2;
    return {
      cgst: halfGST,
      sgst: halfGST,
      igst: 0,
      total: totalGST,
    };
  }
}

// Validate GSTIN format (15 characters)
export function validateGSTIN(gstin: string): boolean {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
}

// Format GSTIN with spaces for display
export function formatGSTIN(gstin: string): string {
  if (!gstin || gstin.length !== 15) return gstin;
  return `${gstin.slice(0, 2)} ${gstin.slice(2, 7)} ${gstin.slice(7, 11)} ${gstin.slice(11, 12)} ${gstin.slice(12, 13)} ${gstin.slice(13, 14)} ${gstin.slice(14)}`;
}

// Validate HSN/SAC code
export function validateHSNSAC(code: string): boolean {
  // HSN: 4, 6, or 8 digits
  // SAC: 6 digits
  return /^[0-9]{4,8}$/.test(code);
}
