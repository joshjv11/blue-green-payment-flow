export interface GstCalculationInput {
  taxableValue: number;
  gstRate: number;
  supplyState?: string | null;
  customerState?: string | null;
}

export interface GstCalculationResult {
  totalTax: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  isInterState: boolean;
}

function roundToTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateGstComponents(input: GstCalculationInput): GstCalculationResult {
  const rate = Number.isFinite(input.gstRate) ? input.gstRate : 18;
  const normalizedRate = rate / 100;
  const taxable = Math.max(0, input.taxableValue);
  const totalTax = roundToTwo(taxable * normalizedRate);

  const supply = (input.supplyState ?? '').trim().toUpperCase();
  const customer = (input.customerState ?? '').trim().toUpperCase();
  const isInterState = Boolean(supply && customer && supply !== customer);

  if (isInterState) {
    return {
      totalTax,
      cgst: 0,
      sgst: 0,
      igst: roundToTwo(totalTax),
      cess: 0,
      isInterState,
    };
  }

  const half = roundToTwo(totalTax / 2);
  return {
    totalTax,
    cgst: half,
    sgst: half,
    igst: 0,
    cess: 0,
    isInterState,
  };
}
