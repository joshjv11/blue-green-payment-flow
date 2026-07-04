import { apiRequest } from '@/lib/apiClient';

export async function aiAssistant(message: string, context?: Record<string, unknown>): Promise<{ reply: string }> {
  return apiRequest('/ai/assistant', {
    method: 'POST',
    body: { message, context },
  });
}

export async function aiAssistantEnhanced(
  message: string,
  context?: Record<string, unknown>
): Promise<{ reply: string }> {
  return apiRequest('/ai/ai-assistant', {
    method: 'POST',
    body: { message, context },
  });
}
