export type StripeSyncPayload = {
  entityId: string;
  jobId?: string;
  mode?: 'full' | 'incremental';
  since?: string;
  startingAfter?: string;
};

export type StripeSyncResult = {
  status: 'success';
  invoicesSynced: number;
  paymentsSynced: number;
};

export async function triggerStripeSync(_payload: StripeSyncPayload): Promise<StripeSyncResult> {
  console.warn('Stripe sync is not available — endpoint not migrated yet');
  return { status: 'success', invoicesSynced: 0, paymentsSynced: 0 };
}

export type GstCalculationLine = {
  description?: string | null;
  hsnSacCode?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  taxableValue: number;
  gstRate?: number | null;
  metadata?: Record<string, unknown>;
};

export type GstCalculationPayload = {
  entityId: string;
  invoiceId?: string;
  triggerSource?: string;
  performedBy?: string;
  overrideRate?: number;
  invoice?: {
    invoiceNumber: string;
    invoiceDate: string;
    customerName?: string | null;
    customerIdentifier?: string | null;
    customerStateCode?: string | null;
    gstRate?: number | null;
    placeOfSupply?: string | null;
    metadata?: Record<string, unknown>;
    status?: string;
  };
  lineItems?: GstCalculationLine[];
};

export type GstCalculationResult = {
  status: 'success';
  invoiceId: string;
  totals: {
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    totalTax: number;
    isInterState: boolean;
  };
  lineItems: Array<{
    description: string | null;
    hsnSacCode: string | null;
    quantity: number;
    unitPrice: number;
    taxableValue: number;
    gstRate: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    metadata: Record<string, unknown>;
  }>;
};

export async function calculateGST(_payload: GstCalculationPayload): Promise<GstCalculationResult> {
  console.warn('GST calculation is not available — endpoint not migrated yet');
  return {
    status: 'success',
    invoiceId: _payload.invoiceId || '',
    totals: {
      taxableValue: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: 0,
      totalTax: 0,
      isInterState: false,
    },
    lineItems: [],
  };
}
