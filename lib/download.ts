import { API_URL, getToken } from './api';

/**
 * Downloads an authenticated file (a CSV or PDF report).
 *
 * A plain <a href> cannot carry an Authorization header, so the file is
 * fetched into a Blob and handed to a temporary link instead.
 */
export async function downloadFile(path: string, filename: string) {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const body = isJson ? await response.json().catch(() => ({})) : null;
    throw new Error(body?.message || 'That report could not be generated.');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
