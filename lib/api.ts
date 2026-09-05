/**
 * Where the API lives.
 *
 * Every route is mounted under /api, so the configured value has to end there.
 * Setting NEXT_PUBLIC_API_URL to the bare host is the obvious mistake to make
 * and produces a site that loads and then 404s on every request, so the suffix
 * is added when it is missing and a trailing slash is trimmed.
 */
function resolveApiUrl() {
  const configured = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').trim();
  const base = configured.replace(/\/+$/, '');
  return /\/api$/.test(base) ? base : `${base}/api`;
}

const API_URL = resolveApiUrl();

const TOKEN_KEY = 'mc_token';
const USER_KEY = 'mc_user';

export class ApiError extends Error {
  status: number;
  /** Field-level messages from express-validator, keyed by input name. */
  fields?: Record<string, string>;
  code?: string;

  constructor(message: string, status: number, body?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = body?.fields;
    this.code = body?.code;
  }
}

/**
 * The session lives in `sessionStorage`, not `localStorage`, and that is the
 * whole point: sessionStorage is scoped to a single browser tab.
 *
 * A new tab, or a reopened browser, therefore starts signed out and lands on
 * the sign-in screen. Nobody is dropped into whoever used the machine last,
 * and two roles can be compared side by side in two tabs. Closing the tab ends
 * the session.
 */
function store(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    // Private modes and locked-down browsers can throw on access.
    return null;
  }
}

export function getToken() {
  return store()?.getItem(TOKEN_KEY) ?? null;
}

export function setSession(token: string, user: unknown) {
  const s = store();
  if (!s) return;
  s.setItem(TOKEN_KEY, token);
  s.setItem(USER_KEY, JSON.stringify(user));
}

/** Keeps the cached user in step after a profile edit or a refresh. */
export function storeUser(user: unknown) {
  store()?.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  const s = store();
  if (!s) return;
  s.removeItem(TOKEN_KEY);
  s.removeItem(USER_KEY);
}

export function readStoredUser<T>(): T | null {
  const s = store();
  const raw = s?.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    s?.removeItem(USER_KEY);
    return null;
  }
}

/** Listeners that react to a 401 by bouncing the user back to /login. */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    // A network-level failure is almost always "the API is not running", which
    // is worth saying plainly instead of surfacing "Failed to fetch".
    throw new ApiError(
      `Cannot reach the MedConnect API at ${API_URL}. Make sure the backend is running (npm run dev in /backend).`,
      0
    );
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json().catch(() => ({})) : await response.text();

  if (!response.ok) {
    const message = typeof body === 'string' ? body || response.statusText : body.message || 'Something went wrong.';

    // The session is gone or was revoked — drop it so the UI cannot keep
    // pretending the user is signed in.
    if (response.status === 401) {
      clearSession();
      onUnauthorized?.();
    }

    throw new ApiError(message, response.status, typeof body === 'string' ? undefined : body);
  }

  return body as T;
}

/** Appends only the query parameters that actually have a value. */
export function qs(params: Record<string, unknown>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === 'all') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: data === undefined ? undefined : JSON.stringify(data) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export { API_URL };
