import { useEffect } from 'react'
import {
  fetchPunchStatusApi,
  applyAttendanceUpdate,
} from '../lib/punchApi'
import { applyPunchStatus } from '../lib/workTime'
import { getSocket } from '../../lib/socket'

// Keeps the shared punch/HR-status store fresh in the employee portal:
//   • Polls GET /api/employer/punch every 30s.
//   • Applies attendance:update socket events pushed by the backend
//     whenever HR changes a status (or the employee punched elsewhere).
export default function usePunchSync() {
  useEffect(() => {
    let cancelled = false

    const load = () =>
      fetchPunchStatusApi()
        .then((status) => {
          if (!cancelled) applyPunchStatus(status)
        })
        .catch(() => {})

    load()
    const interval = setInterval(load, 30000)

    const socket = getSocket()
    const onUpdate = (payload) => {
      if (payload?.record) applyAttendanceUpdate(payload.record)
    }
    socket?.on('attendance:update', onUpdate)

    return () => {
      cancelled = true
      clearInterval(interval)
      socket?.off('attendance:update', onUpdate)
    }
  }, [])
}
