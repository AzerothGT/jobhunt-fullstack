import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../utils/api.js'
import { useDebounce } from './useDebounce.js'

const SORTS = new Set(['recent', 'applicants'])

function filtersFromParams(params) {
  const page = Number(params.get('page'))
  const sort = params.get('sort')
  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    keyword: params.get('keyword') ?? '',
    type: params.get('type') ?? '',
    location: params.get('location') ?? '',
    sort: SORTS.has(sort) ? sort : 'recent',
  }
}

function paramsFromFilters(filters) {
  const params = new URLSearchParams()
  if (filters.page > 1) params.set('page', String(filters.page))
  if (filters.keyword.trim()) params.set('keyword', filters.keyword.trim())
  if (filters.type) params.set('type', filters.type)
  if (filters.location.trim()) params.set('location', filters.location.trim())
  if (filters.sort !== 'recent') params.set('sort', filters.sort)
  return params
}

export function useJobs({ limit = 9, syncParams = false } = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState(() => ({
    page: 1, keyword: '', type: '', location: '', sort: 'recent',
    ...(syncParams ? filtersFromParams(searchParams) : {}),
  }))
  const [jobs, setJobs] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const request = useRef(null)

  const debouncedKeyword = useDebounce(filters.keyword.trim(), 1500)

  useEffect(() => {
    if (!syncParams) return
    setSearchParams(paramsFromFilters(filters), { replace: true })
  }, [filters, syncParams, setSearchParams])

  useEffect(() => {
    const controller = new AbortController()
    request.current = controller
    const params = new URLSearchParams({ page: String(filters.page), limit: String(limit), sort: filters.sort })
    if (debouncedKeyword) params.set('keyword', debouncedKeyword)
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
  }, [filters.page, filters.type, filters.location, filters.sort, debouncedKeyword, limit, revision])

  function setFilter(name, value) {
    if (name === 'keyword' && value.trim() !== filters.keyword.trim()) request.current?.abort()
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
