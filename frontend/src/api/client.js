const DEFAULT_BASE = 'http://localhost:8000'

export function getApiBase() {
  return import.meta.env.VITE_API_BASE || DEFAULT_BASE
}

export async function apiFetch(path, { method = 'GET', body, headers } = {}) {
  const url = `${getApiBase()}${path}`
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${method} ${path} failed (${res.status}): ${text || res.statusText}`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return await res.json()
  return await res.text()
}

