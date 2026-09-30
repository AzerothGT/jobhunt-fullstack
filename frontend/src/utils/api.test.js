import { afterEach, beforeEach, expect, test } from 'bun:test'
import * as authApi from './api.js'

const { api, isCurrentAuthToken } = authApi

const originalFetch = globalThis.fetch
const originalLocalStorage = globalThis.localStorage
let storage

beforeEach(() => {
  storage = new Map()
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  }
})

test('checks whether a captured token is still current', () => {
  storage.set('jobhunt_token', 'current')

  expect(isCurrentAuthToken('current')).toBe(true)
  expect(isCurrentAuthToken('old')).toBe(false)
})

test('advances auth session generations and matches the current token and generation', () => {
  storage.set('jobhunt_token', 'same')


  const generation = authApi.getAuthSessionGeneration()
  expect(authApi.isCurrentAuthSession('same', generation)).toBe(true)

  const nextGeneration = authApi.advanceAuthSessionGeneration()
  expect(nextGeneration).toBe(generation + 1)
  expect(authApi.isCurrentAuthSession('same', generation)).toBe(false)
  expect(authApi.isCurrentAuthSession('same', nextGeneration)).toBe(true)

  storage.set('jobhunt_token', 'different')
  expect(authApi.isCurrentAuthSession('same', nextGeneration)).toBe(false)
})

afterEach(() => {
  globalThis.fetch = originalFetch
  globalThis.localStorage = originalLocalStorage
})

test('sends JSON with the stored bearer token and abort signal', async () => {
  storage.set('jobhunt_token', 'test-token')
  const signal = new AbortController().signal
  let request
  globalThis.fetch = async (url, options) => {
    request = { url, options }
    return Response.json({ ok: true })
  }

  await expect(api('/jobs', { method: 'POST', body: { title: 'Designer' }, signal })).resolves.toEqual({ ok: true })

  expect(request.url).toBe('/api/jobs')
  expect(request.options.headers.get('Authorization')).toBe('Bearer test-token')
  expect(request.options.headers.get('Content-Type')).toBe('application/json')
  expect(request.options.body).toBe('{"title":"Designer"}')
  expect(request.options.signal).toBe(signal)
})

