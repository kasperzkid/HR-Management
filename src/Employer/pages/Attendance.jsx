import { useState, useMemo, useEffect, useCallback } from 'react'
import { Clock, Clock3, LogOut } from 'lucide-react'
import DailyLogTable from '../../HR-Manager/components/DailyLogTable'
import PunchCard, { EmergencyCheckOutButton } from '../components/PunchCard'
import { resolveEmployee } from '../lib/currentUser'
import { fetchEmployees, fetchAttendance } from '../lib/employerApi'
import useRealtimeRefetch from '../hooks/useRealtimeRefetch'

function Attendance() {
  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const currentEmployee = resolveEmployee(employees)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchEmployees(), fetchAttendance()])
      .then(([emps, att]) => {
        if (!cancelled) {
          setEmployees(emps)
          setAttendance(Array.isArray(att) ? att : (att?.attendance || []))
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Live refresh: today's punch or an HR status change updates the log
  // and KPI totals instantly (no manual reload needed).
  const reloadAttendance = useCallback(() => {
    fetchAttendance()
      .then((att) => setAttendance(Array.isArray(att) ? att : (att?.attendance || [])))
      .catch(() => {})
  }, [])
  useRealtimeRefetch('attendance', reloadAttendance)

  const myAttendance = useMemo(
    () => {
      // If the current user resolved to a real employee, filter to their records.
      // Fall back to all attendance when no matching employee record exists
      // (e.g. employer accounts that have no Employee row).
      if (currentEmployee.employeeId !== '—') {
        return attendance.filter((a) => a.employeeId === currentEmployee.employeeId)
      }
      return attendance
    },
    [attendance, currentEmployee.employeeId],
  )

  const normalizeStatus = (raw) => {
    const s = String(raw || '').trim().toUpperCase()
    if (s === 'P' || s === 'PRESENT') return 'present'
    if (s === 'PH') return 'present' // half-day counts as present
    if (s === 'A' || s === 'ABSENT') return 'absent'
    if (s === 'SL' || s === 'SICK' || s === 'SICK_LEAVE' || s === 'SICKLEAVE' || s === 'SICK LEAVE') return 'sick'
    if (s === 'AL' || s === 'ANNUAL_LEAVE' || s === 'ANNUALLEAVE' || s === 'ON_LEAVE' || s === 'ANNUAL LEAVE') return 'on_leave'
    if (s === 'ML' || s === 'MEDICAL_LEAVE' || s === 'MEDICALLEAVE' || s === 'MEDICAL LEAVE') return 'on_leave'
    if (s === 'OL' || s === 'OTHER_LEAVE' || s === 'OTHERLEAVE' || s === 'OTHER LEAVE') return 'on_leave'
    return 'unknown'
  }

  const totals = useMemo(() => {
    const agg = { regular: 0, overtime: 0, late: 0, present: 0, absent: 0, sick: 0 }
    myAttendance.forEach((a) => {
      agg.regular += a.regular || 0
      agg.overtime += a.overtime || 0
      agg.late += a.late || 0
      const st = normalizeStatus(a.status)
      if (st === 'present') agg.present += 1
      else if (st === 'absent') agg.absent += 1
      else if (st === 'sick') agg.sick += 1
    })
    return agg
  }, [myAttendance])

  const myTotal = useMemo(() => {
    return myAttendance.reduce(
      (acc, a) => {
        const st = normalizeStatus(a.status)
        if (st === 'present' || st === 'on_leave') {
          acc.days += 1
          acc.totalHours += a.regular || 0
          acc.totalOtHours += a.overtime || 0
        } else {
          acc.absences += 1
        }
        return acc
      },
      { days: 0, totalHours: 0, totalOtHours: 0, absences: 0 },
    )
  }, [myAttendance])

  const punchStats = useMemo(() => {
    const presentDays = myAttendance.filter((a) => normalizeStatus(a.status) === 'present')
    const lateSum = presentDays.reduce((s, a) => s + (a.late || 0), 0)
    const earlySum = presentDays.reduce((s, a) => s + (a.earlyDeparture || 0), 0)
    const overtimeHours = Math.round(
      myAttendance.reduce((sum, a) => sum + (a.overtime || 0), 0) * 10
    ) / 10
    return {
      avgLateMin: presentDays.length ? Math.round(lateSum / presentDays.length) : 0,
      avgEarlyMin: presentDays.length ? Math.round(earlySum / presentDays.length) : 0,
      overtimeHours,
    }
  }, [myAttendance])

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-100">
              My Attendance
            </h1>
            <span className="text-[11px] font-bold text-gray-500 bg-gray-100 dark:bg-[#1c2026] dark:text-gray-400 border border-gray-200 dark:border-[#262b31] px-2 py-0.5 rounded-md">
              {currentEmployee.name} ({currentEmployee.employeeId})
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Personal punch log, scheduled shifts &amp; overtime hours computed automatically
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <EmergencyCheckOutButton />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs font-semibold text-gray-400">Loading attendance…</div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Present Days', value: totals.present, color: 'text-emerald-600' },
              { label: 'Absent Days', value: totals.absent, color: 'text-rose-600' },
              { label: 'Sick Days', value: totals.sick, color: 'text-teal-600' },
              { label: 'Regular Hours', value: `${totals.regular}h`, color: 'text-gray-950 dark:text-gray-100' },
              { label: 'Overtime Hours', value: `${totals.overtime}h`, color: 'text-indigo-600' },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]"
              >
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Punch status cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Avg Late Time</p>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 flex items-center justify-center">
                  <Clock3 size={14} />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-950 dark:text-gray-100 mt-1 tabular-nums">
                {punchStats.avgLateMin}m
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                Average minutes past 8:00 AM
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Avg Early Departure</p>
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 flex items-center justify-center">
                  <LogOut size={14} />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-950 dark:text-gray-100 mt-1 tabular-nums">
                {punchStats.avgEarlyMin}m
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                Average minutes before 5:30 PM
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs dark:bg-[#15181d] dark:border-[#262b31]">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Overtime</p>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 flex items-center justify-center">
                  <Clock size={14} />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-950 dark:text-gray-100 mt-1 tabular-nums">
                {punchStats.overtimeHours}h
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                All records
              </p>
            </div>
          </div>

          <PunchCard />

          {/* Current Employee Hours Summary */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-5 dark:bg-[#15181d] dark:border-[#262b31] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">
                Hours Summary
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Verified working days and overtime submitted to payroll for disbursement.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="bg-slate-50 dark:bg-[#1c2026] border border-slate-200 dark:border-[#262b31] px-3 py-2 rounded-xl">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Worked Days</span>
                <span className="font-bold text-slate-800 dark:text-gray-100 text-sm">{myTotal.days}</span>
              </div>
              <div className="bg-slate-50 dark:bg-[#1c2026] border border-slate-200 dark:border-[#262b31] px-3 py-2 rounded-xl">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Hours</span>
                <span className="font-bold text-slate-800 dark:text-gray-100 text-sm">{myTotal.totalHours}h</span>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 px-3 py-2 rounded-xl">
                <span className="text-indigo-600 dark:text-indigo-400 text-[10px] uppercase font-bold block">Overtime</span>
                <span className="font-bold text-indigo-700 dark:text-indigo-300 text-sm">{myTotal.totalOtHours}h</span>
              </div>
            </div>
          </div>

          {/* Daily log */}
          <section id="daily-log-section">
            <DailyLogTable
              initialLogs={myAttendance}
              employees={[currentEmployee]}
              title="My Daily Log"
              subtitle={`Check-in and punch records for ${currentEmployee.name}`}
              showActions={false}
              tableId="employer-daily-log-table"
            />
          </section>
        </>
      )}
    </div>
  )
}

export default Attendance