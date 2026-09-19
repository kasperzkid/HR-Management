import { useState, useMemo, useEffect } from 'react'
import { LogOut } from 'lucide-react'
import DailyLogTable from '../../HR-Manager/components/DailyLogTable'
import PunchCard from '../components/PunchCard'
import { resolveEmployee } from '../lib/currentUser'
import { attendanceTotals } from '../lib/attendanceUtils'
import { fetchEmployees, fetchAttendance } from '../lib/employerApi'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function Attendance() {
  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const currentEmployee = resolveEmployee(employees)
  const today = new Date()
  const [monthSel, setMonthSel] = useState(today.getMonth() + 1)
  const [yearSel, setYearSel] = useState(today.getFullYear())

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

  // Strictly filter to current logged in employee and selected month/year
  const filtered = useMemo(() => {
    return attendance.filter((a) => {
      const [y, m] = String(a.date).split('-').map(Number)
      const monthMatches = m === monthSel && y === yearSel
      const empMatches = a.employeeId === currentEmployee.employeeId
      return monthMatches && empMatches
    })
  }, [attendance, monthSel, yearSel, currentEmployee.employeeId])

  const totals = useMemo(() => {
    const agg = { regular: 0, overtime: 0, late: 0, present: 0, absent: 0, sick: 0 }
    filtered.forEach((a) => {
      agg.regular += a.regular || 0
      agg.overtime += a.overtime || 0
      agg.late += a.late || 0
      if (a.status === 'Present') agg.present += 1
      else if (a.status === 'Absent') agg.absent += 1
      else if (a.status === 'Sick Leave') agg.sick += 1
    })
    return agg
  }, [filtered])

  const allEmpTotals = useMemo(() => attendanceTotals(attendance), [attendance])
  const myTotal = allEmpTotals[currentEmployee.employeeId] || {
    days: totals.present,
    totalHours: totals.regular + totals.overtime,
    totalOtHours: totals.overtime,
    absences: totals.absent,
  }

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
          <select
            value={monthSel}
            onChange={(e) => setMonthSel(Number(e.target.value))}
            className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white font-semibold text-gray-800 dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 cursor-pointer"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={yearSel}
            onChange={(e) => setYearSel(Number(e.target.value))}
            className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white font-semibold text-gray-800 dark:bg-[#15181d] dark:border-[#33383f] dark:text-gray-200 cursor-pointer"
          >
            {[2025, 2026].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Emergency check-out will mark you as checked out right now. Continue?')) {
                const now = new Date()
                const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
                const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                const updated = attendance.map((a) =>
                  a.employeeId === currentEmployee.employeeId && a.date === dateKey
                    ? { ...a, checkOut: timeStr, status: a.status || 'Present' }
                    : a,
                )
                setAttendance(updated)
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
            title="Emergency check-out — marks you as checked out immediately"
          >
            <LogOut size={14} />
            Emergency Check-Out
          </button>
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

          {/* Current Employee Monthly Hours Summary */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-5 dark:bg-[#15181d] dark:border-[#262b31] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">
                Monthly Hours Breakdown — {MONTH_NAMES[monthSel - 1]} {yearSel}
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

          {/* Punch status cards, emergency check-out (check-in/out live in the header) */}
          <PunchCard />

          {/* Daily log */}
          <section id="daily-log-section">
            <DailyLogTable
              initialLogs={filtered}
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