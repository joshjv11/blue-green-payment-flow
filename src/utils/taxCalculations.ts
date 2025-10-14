// Tax calculation utilities for different regimes

export interface TaxBreakdown {
  cgst: number;
  sgst: number;
  igst: number;
  vat: number;
  total: number;
}

export interface LineItem {
  quantity: number;
  unit_price: number;
  tax_rate: number;
  zero_rated?: boolean;
  rcm?: boolean;
}

export function calculateLineTax(
  item: LineItem,
  taxRegime: string,
  isIGST: boolean = false
): TaxBreakdown {
  const taxableAmount = item.quantity * item.unit_price;
  
  // Zero-rated or RCM items have no tax added
  if (item.zero_rated || item.rcm) {
    return { cgst: 0, sgst: 0, igst: 0, vat: 0, total: 0 };
  }

  // NO_TAX regime
  if (taxRegime === "NO_TAX") {
    return { cgst: 0, sgst: 0, igst: 0, vat: 0, total: 0 };
  }

  const totalTax = (taxableAmount * item.tax_rate) / 100;

  // India GST - split CGST/SGST or use IGST
  if (taxRegime === "IND_GST") {
    if (isIGST) {
      return {
        cgst: 0,
        sgst: 0,
        igst: totalTax,
        vat: 0,
        total: totalTax,
      };
    } else {
      const halfTax = totalTax / 2;
      return {
        cgst: halfTax,
        sgst: halfTax,
        igst: 0,
        vat: 0,
        total: totalTax,
      };
    }
  }

  // UAE_VAT or GENERIC_VAT - single VAT
  return {
    cgst: 0,
    sgst: 0,
    igst: 0,
    vat: totalTax,
    total: totalTax,
  };
}

export function getDefaultTaxRate(taxRegime: string): number {
  switch (taxRegime) {
    case "IND_GST":
      return 18; // Default GST rate
    case "UAE_VAT":
      return 5; // UAE standard rate
    case "GENERIC_VAT":
      return 0; // User configurable
    case "NO_TAX":
      return 0;
    default:
      return 0;
  }
}

export function formatCurrency(
  amount: number,
  currencyCode: string,
  numberFormat: string = "1,234.56"
): string {
  const [thousands, decimal] = numberFormat.includes(",")
    ? [",", "."]
    : [".", ","];

  const parts = amount.toFixed(2).split(".");
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
  const decimalPart = parts[1];

  return `${integerPart}${decimal}${decimalPart}`;
}

export function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    INR: "₹",
    AED: "د.إ",
    USD: "$",
    GBP: "£",
    EUR: "€",
    AUD: "A$",
    CAD: "C$",
    SGD: "S$",
  };
  return symbols[currencyCode] || currencyCode;
}

export function convertAmount(
  amount: number,
  fxRate: number
): number {
  return amount * fxRate;
}
