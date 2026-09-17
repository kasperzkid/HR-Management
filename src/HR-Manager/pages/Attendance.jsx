import React, { useState, useMemo } from 'react'
import {
  CalendarCheck,
  UserCheck,
  CalendarX2,
  Clock,
  TrendingUp,
  Plus,
} from 'lucide-react'
import { MOCK_EMPLOYEES } from '../data/mockData'
import DailyLogTable from '../components/DailyLogTable'

const INITIAL_LOGS = [
  {
    id: 'att-01',
    employeeId: 'EMP-001',
    name: 'Aster Teshome Worku',
    department: 'Administration',
    date: '2026-09-16',
    checkIn: '08:00',
    checkOut: '17:30',
    regularHrs: 8,
    otHrs: 0.5,
    late: 0,
    status: 'Present',
  },
  {
    id: 'att-02',
    employeeId: 'EMP-002',
    name: 'Ermias Haile Gebre',
    department: 'Finance',
    date: '2026-09-16',
    checkIn: '07:55',
    checkOut: '19:00',
    regularHrs: 8,
    otHrs: 2.0,
    late: 0,
    status: 'Present',
  },
  {
    id: 'att-03',
    employeeId: 'EMP-003',
    name: 'Meron Alemu Woldemariam',
    department: 'Human Resources',
    date: '2026-09-16',
    checkIn: '08:05',
    checkOut: '17:00',
    regularHrs: 8,
    otHrs: 0,
    late: 5,
    status: 'Present',
  },
  {
    id: 'att-04',
    employeeId: 'EMP-004',
    name: 'Dawit Bekele Assefa',
    department: 'IT',
    date: '2026-09-16',
    checkIn: null,
    checkOut: null,
    regularHrs: 0,
    otHrs: 0,
    late: 0,
    status: 'Absent',
  },
  {
    id: 'att-05',
    employeeId: 'EMP-005',
    name: 'Yared Tesfaye Kebede',
    department: 'Logistics',
    date: '2026-09-16',
    checkIn: null,
    checkOut: null,
    regularHrs: 0,
    otHrs: 0,
    late: 0,
    status: 'On Leave',
  },
  {
    id: 'att-06',
    employeeId: 'EMP-007',
    name: 'Kassahun Desta Mengistu',
    department: 'Procurement',
    date: '2026-09-16',
    checkIn: '08:10',
    checkOut: '18:15',
    regularHrs: 8,
    otHrs: 1.25,
    late: 10,
    status: 'Present',
  },
  {
    id: 'att-07',
    employeeId: 'EMP-008',
    name: 'Selam Getahun Mesfin',
    department: 'Sales & Marketing',
    date: '2026-09-16',
    checkIn: '08:00',
    checkOut: '17:00',
    regularHrs: 8,
    otHrs: 0,
    late: 0,
    status: 'Present',
  },
  {
    id: 'att-08',
    employeeId: 'EMP-001',
    name: 'Aster Teshome Worku',
    department: 'Administration',
    date: '2026-09-15',
    checkIn: '07:58',
    checkOut: '17:05',
    regularHrs: 8,
    otHrs: 0,
    late: 0,
    status: 'Present',
  },
  {
    id: 'att-09',
    employeeId: 'EMP-002',
    name: 'Ermias Haile Gebre',
    department: 'Finance',
    date: '2026-09-15',
    checkIn: '08:00',
    checkOut: '18:30',
    regularHrs: 8,
    otHrs: 1.5,
    late: 0,
    status: 'Present',
  },
  {
    id: 'att-10',
    employeeId: 'EMP-003',
    name: 'Meron Alemu Woldemariam',
    department: 'Human Resources',
    date: '2026-09-15',
    checkIn: '08:00',
    checkOut: '17:00',
    regularHrs: 8,
    otHrs: 0,
    late: 0,
    status: 'Present',
  },
  {
    id: 'att-11',
    employeeId: 'EMP-004',
    name: 'Dawit Bekele Assefa',
    department: 'IT',
    date: '2026-09-15',
    checkIn: '08:30',
    checkOut: '18:00',
    regularHrs: 8,
    otHrs: 1.0,
    late: 30,
    status: 'Present',
  },
  {
    id: 'att-12',
    employeeId: 'EMP-005',
    name: 'Yared Tesfaye Kebede',
    department: 'Logistics',
    date: '2026-09-15',
    checkIn: null,
    checkOut: null,
    regularHrs: 0,
    otHrs: 0,
    late: 0,
    status: 'On Leave',
  },
  {
    id: 'att-13',
    employeeId: 'EMP-007',
    name: 'Kassahun Desta Mengistu',
    department: 'Procurement',
    date: '2026-09-15',
    checkIn: '08:00',
    checkOut: '17:00',
    regularHrs: 8,
    otHrs: 0,
    late: 0,
    status: 'Present',
  },
  {
    id: 'att-14',
    employeeId: 'EMP-008',
    name: 'Selam Getahun Mesfin',
    department: 'Sales & Marketing',
    date: '2026-09-15',
    checkIn: '08:15',
    checkOut: '17:45',
    regularHrs: 8,
    otHrs: 0.75,
    late: 15,
    status: 'Present',
  },
  {
    id: 'att-15',
    employeeId: 'EMP-001',
    name: 'Aster Teshome Worku',
    department: 'Administration',
    date: '2026-09-14',
    checkIn: '08:00',
    checkOut: '17:00',
    regularHrs: 8,
    otHrs: 0,
    late: 0,
    status: 'Present',
  },
  {
    id: 'att-16',
    employeeId: 'EMP-002',
    name: 'Ermias Haile Gebre',
    department: 'Finance',
    date: '2026-09-14',
    checkIn: '08:05',
    checkOut: '19:30',
    regularHrs: 8,
    otHrs: 2.5,
    late: 5,
    status: 'Present',
  },
  {
    id: 'att-17',
    employeeId: 'EMP-004',
    name: 'Dawit Bekele Assefa',
    department: 'IT',
    date: '2026-09-14',
    checkIn: '07:50',
    checkOut: '17:10',
    regularHrs: 8,
    otHrs: 0,
    late: 0,
    status: 'Present',
  },
  {
    id: 'att-18',
    employeeId: 'EMP-007',
    name: 'Kassahun Desta Mengistu',
    department: 'Procurement',
    date: '2026-09-14',
    checkIn: null,
    checkOut: null,
    regularHrs: 0,
    otHrs: 0,
    late: 0,
    status: 'Sick Leave',
  },
  {
    id: 'att-19',
    employeeId: 'EMP-008',
    name: 'Selam Getahun Mesfin',
    department: 'Sales & Marketing',
    date: '2026-09-14',
    checkIn: '08:00',
    checkOut: '17:00',
    regularHrs: 8,
    otHrs: 0,
    late: 0,
    status: 'Present',
  },
]

