import { useEffect } from 'react'
import { getSocket } from '../../lib/socket'

// Real-time refresh for pages whose data derives from attendance rows
// (dashboard KPIs, payroll, payslips, reports). Refetches whenever the
// backend pushes an `attendance:update` socket event (a punch anywhere,
// or HR adjusting a record) and on a slow 60s poll as a safety net.
//
//   useRealtimeRefetch(refreshKey, () => loadAll())
//
// `refreshKey` changes whenever the caller wants a fresh load (e.g. a
// month/year selector), which also re-arms the listeners.
export default function useRealtimeRefetch(refreshKey, reload) {
  useEffect(() => {
    if (typeof reload !== 'function') return undefined

    const socket = getSocket()
    const onUpdate = () => reload()
    socket?.on('attendance:update', onUpdate)

    const interval = setInterval(reload, 60000)

    return () => {
      socket?.off('attendance:update', onUpdate)
      clearInterval(interval)
    }
  }, [refreshKey, reload])
}
