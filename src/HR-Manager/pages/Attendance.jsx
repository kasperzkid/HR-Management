import React, { useState } from 'react'
import {
  CalendarCheck,
  Clock,
  UserCheck,
  CalendarX2,
  Plus,
  CheckCircle,
  X,
} from 'lucide-react'
import { HR_SETTINGS } from '../data/settingsData'
import { MOCK_EMPLOYEES } from '../data/mockData'

export default function HRAttendance() {
  const [logs, setLogs] = useState([
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
      status: 'Present',
    },
  ])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({
    employeeId: MOCK_EMPLOYEES[0].employeeId,
    checkIn: '08:00',
    checkOut: '17:00',
    status: 'Present',
  })

  const handleAddAttendance = (e) => {
    e.preventDefault()
    const emp = MOCK_EMPLOYEES.find((m) => m.employeeId === form.employeeId)
    const newLog = {
      id: `att-${Date.now()}`,
      employeeId: form.employeeId,
      name: emp ? emp.name : 'Staff Member',
      department: emp ? emp.department : 'General',
      date: '2026-09-16',
      checkIn: form.status === 'Present' ? form.checkIn : null,
      checkOut: form.status === 'Present' ? form.checkOut : null,
      regularHrs: form.status === 'Present' ? 8 : 0,
      otHrs: form.status === 'Present' ? 1.0 : 0,
      status: form.status,
    }
    setLogs([newLog, ...logs])
    setIsModalOpen(false)
  }

  const presentCount = logs.filter((l) => l.status === 'Present').length
  const absentCount = logs.filter((l) => l.status === 'Absent').length
  const onLeaveCount = logs.filter((l) => l.status === 'On Leave').length

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950">Daily Attendance Log</h1>
          <p className="text-xs text-gray-500 mt-1">
            Live weekday attendance, punch records &amp; automatic overtime aggregation
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-950 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
        >
          <Plus size={15} />
          <span>Record Attendance</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Present Today</span>
            <p className="text-3xl font-black text-gray-950 mt-1">{presentCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Absent Today (Weekday Log)</span>
            <p className="text-3xl font-black text-amber-700 mt-1">{absentCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <CalendarX2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">On Leave</span>
            <p className="text-3xl font-black text-blue-700 mt-1">{onLeaveCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <CalendarCheck size={20} />
          </div>
        </div>
      </div>

      {/* Attendance Log Table */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Check-In</th>
                <th className="py-3 px-4">Check-Out</th>
                <th className="py-3 px-4">Regular Hrs</th>
                <th className="py-3 px-4">Overtime Hrs</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-gray-950">
                    <div>{l.name}</div>
                    <span className="text-[10px] font-mono text-gray-400">{l.employeeId}</span>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-700">{l.department}</td>
                  <td className="py-3 px-4 font-mono text-gray-600">{l.date}</td>
                  <td className="py-3 px-4 font-mono text-gray-900">{l.checkIn || '—'}</td>
                  <td className="py-3 px-4 font-mono text-gray-900">{l.checkOut || '—'}</td>
                  <td className="py-3 px-4 tabular-nums text-gray-800">{l.regularHrs} hrs</td>
                  <td className="py-3 px-4 tabular-nums font-bold text-gray-950">
                    {l.otHrs > 0 ? `${l.otHrs} hrs` : '0'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        l.status === 'Present'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : l.status === 'Absent'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Recording Attendance */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <h3 className="text-sm font-bold text-gray-950">Record Attendance</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddAttendance} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Employee</label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                >
                  {MOCK_EMPLOYEES.map((e) => (
                    <option key={e.employeeId} value={e.employeeId}>
                      {e.name} ({e.department})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Sick Leave">Sick Leave</option>
                </select>
              </div>
              {form.status === 'Present' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Check In</label>
                    <input
                      type="time"
                      value={form.checkIn}
                      onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Check Out</label>
                    <input
                      type="time"
                      value={form.checkOut}
                      onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-950 text-white rounded-lg font-semibold"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
