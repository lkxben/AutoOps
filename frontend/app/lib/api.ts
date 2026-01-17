const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function apiGet(endpoint: string) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    credentials: 'include',
    headers: {
      "ngrok-skip-browser-warning": "true",
    }
  })
  if (!res.ok) throw new Error('API request failed')
  return res.json()
}

export async function apiPost(endpoint: string, data: any) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('API request failed')
  return res.json()
}

export async function apiPut(endpoint: string, data: any) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('API request failed')
  return res.json()
}