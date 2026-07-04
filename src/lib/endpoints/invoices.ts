import { apiRequest } from '@/lib/apiClient';

export interface Invoice {
  id: string;
  orgid: string;
  customerid: string;
  invoicenumber: string;
  issuedate: string;
  duedate: string;
  amount: number;
  taxamount?: number;
  amountpaid?: number;
  status: string;
  currency?: string;
  lineitems?: unknown[];
  pdfurl?: string | null;
  publictoken?: string;
  ismsmesupplier?: boolean;
  customername?: string;
  createdat?: string;
  updatedat?: string;
}

export interface ListInvoicesParams {
  status?: string;
  aging?: string;
  customer_id?: string;
}

export async function listInvoices(params: ListInvoicesParams = {}): Promise<Invoice[]> {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.aging) search.set('aging', params.aging);
  if (params.customer_id) search.set('customer_id', params.customer_id);
  const qs = search.toString();
  const res = await apiRequest<{ invoices: Invoice[] }>(`/invoices${qs ? `?${qs}` : ''}`);
  return res.invoices;
}

export async function getInvoice(id: string): Promise<Invoice> {
  const res = await apiRequest<{ invoice: Invoice }>(`/invoices/${id}`);
  return res.invoice;
}

export async function createInvoice(data: Record<string, unknown>): Promise<Invoice> {
  const res = await apiRequest<{ invoice: Invoice }>('/invoices', {
    method: 'POST',
    body: data,
  });
  return res.invoice;
}

export async function updateInvoice(id: string, data: Record<string, unknown>): Promise<Invoice> {
  const res = await apiRequest<{ invoice: Invoice }>(`/invoices/${id}`, {
    method: 'PATCH',
    body: data,
  });
  return res.invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  await apiRequest(`/invoices/${id}`, { method: 'DELETE' });
}

export async function recordPayment(
  invoiceId: string,
  data: { amount: number; method?: string }
): Promise<Invoice> {
  const res = await apiRequest<{ invoice: Invoice }>(`/invoices/${invoiceId}/record-payment`, {
    method: 'PATCH',
    body: data,
  });
  return res.invoice;
}
