import { apiRequest } from '@/lib/apiClient';
import type { AppUser } from '@/lib/types/auth';
import type { Organization } from '@/lib/endpoints/orgs';

export interface UserProfile {
  user: AppUser;
  organization: Organization | null;
}

export async function getProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/auth/me');
}

export async function updateProfile(fullName: string, orgName?: string): Promise<AppUser> {
  const res = await apiRequest<{ user: AppUser }>('/auth/me', {
    method: 'PATCH',
    body: {
      full_name: fullName,
      ...(orgName ? { org_name: orgName } : {}),
    },
  });
  return res.user;
}

export interface BusinessProfileInput {
  name: string;
  gstin?: string | null;
  udyamnumber?: string | null;
  upivpa?: string | null;
  address?: {
    line1?: string;
    legal_name?: string;
    state?: string;
    state_code?: string;
    pan?: string;
    tax_regime?: string;
  } | null;
}

export async function saveBusinessProfile(
  orgId: string,
  data: BusinessProfileInput
): Promise<Organization> {
  const res = await apiRequest<{ organization: Organization }>(`/orgs/${orgId}`, {
    method: 'PATCH',
    body: data,
  });
  return res.organization;
}
