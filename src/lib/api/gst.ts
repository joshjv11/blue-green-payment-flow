import { supabase } from '@/lib/supabase';

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

export async function triggerStripeSync(payload: StripeSyncPayload): Promise<StripeSyncResult> {
  const { data, error } = await supabase.functions.invoke<StripeSyncResult>('stripe-sync', {
    body: payload,
  });

  if (error) {
    throw new Error(error.message ?? 'Failed to run stripe sync');
  }

  if (!data) {
    throw new Error('Stripe sync returned no response');
  }

  return data;
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

export async function calculateGST(payload: GstCalculationPayload): Promise<GstCalculationResult> {
  const { data, error } = await supabase.functions.invoke<GstCalculationResult>('gst-calculate', {
    body: payload,
  });

  if (error) {
    throw new Error(error.message ?? 'Failed to calculate GST');
  }

  if (!data) {
    throw new Error('GST calculation returned no response');
  }

  return data;
}