test('does not send or expire a stored session when login returns 401', async () => {
  storage.set('jobhunt_token', 'current-token')
  storage.set('jobhunt_user', '{"id":1}')
  let request
  let notified = 0
  const onAuthExpired = () => { notified += 1 }
  globalThis.addEventListener(authApi.AUTH_EXPIRED_EVENT, onAuthExpired)
  globalThis.fetch = async (url, options) => {
    request = { url, options }
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  try {
    await expect(api('/auth/login', { method: 'POST', body: { email: 'bad' } })).rejects.toThrow('Invalid credentials')
    expect(request.options.headers.get('Authorization')).toBeNull()
    expect(storage.get('jobhunt_token')).toBe('current-token')
    expect(storage.get('jobhunt_user')).toBe('{"id":1}')
    expect(notified).toBe(0)
  } finally {
    globalThis.removeEventListener(authApi.AUTH_EXPIRED_EVENT, onAuthExpired)
  }
})

test('throws the backend error for a failed response', async () => {
  globalThis.fetch = async () => Response.json({ error: 'Invalid input' }, { status: 400 })

  await expect(api('/auth/login', { method: 'POST', body: { email: 'bad' } })).rejects.toThrow('Invalid input')
})

test('clears persisted auth when the backend returns 401', async () => {
  storage.set('jobhunt_token', 'expired-token')
  storage.set('jobhunt_user', '{"id":1}')
  globalThis.fetch = async () => Response.json({ error: 'Unauthorized' }, { status: 401 })

  await expect(api('/auth/me')).rejects.toThrow('Unauthorized')
  expect(storage.has('jobhunt_token')).toBe(false)
  expect(storage.has('jobhunt_user')).toBe(false)
})

test('does not expire a newer session for a request sent with an old token', async () => {
  storage.set('jobhunt_token', 'old')
  storage.set('jobhunt_user', '{"id":"old"}')
  let resolveResponse
  let request
  let notified = 0
  const onAuthExpired = () => { notified += 1 }
  globalThis.addEventListener('jobhunt:auth-expired', onAuthExpired)
  globalThis.fetch = (url, options) => {
    request = { url, options }
    return new Promise((resolve) => { resolveResponse = resolve })
  }

  try {
    const pendingRequest = api('/jobs')
    expect(request.options.headers.get('Authorization')).toBe('Bearer old')

    storage.set('jobhunt_token', 'new')
    storage.set('jobhunt_user', '{"id":"new"}')
    resolveResponse(Response.json({ error: 'Unauthorized' }, { status: 401 }))

    await expect(pendingRequest).rejects.toThrow('Unauthorized')
    expect(storage.get('jobhunt_token')).toBe('new')
    expect(storage.get('jobhunt_user')).toBe('{"id":"new"}')
    expect(notified).toBe(0)
  } finally {
    globalThis.removeEventListener('jobhunt:auth-expired', onAuthExpired)
  }
})

test('does not apply a stale successful /auth/me response to a newer session', async () => {
  const token = 'same-token'
  const cachedUser = '{"id":"current-user"}'
  const staleUser = { id: 'stale-user' }
  storage.set(authApi.AUTH_TOKEN_KEY, token)
  storage.set(authApi.AUTH_USER_KEY, cachedUser)
  const generation = authApi.getAuthSessionGeneration()
  let resolveResponse
  globalThis.fetch = () => new Promise((resolve) => { resolveResponse = resolve })

  const pendingRequest = api('/auth/me')
  authApi.advanceAuthSessionGeneration()
  resolveResponse(Response.json({ user: staleUser }))
  const { user } = await pendingRequest
  if (authApi.isCurrentAuthSession(token, generation)) {
    storage.set(authApi.AUTH_USER_KEY, JSON.stringify(user))
  }

  expect(authApi.isCurrentAuthSession(token, generation)).toBe(false)
  expect(storage.get(authApi.AUTH_USER_KEY)).toBe(cachedUser)
})

test('preserves a stored session and does not emit expiry for transient /auth/me failures', async () => {
  const token = 'current-token'
  const user = '{"id":"current-user"}'
  storage.set(authApi.AUTH_TOKEN_KEY, token)
  storage.set(authApi.AUTH_USER_KEY, user)
  let notified = 0
  const onAuthExpired = () => { notified += 1 }
  globalThis.addEventListener(authApi.AUTH_EXPIRED_EVENT, onAuthExpired)
  globalThis.fetch = async () => Response.json({ error: 'Service unavailable' }, { status: 503 })

  try {
    await expect(api('/auth/me')).rejects.toThrow('Service unavailable')
    expect(storage.get(authApi.AUTH_TOKEN_KEY)).toBe(token)
    expect(storage.get(authApi.AUTH_USER_KEY)).toBe(user)
    expect(notified).toBe(0)
  } finally {
    globalThis.removeEventListener(authApi.AUTH_EXPIRED_EVENT, onAuthExpired)
  }
})

test('does not expire a newer same-token session for an older request', async () => {
  const user = '{"id":"same-user"}'
  storage.set('jobhunt_token', 'same')
  storage.set('jobhunt_user', user)
  const generation = authApi.getAuthSessionGeneration()
  let resolveResponse
  let notified = 0
  const onAuthExpired = () => { notified += 1 }
  globalThis.addEventListener('jobhunt:auth-expired', onAuthExpired)
  globalThis.fetch = () => new Promise((resolve) => { resolveResponse = resolve })

  try {
    const pendingRequest = api('/jobs')
    authApi.advanceAuthSessionGeneration()
    expect(storage.get('jobhunt_token')).toBe('same')
    expect(storage.get('jobhunt_user')).toBe(user)
    resolveResponse(Response.json({ error: 'Unauthorized' }, { status: 401 }))

    await expect(pendingRequest).rejects.toThrow('Unauthorized')
    expect(storage.get('jobhunt_token')).toBe('same')
    expect(storage.get('jobhunt_user')).toBe(user)
    expect(notified).toBe(0)
    expect(authApi.isCurrentAuthSession('same', generation)).toBe(false)
  } finally {
    globalThis.removeEventListener('jobhunt:auth-expired', onAuthExpired)
  }
})

test('notifies same-tab auth state when the backend returns 401', async () => {
  storage.set('jobhunt_token', 'expired-token')
  let notified = 0
  const onAuthExpired = () => { notified += 1 }
  globalThis.addEventListener('jobhunt:auth-expired', onAuthExpired)
  globalThis.fetch = async () => Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await expect(api('/auth/me')).rejects.toThrow('Unauthorized')
    expect(notified).toBe(1)
  } finally {
    globalThis.removeEventListener('jobhunt:auth-expired', onAuthExpired)
  }
})
