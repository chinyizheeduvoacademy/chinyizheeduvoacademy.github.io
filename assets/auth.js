/* LVXCloud auth — session handling for Supabase email/password auth.
 *
 * Deliberately dependency-free: no CDN bundle, so the site keeps working if
 * a third-party script host is slow or blocked. Talks to the Auth REST API
 * directly and keeps one session in localStorage.
 *
 * Pro access is NOT decided here. This module only proves who you are;
 * whether you are Pro comes from lvx_my_status(), which reads profiles.pro.
 */

const STORAGE_KEY = 'lvx_auth_v1';
const REFRESH_MARGIN_S = 60;

let cfg = null;

export function initAuth({ url, anonKey }) {
  cfg = { url: url.replace(/\/$/, ''), anonKey };
}

/* ---------------- session storage ---------------- */

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(session) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode / quota — the session simply won't persist */
  }
}

export function isSignedIn() {
  return !!read();
}

/* ---------------- token lifecycle ---------------- */

async function refreshIfStale() {
  const s = read();
  if (!s) return null;
  const expiresIn = (s.expires_at || 0) - Math.floor(Date.now() / 1000);
  if (expiresIn > REFRESH_MARGIN_S) return s;

  if (!s.refresh_token) {
    write(null);
    return null;
  }

  const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: s.refresh_token }),
  });
  if (!res.ok) {
    write(null);
    return null;
  }
  const fresh = await res.json();
  const next = {
    access_token: fresh.access_token,
    refresh_token: fresh.refresh_token || s.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (fresh.expires_in || 3600),
  };
  write(next);
  return next;
}

/** Headers to merge into any Supabase REST call. Empty when signed out. */
export async function authHeaders() {
  const s = await refreshIfStale();
  return s ? { Authorization: `Bearer ${s.access_token}` } : {};
}

/* ---------------- sign in / up / out ---------------- */

function toSession(data) {
  if (!data || !data.access_token) return null;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
  };
}

async function post(path, body) {
  const res = await fetch(cfg.url + path, {
    method: 'POST',
    headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.msg || data.error_description || `HTTP ${res.status}`);
    err.code = data.error_code || String(res.status);
    throw err;
  }
  return data;
}

export async function signIn(email, password) {
  const data = await post('/auth/v1/token?grant_type=password', { email, password });
  write(toSession(data));
  return true;
}

export async function signUp(email, password) {
  const data = await post('/auth/v1/signup', { email, password });
  const session = toSession(data);
  if (session) {
    write(session);
    return { needsConfirmation: false };
  }
  // No session returned means the project requires email confirmation.
  return { needsConfirmation: true };
}

export function signOut() {
  write(null);
}

/* ---------------- account status ---------------- */

/** Calls an RPC as the signed-in user. Used for lvx_my_status + gated data. */
export async function rpcAsUser(fn, body) {
  const res = await fetch(`${cfg.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: cfg.anonKey,
      'Content-Type': 'application/json',
      ...(await authHeaders()),
    },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

export async function myStatus() {
  return rpcAsUser('lvx_my_status');
}
