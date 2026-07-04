import { apiRequest } from '@/lib/apiClient';

export interface Customer {
  id: string;
  orgid: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsappphone?: string | null;
  gstin?: string | null;
  billingaddress?: Record<string, unknown> | null;
  notes?: string | null;
  preferredchannel?: string;
  createdat?: string;
  updatedat?: string;
}

export async function listCustomers(search?: string): Promise<Customer[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await apiRequest<{ customers: Customer[] }>(`/customers${qs}`);
  return res.customers;
}

export async function getCustomer(id: string): Promise<Customer> {
  const res = await apiRequest<{ customer: Customer }>(`/customers/${id}`);
  return res.customer;
}

export async function createCustomer(data: Partial<Customer>): Promise<Customer> {
  const res = await apiRequest<{ customer: Customer }>('/customers', {
    method: 'POST',
    body: data,
  });
  return res.customer;
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
  const res = await apiRequest<{ customer: Customer }>(`/customers/${id}`, {
    method: 'PATCH',
    body: data,
  });
  return res.customer;
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiRequest(`/customers/${id}`, { method: 'DELETE' });
}
