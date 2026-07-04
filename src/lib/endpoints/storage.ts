import { apiRequest } from '@/lib/apiClient';

export async function signUpload(
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string; filePath: string }> {
  return apiRequest('/storage/sign-upload', {
    method: 'POST',
    body: { fileName, contentType },
  });
}

export async function deleteFile(filePath: string): Promise<void> {
  await apiRequest('/storage/delete', {
    method: 'DELETE',
    body: { filePath },
  });
}
