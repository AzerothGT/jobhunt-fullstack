import { useEffect, useState } from 'react'
import { advanceAuthSessionGeneration, api, AUTH_EXPIRED_EVENT, AUTH_TOKEN_KEY, AUTH_USER_KEY, getAuthSessionGeneration, isCurrentAuthSession } from '../utils/api.js'
import { AuthContext } from './authContext.js'

function getCachedUser() {
  if (!localStorage.getItem(AUTH_TOKEN_KEY)) return null
  try {
    const cachedUser = JSON.parse(localStorage.getItem(AUTH_USER_KEY))
    return cachedUser && typeof cachedUser === 'object' && !Array.isArray(cachedUser) ? cachedUser : null
  } catch {
    return null
  }
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(getCachedUser)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(AUTH_TOKEN_KEY)))

  useEffect(() => {
    const onAuthExpired = () => {
      setUser(null)
      setLoading(false)
    }
    globalThis.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired)
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    const generation = getAuthSessionGeneration()
    if (!token) {
      return () => globalThis.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired)
    }

    const controller = new AbortController()
    api('/auth/me', { signal: controller.signal })
      .then(({ user: currentUser }) => {
        if (!controller.signal.aborted && isCurrentAuthSession(token, generation)) {
          setUser(currentUser)
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser))
        }
      })
      .catch(() => {
        // Keep the cached user when /auth/me fails transiently.
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => {
      controller.abort()
      globalThis.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired)
    }
  }, [])

  function persistSession(session) {
    localStorage.setItem(AUTH_TOKEN_KEY, session.token)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user))
    advanceAuthSessionGeneration()
    setUser(session.user)
    setLoading(false)
    return session.user
  }

  async function login(credentials) {
    const session = await api('/auth/login', { method: 'POST', body: credentials })
    return persistSession(session)
  }

  async function register(details) {
    const session = await api('/auth/register', { method: 'POST', body: details })
    return persistSession(session)
  }

  function logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    advanceAuthSessionGeneration()
    setUser(null)
    setLoading(false)
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
}
