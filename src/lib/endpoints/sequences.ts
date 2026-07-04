import { apiRequest } from '@/lib/apiClient';

export interface DunningSequence {
  id: string;
  orgid: string;
  name: string;
  isdefault: boolean;
  steps: unknown[];
  createdat?: string;
  updatedat?: string;
}

export async function listSequences(): Promise<DunningSequence[]> {
  const res = await apiRequest<{ sequences: DunningSequence[] }>('/sequences');
  return res.sequences;
}

export async function createSequence(data: {
  name: string;
  isdefault?: boolean;
  steps?: unknown[];
}): Promise<DunningSequence> {
  const res = await apiRequest<{ sequence: DunningSequence }>('/sequences', {
    method: 'POST',
    body: data,
  });
  return res.sequence;
}

export async function updateSequence(
  id: string,
  data: Partial<{ name: string; isdefault: boolean; steps: unknown[] }>
): Promise<DunningSequence> {
  const res = await apiRequest<{ sequence: DunningSequence }>(`/sequences/${id}`, {
    method: 'PATCH',
    body: data,
  });
  return res.sequence;
}

export async function deleteSequence(id: string): Promise<void> {
  await apiRequest(`/sequences/${id}`, { method: 'DELETE' });
}
