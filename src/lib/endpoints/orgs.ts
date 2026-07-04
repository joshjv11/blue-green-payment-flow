import { apiRequest } from '@/lib/apiClient';

export interface Organization {
  id: string;
  name: string;
  gstin?: string | null;
  udyamnumber?: string | null;
  upivpa?: string | null;
  address?: Record<string, unknown> | null;
  logourl?: string | null;
  role?: string;
  plan?: string;
}

export async function getMyOrganization(): Promise<Organization> {
  const res = await apiRequest<{ organization: Organization }>('/orgs/me');
  return res.organization;
}

export async function updateOrganization(
  orgId: string,
  data: Partial<Pick<Organization, 'name' | 'gstin' | 'udyamnumber' | 'upivpa' | 'address' | 'logourl'>>
): Promise<Organization> {
  const res = await apiRequest<{ organization: Organization }>(`/orgs/${orgId}`, {
    method: 'PATCH',
    body: data,
  });
  return res.organization;
}