export default function HRAttendance() {
  const [logs, setLogs] = useState(INITIAL_LOGS)

  // Aggregated KPIs
  const metrics = useMemo(() => {
    let present = 0
    let absent = 0
    let onLeave = 0
    let totalOt = 0
    let totalRegular = 0

    logs.forEach((l) => {
      if (l.status === 'Present') present += 1
      else if (l.status === 'Absent') absent += 1
      else if (l.status === 'On Leave' || l.status === 'Sick Leave') onLeave += 1

      totalOt += l.otHrs || 0
      totalRegular += l.regularHrs || 0
    })

    return {
      present,
      absent,
      onLeave,
      totalOt: Math.round(totalOt * 10) / 10,
      totalRegular: Math.round(totalRegular * 10) / 10,
    }
  }, [logs])

  const handleAddLog = (newLog) => {
    setLogs((prev) => [newLog, ...prev])
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          1. PAGE HEADER
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-gray-100">Attendance</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 dark:bg-[#1c2026] dark:text-gray-400 border border-gray-200 dark:border-[#262b31] px-2 py-0.5 rounded-md">
              Punch &amp; Shifts
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
            Workforce daily punch records, scheduled 8-hour shifts &amp; automatic overtime aggregation
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SUMMARY KPI STATS (Section 1)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs flex items-center justify-between dark:bg-[#15181d] dark:border-[#262b31]">
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Present Logged</span>
            <p className="text-3xl font-black text-gray-950 mt-1 dark:text-gray-100">{metrics.present}</p>
            <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Active shifts</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs flex items-center justify-between dark:bg-[#15181d] dark:border-[#262b31]">
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Absences Logged</span>
            <p className="text-3xl font-black text-rose-700 mt-1">{metrics.absent}</p>
            <span className="text-[10px] text-rose-600 font-medium mt-0.5 block">Unexcused absence</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <CalendarX2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs flex items-center justify-between dark:bg-[#15181d] dark:border-[#262b31]">
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">On Leave / Sick</span>
            <p className="text-3xl font-black text-blue-700 mt-1">{metrics.onLeave}</p>
            <span className="text-[10px] text-blue-600 font-medium mt-0.5 block">Statutory leave</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <CalendarCheck size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs flex items-center justify-between dark:bg-[#15181d] dark:border-[#262b31]">
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Overtime Hours</span>
            <p className="text-3xl font-black text-purple-700 mt-1">{metrics.totalOt}h</p>
            <span className="text-[10px] text-purple-600 font-semibold mt-0.5 block">Proc. No. 1156/2019</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SECTION 2: DAILY LOG TABLE (Qirb-Alga Luxury Pension Table)
         ───────────────────────────────────────────────────────────── */}
      <section id="attendance-section-2" aria-labelledby="daily-log-heading">
        <DailyLogTable
          initialLogs={logs}
          employees={MOCK_EMPLOYEES}
          onAddLog={handleAddLog}
          title="Daily Log"
          subtitle="Real-time employee check-in & check-out log with automated regular & overtime calculation"
          showActions={true}
          tableId="attendance-daily-log-table"
        />
      </section>
    </div>
  )
}
