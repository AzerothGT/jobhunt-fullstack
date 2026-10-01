import { useCallback, useEffect, useState } from 'react'
import { api } from '../utils/api.js'

export function useBookmarks(active = false) {
  const [bookmarks, setBookmarks] = useState([])
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [loadedKey, setLoadedKey] = useState(null)
  const requestKey = active ? `mine:${revision}` : null
  const loading = Boolean(active && loadedKey !== requestKey)

  useEffect(() => {
    if (!active) return undefined
    const controller = new AbortController()
    api('/bookmarks/mine', { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return
        setBookmarks(result.data ?? [])
        setError('')
        setLoadedKey(requestKey)
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(requestError.message)
          setLoadedKey(requestKey)
        }
      })
    return () => controller.abort()
  }, [active, revision, requestKey])

  const isBookmarked = useCallback(
    (jobId) => bookmarks.some((item) => (item.id ?? item.job_id) === jobId),
    [bookmarks],
  )

  async function toggle(jobId, bookmarked) {
    if (bookmarked) {
      await api(`/jobs/${jobId}/bookmark`, { method: 'DELETE' })
    } else {
      await api(`/jobs/${jobId}/bookmark`, { method: 'POST' })
    }
    setRevision((current) => current + 1)
  }

  function refresh() {
    setRevision((current) => current + 1)
  }

  return { bookmarks, loading, error, isBookmarked, toggle, refresh }
}
