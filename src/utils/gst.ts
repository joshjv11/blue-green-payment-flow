// Indian states for GST compliance with state codes
export const INDIAN_STATES = [
  { name: "Andaman and Nicobar Islands", code: "35" },
  { name: "Andhra Pradesh", code: "37" },
  { name: "Arunachal Pradesh", code: "12" },
  { name: "Assam", code: "18" },
  { name: "Bihar", code: "10" },
  { name: "Chandigarh", code: "04" },
  { name: "Chhattisgarh", code: "22" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", code: "26" },
  { name: "Delhi", code: "07" },
  { name: "Goa", code: "30" },
  { name: "Gujarat", code: "24" },
  { name: "Haryana", code: "06" },
  { name: "Himachal Pradesh", code: "02" },
  { name: "Jammu and Kashmir", code: "01" },
  { name: "Jharkhand", code: "20" },
  { name: "Karnataka", code: "29" },
  { name: "Kerala", code: "32" },
  { name: "Ladakh", code: "38" },
  { name: "Lakshadweep", code: "31" },
  { name: "Madhya Pradesh", code: "23" },
  { name: "Maharashtra", code: "27" },
  { name: "Manipur", code: "14" },
  { name: "Meghalaya", code: "17" },
  { name: "Mizoram", code: "15" },
  { name: "Nagaland", code: "13" },
  { name: "Odisha", code: "21" },
  { name: "Puducherry", code: "34" },
  { name: "Punjab", code: "03" },
  { name: "Rajasthan", code: "08" },
  { name: "Sikkim", code: "11" },
  { name: "Tamil Nadu", code: "33" },
  { name: "Telangana", code: "36" },
  { name: "Tripura", code: "16" },
  { name: "Uttar Pradesh", code: "09" },
  { name: "Uttarakhand", code: "05" },
  { name: "West Bengal", code: "19" },
];

// Get state code from state name
export function getStateCode(stateName: string): string {
  const state = INDIAN_STATES.find(s => s.name === stateName);
  return state?.code || "";
}

// Get state name from code
export function getStateName(code: string): string {
  const state = INDIAN_STATES.find(s => s.code === code);
  return state?.name || "";
}

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
