const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function apiGet(endpoint: string, token?: string) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!res.ok) throw new Error('API request failed')
  return res.json()
}

export async function apiPost(endpoint: string, data: any, token?: string) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('API request failed')
  return res.json()
}