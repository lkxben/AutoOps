const PROXY_BASE = "/api/proxyWithCookie"

async function apiRequest(method: string, endpoint: string, data?: any) {
  const res = await fetch(`${PROXY_BASE}${endpoint}`, {
    method,
    credentials: "include",
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `API request failed: ${res.status}`)
  }

  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export const apiGet = (endpoint: string) => apiRequest("GET", endpoint)
export const apiPost = (endpoint: string, data: any) => apiRequest("POST", endpoint, data)
export const apiPut = (endpoint: string, data: any) => apiRequest("PUT", endpoint, data)
export const apiPatch = (endpoint: string, data: any) => apiRequest("PATCH", endpoint, data)
export const apiDelete = (endpoint: string) => apiRequest("DELETE", endpoint)