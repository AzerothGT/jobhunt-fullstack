import { useEffect, useState } from 'react'
import { api } from '../utils/api.js'

export function useApplications(mode = null, jobId = null) {
  const [applications, setApplications] = useState([])
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [loadedKey, setLoadedKey] = useState(null)
  const requestKey = mode ? `${mode}:${jobId ?? ''}:${revision}` : null
  const loading = Boolean(mode && loadedKey !== requestKey)

  useEffect(() => {
    if (!mode) return undefined

    const controller = new AbortController()
    const endpoint = mode === 'mine' ? '/applications/mine' : `/jobs/${jobId}/applicants`
    api(endpoint, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return
        setApplications(result.data ?? [])
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
  }, [mode, jobId, revision, requestKey])

  async function apply(jobIdToApply, coverLetterOrPayload = '') {
    if (typeof FormData !== 'undefined' && coverLetterOrPayload instanceof FormData) {
      return api(`/jobs/${jobIdToApply}/applications`, { method: 'POST', body: coverLetterOrPayload })
    }
    if (coverLetterOrPayload !== null && typeof coverLetterOrPayload === 'object') {
      return api(`/jobs/${jobIdToApply}/applications`, { method: 'POST', body: coverLetterOrPayload })
    }
    const body = String(coverLetterOrPayload ?? '').trim() ? { cover_letter: String(coverLetterOrPayload).trim() } : {}
    return api(`/jobs/${jobIdToApply}/applications`, { method: 'POST', body })
  }

  async function updateStatus(applicationId, status) {
    const { application } = await api(`/applications/${applicationId}`, {
      method: 'PUT',
      body: { status },
    })
    setApplications((current) => current.map((item) => item.id === applicationId ? { ...item, ...application } : item))
    return application
  }

  function refresh() {
    setRevision((current) => current + 1)
  }

  return { applications, loading, error, apply, updateStatus, refresh }
}
