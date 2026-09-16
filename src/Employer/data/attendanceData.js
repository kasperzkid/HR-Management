// ─────────────────────────────────────────────────────────────
// ATTENDANCE — daily check-in/check-out log (14-column schema)
// Regular hrs & OT hrs are derived from check-in/check-out.
// Only this month's log needed for the demo; month/year filterable.
// ─────────────────────────────────────────────────────────────

// Build a date string YYYY-MM-DD for the current month, day offset
function thisMonthDay(year, month, day) {
  return new Date(year, month - 1, day).toISOString().slice(0, 10)
}

function now() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

// Minutes between two "HH:MM" strings
function minutesBetween(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em) - (sh * 60 + sm)
}

// 8:00 start, standard 8h workday → regular hrs 8, extra beyond 17:00 = OT
function derive(checkIn, checkOut) {
  const worked = minutesBetween(checkIn, checkOut) / 60
  const regular = Math.min(8, worked)
  const overtime = Math.max(0, worked - 8)
  return { regular: Math.round(regular * 4) / 4, overtime: Math.round(overtime * 4) / 4 }
}

const { year, month } = now()

export const ATTENDANCE = [
  // Dawit — full attendance with some OT
  ...['03', '04', '05', '06', '07', '10', '11', '12', '13'].map((d) => ({
    id: `att-${d}`,
    date: thisMonthDay(year, month, d),
    employeeId: 'EMP-0001',
    employeeName: 'Dawit Bekele Assefa',
    department: 'Engineering',
    checkIn: '07:58',
    checkOut: d === '07' ? '18:30' : '17:05',
    late: 0,
    earlyDeparture: 0,
    status: 'Present',
    ...derive('07:58', d === '07' ? '18:30' : '17:05'),
  })),
  // Hanna — one sick day, one late
  {
    id: 'att-h1',
    date: thisMonthDay(year, month, '04'),
    employeeId: 'EMP-0002',
    employeeName: 'Hanna Girma Tadesse',
    department: 'Design',
    checkIn: '08:14',
    checkOut: '17:10',
    late: 14,
    earlyDeparture: 0,
    status: 'Present',
    ...derive('08:14', '17:10'),
  },
  {
    id: 'att-h2',
    date: thisMonthDay(year, month, '05'),
    employeeId: 'EMP-0002',
    employeeName: 'Hanna Girma Tadesse',
    department: 'Design',
    checkIn: '08:02',
    checkOut: '17:04',
    late: 2,
    earlyDeparture: 0,
    status: 'Present',
    ...derive('08:02', '17:04'),
  },
  {
    id: 'att-h3',
    date: thisMonthDay(year, month, '08'),
    employeeId: 'EMP-0002',
    employeeName: 'Hanna Girma Tadesse',
    department: 'Design',
    checkIn: null,
    checkOut: null,
    late: 0,
    earlyDeparture: 0,
    status: 'Sick Leave',
    regular: 0,
    overtime: 0,
  },
  // Yonatan — late twice
  ...['03', '04', '05'].map((d) => ({
    id: `att-y${d}`,
    date: thisMonthDay(year, month, d),
    employeeId: 'EMP-0003',
    employeeName: 'Yonatan Tesfaye Kebede',
    department: 'Engineering',
    checkIn: d === '03' ? '08:20' : '08:01',
    checkOut: d === '03' ? '19:00' : '17:00',
    late: d === '03' ? 20 : 1,
    earlyDeparture: 0,
    status: 'Present',
    ...derive(d === '03' ? '08:20' : '08:01', d === '03' ? '19:00' : '17:00'),
  })),
  // Meron — out for meeting (On Leave)
  {
    id: 'att-m1',
    date: thisMonthDay(year, month, '06'),
    employeeId: 'EMP-0004',
    employeeName: 'Meron Alemu Woldemariam',
    department: 'Human Resources',
    checkIn: '08:00',
    checkOut: '13:00',
    late: 0,
    earlyDeparture: 0,
    status: 'On Leave',
    regular: 5,
    overtime: 0,
  },
  // Ermias one day
  {
    id: 'att-e1',
    date: thisMonthDay(year, month, '04'),
    employeeId: 'EMP-0005',
    employeeName: 'Ermias Haile Gebre',
    department: 'Finance & Accounting',
    checkIn: '07:55',
    checkOut: '17:05',
    late: 0,
    earlyDeparture: 0,
    status: 'Present',
    ...derive('07:55', '17:05'),
  },
  // Selam (contractual)
  {
    id: 'att-s1',
    date: thisMonthDay(year, month, '04'),
    employeeId: 'EMP-0006',
    employeeName: 'Selam Getahun Mesfin',
    department: 'Sales & Marketing',
    checkIn: '08:00',
    checkOut: '19:30',
    late: 0,
    earlyDeparture: 0,
    status: 'Present',
    ...derive('08:00', '19:30'),
  },
  // Tigist — absent (maternity leave)
  {
    id: 'att-t1',
    date: thisMonthDay(year, month, '04'),
    employeeId: 'EMP-0008',
    employeeName: 'Tigist Berhanu Wolde',
    department: 'Operations',
    checkIn: null,
    checkOut: null,
    late: 0,
    earlyDeparture: 0,
    status: 'Absent',
    regular: 0,
    overtime: 0,
  },
  // Sara
  {
    id: 'att-s2',
    date: thisMonthDay(year, month, '05'),
    employeeId: 'EMP-0010',
    employeeName: 'Sara Mekonnen Abate',
    department: 'Design',
    checkIn: '08:05',
    checkOut: '18:00',
    late: 5,
    earlyDeparture: 0,
    status: 'Present',
    ...derive('08:05', '18:00'),
  },
  // Kaleb
  {
    id: 'att-k1',
    date: thisMonthDay(year, month, '05'),
    employeeId: 'EMP-0011',
    employeeName: 'Kaleb Tesfamariam',
    department: 'Sales & Marketing',
    checkIn: '08:10',
    checkOut: '17:20',
    late: 10,
    earlyDeparture: 0,
    status: 'Present',
    ...derive('08:10', '17:20'),
  },
]

// Aggregate OT hours per employee for the payroll engine
export function attendanceTotals(attendance) {
  const map = {}
  attendance.forEach((a) => {
    map[a.employeeId] = map[a.employeeId] || { days: 0, totalHours: 0, totalOtHours: 0, absences: 0 }
    const agg = map[a.employeeId]
    if (a.status === 'Present' || a.status === 'On Leave') {
      agg.days += 1
      agg.totalHours += a.regular || 0
      agg.totalOtHours += a.overtime || 0
    } else {
      agg.absences += 1
    }
  })
  return map
}