import { useState, useMemo } from 'react'
import { ATTENDANCE, attendanceTotals } from '../data/attendanceData'
import { INITIAL_EMPLOYEES } from '../data/employeeData'

const STATUS_STYLES = {
  Present: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Sick Leave': 'bg-teal-50 text-teal-700 border border-teal-200',
  'On Leave': 'bg-amber-50 text-amber-700 border border-amber-200',
  Absent: 'bg-rose-50 text-rose-700 border border-rose-200',
}

function Attendance() {
  const today = new Date()
  const [monthSel, setMonthSel] = useState(today.getMonth() + 1)
  const [yearSel, setYearSel] = useState(today.getFullYear())
  const [empFilter, setEmpFilter] = useState('all')

  const filtered = useMemo(() => {
    return ATTENDANCE.filter((a) => {
      const [y, m] = a.date.split('-').map(Number)
      const monthMatches = m === monthSel && y === yearSel
      const empMatches = empFilter === 'all' || a.employeeId === empFilter
      return monthMatches && empMatches
    })
  }, [monthSel, yearSel, empFilter])

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

  const employeeTotals = useMemo(() => attendanceTotals(ATTENDANCE), [])

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">Attendance</h1>
          <p className="text-xs text-gray-500 mt-1">Daily check-in/check-out log — regular & OT hours derived automatically</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={empFilter} onChange={(e) => setEmpFilter(e.target.value)} className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white font-semibold text-gray-800">
            <option value="all">All employees</option>
            {INITIAL_EMPLOYEES.map((e) => <option key={e.employeeId} value={e.employeeId}>{e.employeeId} — {e.name}</option>)}
          </select>
          <select value={monthSel} onChange={(e) => setMonthSel(Number(e.target.value))} className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white font-semibold text-gray-800">
            {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select value={yearSel} onChange={(e) => setYearSel(Number(e.target.value))} className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white font-semibold text-gray-800">
            {[2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Present Days', value: totals.present, color: 'text-emerald-600' },
          { label: 'Absent Days', value: totals.absent, color: 'text-rose-600' },
          { label: 'Sick Days', value: totals.sick, color: 'text-teal-600' },
          { label: 'Regular Hours', value: `${totals.regular}h`, color: 'text-gray-950' },
          { label: 'Overtime Hours', value: `${totals.overtime}h`, color: 'text-indigo-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Daily log */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-950">Daily Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="text-[11px] text-gray-500 border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Check-in</th>
                <th className="px-4 py-3 font-medium">Check-out</th>
                <th className="px-4 py-3 font-medium text-right">Regular Hrs</th>
                <th className="px-4 py-3 font-medium text-right">OT Hrs</th>
                <th className="px-4 py-3 font-medium text-right">Late (min)</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-xs text-gray-400">No attendance records for this selection.</td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="text-xs">
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{a.date}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{a.employeeName}</p>
                      <p className="text-[11px] text-gray-400">{a.employeeId}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{a.department}</td>
                    <td className="px-4 py-3 font-mono text-gray-700">{a.checkIn || '—'}</td>
                    <td className="px-4 py-3 font-mono text-gray-700">{a.checkOut || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{a.regular}h</td>
                    <td className="px-4 py-3 text-right tabular-nums text-indigo-600">{a.overtime}h</td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-600">{a.late}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-employee OT summary (feeds payroll) */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-950">Monthly Hours Summary (feeds payroll)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="text-[11px] text-gray-500 border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium text-right">Days Worked</th>
                <th className="px-4 py-3 font-medium text-right">Total Hrs</th>
                <th className="px-4 py-3 font-medium text-right">OT Hrs</th>
                <th className="px-4 py-3 font-medium text-right">Absences</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.entries(employeeTotals).map(([empId, agg]) => {
                const emp = INITIAL_EMPLOYEES.find((e) => e.employeeId === empId)
                return (
                  <tr key={empId} className="text-xs">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-gray-900">{emp?.name || empId}</p>
                      <p className="text-[11px] text-gray-400">{empId}</p>
                    </td>
                    <td className="px-4 py-3 text-right">{agg.days}</td>
                    <td className="px-4 py-3 text-right font-semibold">{agg.totalHours}h</td>
                    <td className="px-4 py-3 text-right text-indigo-600 font-semibold">{agg.totalOtHours}h</td>
                    <td className="px-4 py-3 text-right text-rose-600">{agg.absences}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Attendance