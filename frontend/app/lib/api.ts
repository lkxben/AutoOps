const PROXY_BASE = "/api/proxyWithCookie";

export async function apiGet(endpoint: string) {
  const res = await fetch(`${PROXY_BASE}${endpoint}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('API request failed');

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function apiPost(endpoint: string, data: any) {
  const res = await fetch(`${PROXY_BASE}${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('API request failed');

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function apiPut(endpoint: string, data: any) {
  const res = await fetch(`${PROXY_BASE}${endpoint}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('API request failed');

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function apiPatch(endpoint: string, data: any) {
  const res = await fetch(`${PROXY_BASE}${endpoint}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('API request failed');

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function apiDelete(endpoint: string) {
  const res = await fetch(`${PROXY_BASE}${endpoint}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('API request failed');

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}