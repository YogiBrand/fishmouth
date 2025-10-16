export const API_BASE = import.meta.env.VITE_ADMIN_API || '/admin';

export async function fetchJSON(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed with ${res.status}`);
  }
  return res.json();
}
