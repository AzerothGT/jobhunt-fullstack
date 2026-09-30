import { useEffect, useRef, useState } from 'react'
import { api } from '../utils/api.js'

export function useJobs({ limit = 9 } = {}) {
  const [filters, setFilters] = useState({ page: 1, keyword: '', type: '', location: '', sort: 'recent' })
  const [keyword, setKeyword] = useState('')
  const [jobs, setJobs] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const request = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(filters.keyword.trim()), 300)
    return () => clearTimeout(timer)
  }, [filters.keyword])

  useEffect(() => {
    const controller = new AbortController()
    request.current = controller
    const params = new URLSearchParams({ page: String(filters.page), limit: String(limit), sort: filters.sort })
    if (keyword) params.set('keyword', keyword)
    if (filters.type) params.set('type', filters.type)
    if (filters.location) params.set('location', filters.location)

    api(`/jobs?${params}`, { signal: controller.signal })
      .then((result) => {
        setJobs(result.data ?? [])
        setPage(result.page ?? 1)
        setTotal(result.total ?? 0)
        setTotalPages(result.total_pages ?? 1)
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => {
      controller.abort()
      if (request.current === controller) request.current = null
    }
  }, [filters.page, filters.type, filters.location, filters.sort, keyword, limit, revision])

  function setFilter(name, value) {
    if (name === 'keyword' && value.trim() !== keyword) request.current?.abort()
    setLoading(true)
    setError('')
    setFilters((current) => ({ ...current, [name]: value, ...(name === 'page' ? {} : { page: 1 }) }))
  }

  function refresh() {
    setLoading(true)
    setError('')
    setRevision((current) => current + 1)
  }

  return { jobs, filters, setFilter, page, total, totalPages, loading, error, refresh }
}
