export const AUTH_TOKEN_KEY = 'jobhunt_token'
export const AUTH_USER_KEY = 'jobhunt_user'
export const AUTH_EXPIRED_EVENT = 'jobhunt:auth-expired'

let authSessionGeneration = 0

export function getAuthSessionGeneration() {
  return authSessionGeneration
}

export function advanceAuthSessionGeneration() {
  authSessionGeneration += 1
  return authSessionGeneration
}

export function isCurrentAuthToken(token) {
  return globalThis.localStorage?.getItem(AUTH_TOKEN_KEY) === token
}

export function isCurrentAuthSession(token, generation) {
  return generation === authSessionGeneration && isCurrentAuthToken(token)
}

const API_BASE = String(import.meta.env?.VITE_API_URL ?? '').replace(/\/+$/, '')

export async function api(path, options = {}) {
  const headers = new Headers(options.headers)
  const isAuthEntryRequest = path === '/auth/login' || path === '/auth/register'
  const token = isAuthEntryRequest ? null : globalThis.localStorage?.getItem(AUTH_TOKEN_KEY)
  const generation = getAuthSessionGeneration()
  let body = options.body
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  if (!isFormData && body !== undefined && body !== null && typeof body === 'object') {
    body = JSON.stringify(body)
    headers.set('Content-Type', 'application/json')
  }

  if (isAuthEntryRequest) headers.delete('Authorization')
  else if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE}/api${path}`, { ...options, headers, body })
  let data = null

  try {
    data = await response.json()
  } catch {
    // Empty and non-JSON responses are treated as having no payload.
  }

  if (!response.ok) {
    if (!isAuthEntryRequest && response.status === 401 && isCurrentAuthSession(token, generation)) {
      globalThis.localStorage?.removeItem(AUTH_TOKEN_KEY)
      globalThis.localStorage?.removeItem(AUTH_USER_KEY)
      advanceAuthSessionGeneration()
      globalThis.dispatchEvent?.(new Event(AUTH_EXPIRED_EVENT))
    }
    throw new Error(data?.error || 'Request failed')
  }

  return data
}
