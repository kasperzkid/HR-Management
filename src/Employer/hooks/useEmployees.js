import { useState, useEffect, useCallback } from 'react'
import { fetchEmployeesApi } from '../../lib/hrApi'

export function useEmployees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchEmployeesApi()
      if (Array.isArray(data)) setEmployees(data)
    } catch (err) {
      setError(err.message || 'Failed to load employees')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchEmployeesApi()
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setEmployees(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load employees')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { employees, loading, error, reload }
}
