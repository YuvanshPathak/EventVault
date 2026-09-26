const API = "/api";
const SESSION_KEY = "eventvault.session";

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function setSession(session) {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export async function api(path, options = {}) {
  const session = getSession();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;

  const res = await fetch(API + path, { ...options, headers });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error(body?.message || `Request failed (${res.status})`);
  }
  return body;
}
