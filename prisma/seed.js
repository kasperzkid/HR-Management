import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { SETTINGS } from '../src/Employer/data/settingsData.js'
import {
  calculateTieredOvertimePay,
  tieredOvertimeHours,
} from '../src/lib/overtime.js'

const prisma = new PrismaClient()

const SALT_ROUNDS = 10

const USERS = [
  { name: 'Alex Johnson', email: 'employer@yanol.com', password: 'employer123', role: 'EMPLOYER' },
  { name: 'Sarah Jenkins', email: 'hr@yanol.com', password: 'hr123', role: 'HR_MANAGER' },
  { name: 'Employee', email: 'employee@yanol.com', password: 'employee123', role: 'EMPLOYEE' },
]

// ─────────────────────────────────────────────────────────────
// SEED EMPLOYEES
// Each seeded employee also gets a portal login (role EMPLOYEE,
// password "employee123"). The first one uses employee@yanol.com so
// the existing demo EMPLOYEE account maps to an employee profile.
// ─────────────────────────────────────────────────────────────
const EMPLOYEES = [
  {
    employeeId: 'EMP-001',
    id: 'emp-001-demis-bekele',
    name: 'Demis Bekele',
    gender: 'Male',
    dateOfBirth: '1992-04-18',
    joinDate: '2020-02-10',
    jobTitle: 'Developer',
    department: 'Administration',
    employmentType: 'Permanent',
    payrollType: 'permanent',
    basicSalary: 18000,
    transportAllowance: 1000,
    housingAllowance: 2000,
    mealAllowance: 500,
    otherAllowance: 300,
    bankName: 'Awash Bank',
    bankAccount: '0134-5678-9012',
    tin: '101-123-456',
    pensionId: 'PEN-0001',
    phone: '+251 911 123 456',
    email: 'employee@yanol.com',
    address: 'Bole, Addis Ababa',
    emergencyContact: '+251 911 000 111',
    employmentStatus: 'Active',
    notes: 'Seeded demo employee. Front-end developer.',
    manager: 'Mulugeta Kassa',
  },
  {
    employeeId: 'EMP-002',
    id: 'emp-002-helina-tadesse',
    name: 'Helina Tadesse',
    gender: 'Female',
    dateOfBirth: '1995-09-02',
    joinDate: '2021-06-15',
    jobTitle: 'Accountant',
    department: 'Finance',
    employmentType: 'Permanent',
    payrollType: 'permanent',
    basicSalary: 15000,
    transportAllowance: 800,
    housingAllowance: 1500,
    mealAllowance: 600,
    otherAllowance: 0,
    bankName: 'Commercial Bank of Ethiopia',
    bankAccount: '1000-2211-3344',
    tin: '101-654-789',
    pensionId: 'PEN-0002',
    phone: '+251 912 234 567',
    email: 'helina.tadesse@yanol.com',
    address: 'Kazanchis, Addis Ababa',
    emergencyContact: '+251 911 222 333',
    employmentStatus: 'Active',
    notes: 'Seeded demo employee. Finance team.',
    manager: 'Mulugeta Kassa',
  },
  {
    employeeId: 'EMP-003',
    id: 'emp-003-solomon-girma',
    name: 'Solomon Girma',
    gender: 'Male',
    dateOfBirth: '1989-12-25',
    joinDate: '2019-03-01',
    jobTitle: 'HR Officer',
    department: 'Human Resources',
    employmentType: 'Permanent',
    payrollType: 'permanent',
    basicSalary: 14500,
    transportAllowance: 700,
    housingAllowance: 1200,
    mealAllowance: 500,
    otherAllowance: 200,
    bankName: 'Dashen Bank',
    bankAccount: '0445-9090-1212',
    tin: '101-987-123',
    pensionId: 'PEN-0003',
    phone: '+251 913 345 678',
    email: 'solomon.girma@yanol.com',
    address: 'Piazza, Addis Ababa',
    emergencyContact: '+251 911 333 444',
    employmentStatus: 'Active',
    notes: 'Seeded demo employee. Handles onboarding.',
    manager: 'Mulugeta Kassa',
  },
  {
    employeeId: 'EMP-004',
    id: 'emp-004-meron-assefa',
    name: 'Meron Assefa',
    gender: 'Female',
    dateOfBirth: '1997-07-14',
    joinDate: '2022-01-03',
    jobTitle: 'Operations Coordinator',
    department: 'Operations',
    employmentType: 'Permanent',
    payrollType: 'permanent',
    basicSalary: 13000,
    transportAllowance: 600,
    housingAllowance: 1000,
    mealAllowance: 500,
    otherAllowance: 0,
    bankName: 'Awash Bank',
    bankAccount: '0134-7788-9900',
    tin: '101-321-654',
    pensionId: 'PEN-0004',
    phone: '+251 914 456 789',
    email: 'meron.assefa@yanol.com',
    address: 'Legetafo, Addis Ababa',
    emergencyContact: '+251 911 444 555',
    employmentStatus: 'Active',
    notes: 'Seeded demo employee.',
    manager: 'Mulugeta Kassa',
  },
  {
    employeeId: 'EMP-005',
    id: 'emp-005-yonas-alemu',
    name: 'Yonas Alemu',
    gender: 'Male',
    dateOfBirth: '1999-01-30',
    joinDate: '2023-08-07',
    jobTitle: 'IT Support Engineer',
    department: 'IT',
    employmentType: 'Contractual',
    payrollType: 'contractual',
    basicSalary: 11000,
    transportAllowance: 500,
    housingAllowance: 900,
    mealAllowance: 400,
    otherAllowance: 0,
    bankName: 'Bank of Abyssinia',
    bankAccount: '0332-1122-3344',
    tin: '101-159-357',
    pensionId: 'PEN-0005',
    phone: '+251 915 567 890',
    email: 'yonas.alemu@yanol.com',
    address: 'Mexico, Addis Ababa',
    emergencyContact: '+251 911 555 666',
    employmentStatus: 'Active',
    notes: 'Contractual — exempt from statutory deductions.',
    manager: 'Mulugeta Kassa',
  },
  {
    employeeId: 'EMP-006',
    id: 'emp-006-sara-mohammed',
    name: 'Sara Mohammed',
    gender: 'Female',
    dateOfBirth: '2001-11-08',
    joinDate: '2024-09-09',
    jobTitle: 'UI Designer',
    department: 'Design',
    employmentType: 'Intern',
    payrollType: 'intern',
    basicSalary: 8000,
    transportAllowance: 0,
    housingAllowance: 500,
    mealAllowance: 300,
    otherAllowance: 0,
    bankName: 'Commercial Bank of Ethiopia',
    bankAccount: '1000-5566-7788',
    tin: '101-753-951',
    pensionId: '',
    phone: '+251 916 678 901',
    email: 'sara.mohammed@yanol.com',
    address: '4 Kilo, Addis Ababa',
    emergencyContact: '+251 911 666 777',
    employmentStatus: 'Active',
    notes: 'Intern — exempt from statutory deductions.',
    manager: 'Mulugeta Kassa',
  },
  {
    employeeId: 'EMP-007',
    id: 'emp-007-mulugeta-kassa',
    name: 'Mulugeta Kassa',
    gender: 'Male',
    dateOfBirth: '1985-03-12',
    joinDate: '2018-01-15',
    jobTitle: 'Chief Executive Officer',
    department: 'Executive',
    employmentType: 'Permanent',
    payrollType: 'permanent',
    basicSalary: 45000,
    transportAllowance: 1500,
    housingAllowance: 2500,
    mealAllowance: 600,
    otherAllowance: 500,
    bankName: 'Awash Bank',
    bankAccount: '0134-1001-2003',
    tin: '101-111-001',
    pensionId: 'PEN-0007',
    phone: '+251 911 010 101',
    email: 'mulugeta.kassa@yanol.com',
    address: 'Bole, Addis Ababa',
    emergencyContact: '+251 911 101 202',
    employmentStatus: 'Active',
    notes: 'Seeded demo employee. Company CEO.',
    manager: '',
  },
  {
    employeeId: 'EMP-008',
    id: 'emp-008-marta-bekele',
    name: 'Marta Bekele',
    gender: 'Female',
    dateOfBirth: '1988-06-21',
    joinDate: '2018-04-02',
    jobTitle: 'Chief Operating Officer',
    department: 'Executive',
    employmentType: 'Permanent',
    payrollType: 'permanent',
    basicSalary: 38000,
    transportAllowance: 1300,
    housingAllowance: 2200,
    mealAllowance: 600,
    otherAllowance: 400,
    bankName: 'Commercial Bank of Ethiopia',
    bankAccount: '1000-3004-5006',
    tin: '101-111-002',
    pensionId: 'PEN-0008',
    phone: '+251 917 020 202',
    email: 'marta.bekele@yanol.com',
    address: 'Old Airport, Addis Ababa',
    emergencyContact: '+251 911 202 303',
    employmentStatus: 'Active',
    notes: 'Seeded demo employee. Runs day-to-day operations.',
    manager: 'Mulugeta Kassa',
  },
  {
    employeeId: 'EMP-009',
    id: 'emp-009-abiy-solomon',
    name: 'Abiy Solomon',
    gender: 'Male',
    dateOfBirth: '1990-01-09',
    joinDate: '2019-02-11',
    jobTitle: 'Chief Technology Officer',
    department: 'IT',
    employmentType: 'Permanent',
    payrollType: 'permanent',
    basicSalary: 36000,
    transportAllowance: 1200,
    housingAllowance: 2000,
    mealAllowance: 600,
    otherAllowance: 400,
    bankName: 'Dashen Bank',
    bankAccount: '0445-4007-8009',
    tin: '101-111-003',
    pensionId: 'PEN-0009',
    phone: '+251 918 030 303',
    email: 'abiy.solomon@yanol.com',
    address: 'CMC, Addis Ababa',
    emergencyContact: '+251 911 303 404',
    employmentStatus: 'Active',
    notes: 'Seeded demo employee. Leads the IT department.',
    manager: 'Mulugeta Kassa',
  },
  {
    employeeId: 'EMP-010',
    id: 'emp-010-dawit-haile',
    name: 'Dawit Haile',
    gender: 'Male',
    dateOfBirth: '1991-08-17',
    joinDate: '2020-07-20',
    jobTitle: 'Finance Manager',
    department: 'Finance',
    employmentType: 'Permanent',
    payrollType: 'permanent',
    basicSalary: 22000,
    transportAllowance: 900,
    housingAllowance: 1600,
    mealAllowance: 500,
    otherAllowance: 200,
    bankName: 'Awash Bank',
    bankAccount: '0134-5010-1011',
    tin: '101-111-004',
    pensionId: 'PEN-0010',
    phone: '+251 919 040 404',
    email: 'dawit.haile@yanol.com',
    address: 'Saris, Addis Ababa',
    emergencyContact: '+251 911 404 505',
    employmentStatus: 'Active',
    notes: 'Seeded demo employee. Owns payroll sign-off.',
    manager: 'Mulugeta Kassa',
  },
  {
    employeeId: 'EMP-011',
    id: 'emp-011-rahel-tesfaye',
    name: 'Rahel Tesfaye',
    gender: 'Female',
    dateOfBirth: '1992-11-28',
    joinDate: '2019-09-01',
    jobTitle: 'HR Director',
    department: 'Human Resources',
    employmentType: 'Permanent',
    payrollType: 'permanent',
    basicSalary: 28000,
    transportAllowance: 1100,
    housingAllowance: 1900,
    mealAllowance: 500,
    otherAllowance: 300,
    bankName: 'Bank of Abyssinia',
    bankAccount: '0332-6011-1213',
    tin: '101-111-005',
    pensionId: 'PEN-0011',
    phone: '+251 910 050 505',
    email: 'rahel.tesfaye@yanol.com',
    address: 'Megenagna, Addis Ababa',
    emergencyContact: '+251 911 505 606',
    employmentStatus: 'Active',
    notes: 'Seeded demo employee. HR policy and recruitment.',
    manager: 'Mulugeta Kassa',
  },
  {
    employeeId: 'EMP-012',
    id: 'emp-012-kassahun-desta',
    name: 'Kassahun Desta',
    gender: 'Male',
    dateOfBirth: '1989-04-05',
    joinDate: '2019-05-13',
    jobTitle: 'Director of Operations',
    department: 'Operations',
    employmentType: 'Permanent',
    payrollType: 'permanent',
    basicSalary: 26000,
    transportAllowance: 1000,
    housingAllowance: 1800,
    mealAllowance: 500,
    otherAllowance: 300,
    bankName: 'Commercial Bank of Ethiopia',
    bankAccount: '1000-7012-1415',
    tin: '101-111-006',
    pensionId: 'PEN-0012',
    phone: '+251 921 060 606',
    email: 'kassahun.desta@yanol.com',
    address: 'Gerji, Addis Ababa',
    emergencyContact: '+251 911 606 707',
    employmentStatus: 'On Leave',
    notes: 'Seeded demo employee. Currently on annual leave.',
    manager: 'Mulugeta Kassa',
  },
  {
    employeeId: 'EMP-013',
    id: 'emp-013-betelhem-abebe',
    name: 'Betelhem Abebe',
    gender: 'Female',
    dateOfBirth: '1993-02-25',
    joinDate: '2021-03-15',
    jobTitle: 'IT Manager',
    department: 'IT',
    employmentType: 'Permanent',
    payrollType: 'permanent',
    basicSalary: 24000,
    transportAllowance: 900,
    housingAllowance: 1600,
    mealAllowance: 500,
    otherAllowance: 200,
    bankName: 'Dashen Bank',
    bankAccount: '0445-8013-1617',
    tin: '101-111-007',
    pensionId: 'PEN-0013',
    phone: '+251 922 070 707',
    email: 'betelhem.abebe@yanol.com',
    address: 'Summit, Addis Ababa',
    emergencyContact: '+251 911 707 808',
    employmentStatus: 'Active',
    notes: 'Seeded demo employee. Manages infrastructure and support.',
    manager: 'Abiy Solomon',
  },
  {
    employeeId: 'EMP-014',
    id: 'emp-014-samuel-negash',
    name: 'Samuel Negash',
    gender: 'Male',
    dateOfBirth: '1994-10-11',
    joinDate: '2022-05-02',
    jobTitle: 'Marketing Lead',
    department: 'Sales & Marketing',
    employmentType: 'Permanent',
    payrollType: 'permanent',
    basicSalary: 17000,
    transportAllowance: 800,
    housingAllowance: 1400,
    mealAllowance: 500,
    otherAllowance: 200,
    bankName: 'Awash Bank',
    bankAccount: '0134-9014-1819',
    tin: '101-111-008',
    pensionId: 'PEN-0014',
    phone: '+251 923 080 808',
    email: 'samuel.negash@yanol.com',
    address: 'Jemo, Addis Ababa',
    emergencyContact: '+251 911 808 909',
    employmentStatus: 'Active',
    notes: 'Seeded demo employee. Campaigns and brand.',
    manager: 'Marta Bekele',
  },
  {
    employeeId: 'EMP-015',
    id: 'emp-015-nahom-teklu',
    name: 'Nahom Teklu',
    gender: 'Male',
    dateOfBirth: '1996-12-03',
    joinDate: '2021-10-04',
    jobTitle: 'Senior Software Developer',
    department: 'IT',
    employmentType: 'Permanent',
    payrollType: 'permanent',
    basicSalary: 21000,
    transportAllowance: 900,
    housingAllowance: 1500,
    mealAllowance: 500,
    otherAllowance: 300,
    bankName: 'Bank of Abyssinia',
    bankAccount: '0332-1015-2021',
    tin: '101-111-009',
    pensionId: 'PEN-0015',
    phone: '+251 924 090 909',
    email: 'nahom.teklu@yanol.com',
    address: 'Ayat, Addis Ababa',
    emergencyContact: '+251 911 909 010',
    employmentStatus: 'Active',
    notes: 'Seeded demo employee. Backend and integrations.',
    manager: 'Betelhem Abebe',
  },
  {
    employeeId: 'EMP-016',
    id: 'emp-016-tigist-ayele',
    name: 'Tigist Ayele',
    gender: 'Female',
    dateOfBirth: '1995-05-19',
    joinDate: '2022-11-14',
    jobTitle: 'Logistics Coordinator',
    department: 'Operations',
    employmentType: 'Permanent',
    payrollType: 'permanent',
    basicSalary: 12500,
    transportAllowance: 600,
    housingAllowance: 1000,
    mealAllowance: 500,
    otherAllowance: 0,
    bankName: 'Commercial Bank of Ethiopia',
    bankAccount: '1000-2016-2223',
    tin: '101-111-010',
    pensionId: 'PEN-0016',
    phone: '+251 925 111 112',
    email: 'tigist.ayele@yanol.com',
    address: 'Kality, Addis Ababa',
    emergencyContact: '+251 911 112 113',
    employmentStatus: 'Active',
    notes: 'Seeded demo employee. Fleet and supplies.',
    manager: 'Kassahun Desta',
  },
  {
    employeeId: 'EMP-017',
    id: 'emp-017-liya-girma',
    name: 'Liya Girma',
    gender: 'Female',
    dateOfBirth: '1999-07-22',
    joinDate: '2024-02-05',
    jobTitle: 'Junior Accountant',
    department: 'Finance',
    employmentType: 'Contractual',
    payrollType: 'contractual',
    basicSalary: 9500,
    transportAllowance: 400,
    housingAllowance: 800,
    mealAllowance: 400,
    otherAllowance: 0,
    bankName: 'Awash Bank',
    bankAccount: '0134-3017-2425',
    tin: '101-111-011',
    pensionId: 'PEN-0017',
    phone: '+251 926 113 114',
    email: 'liya.girma@yanol.com',
    address: 'Addis Ketema, Addis Ababa',
    emergencyContact: '+251 911 114 115',
    employmentStatus: 'Active',
    notes: 'Contractual — exempt from statutory deductions.',
    manager: 'Dawit Haile',
  },
  {
    employeeId: 'EMP-018',
    id: 'emp-018-hana-yilma',
    name: 'Hana Yilma',
    gender: 'Female',
    dateOfBirth: '2000-03-30',
    joinDate: '2024-06-17',
    jobTitle: 'Sales Associate',
    department: 'Sales & Marketing',
    employmentType: 'Permanent',
    payrollType: 'permanent',
    basicSalary: 8500,
    transportAllowance: 500,
    housingAllowance: 900,
    mealAllowance: 300,
    otherAllowance: 0,
    bankName: 'Dashen Bank',
    bankAccount: '0445-4018-2627',
    tin: '101-111-012',
    pensionId: 'PEN-0018',
    phone: '+251 927 115 116',
    email: 'hana.yilma@yanol.com',
    address: 'Kolfe, Addis Ababa',
    emergencyContact: '+251 911 116 117',
    employmentStatus: 'Active',
    notes: 'Seeded demo employee. Inside sales.',
    manager: 'Samuel Negash',
  },
]

// ─────────────────────────────────────────────────────────────
// DATE HELPERS (Addis Ababa is the app's canonical timezone)
// ─────────────────────────────────────────────────────────────
function addisToday() {
  const now = new Date()
  const addis = new Date(now.getTime() + (3 * 60 + now.getTimezoneOffset()) * 60000)
  return addis.toISOString().slice(0, 10)
}

function shiftDate(dateKey, days) {
  const d = new Date(`${dateKey}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function weekday(dateKey) {
  return new Date(`${dateKey}T00:00:00`).getDay() // 0 Sun … 6 Sat
}

function toMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function pickClock(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return `${h}:${m}`
}

// ─────────────────────────────────────────────────────────────
// ATTENDANCE GENERATION
// Mirrors server/controllers/punch.controller.js deriveStats:
//   late   = max(0, checkIn − 08:00)
//   regular = 15-min-rounded min(worked, 8.5h)
//   overtime = 15-min-rounded max(0, worked − 8.5h)
// Weekend / public-holiday rows are the ones that exercise the
// higher Art. 68 overtime tiers.
// ─────────────────────────────────────────────────────────────
const WORK_START_MINUTES = 8 * 60 // 08:00
const STANDARD_WORK_MINUTES = 8 * 60 + 30 // 08:00 → 17:30
const ETHIOPIAN_NEW_YEAR = '2026-09-11' // public holiday in window

function deriveStats(checkInTime, checkOutTime) {
  const inMin = toMinutes(checkInTime)
  const outMin = toMinutes(checkOutTime)
  const worked = outMin - inMin
  const late = Math.max(0, inMin - WORK_START_MINUTES)
  const overtime = Math.max(0, worked - STANDARD_WORK_MINUTES)
  return {
    late,
    regular: Math.round(Math.min(worked, STANDARD_WORK_MINUTES) / 15) * 0.25,
    overtime: Math.round(overtime / 15) * 0.25,
  }
}

// Deterministic PRNG so every seed run produces the same records.
function makeRng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function buildAttendanceFor(employee, today) {
  const rows = []
  const rand = makeRng((employee.employeeId.length * 2654435761) ^ 0x9e3779b9)

  for (let offset = 41; offset >= 0; offset -= 1) {
    const date = shiftDate(today, -offset)
    const day = weekday(date)

    // No attendance rows on weekends (punch clock is disabled Sat/Sun).
    if (day === 0 || day === 6) continue

    // Public holiday — the employee is off unless they worked it.
    if (date === ETHIOPIAN_NEW_YEAR) {
      if (employee.employeeId === 'EMP-001') {
        const checkIn = '08:00'
        const checkOut = '18:30' // holiday overtime (2×)
        rows.push({ date, status: 'PH', checkIn, checkOut, ...deriveStats(checkIn, checkOut), employeeName: employee.name, department: employee.department })
      } else {
        rows.push({ date, status: 'PH', checkIn: null, checkOut: null, late: 0, regular: 0, overtime: 0, employeeName: employee.name, department: employee.department })
      }
      continue
    }

    switch (employee.employeeId) {
      case 'EMP-001': {
        // Mostly on time, occasional late, regular + a few night OT shifts.
        const lateChance = rand()
        const inMin = lateChance < 0.12 ? WORK_START_MINUTES + 18 + Math.floor(rand() * 22) : WORK_START_MINUTES + Math.floor(rand() * 11)
        const otRoll = rand()
        let outMin
        if (otRoll < 0.1) outMin = 22 * 60 + Math.floor(rand() * 45) // past 10 PM → night tier
        else if (otRoll < 0.35) outMin = 18 * 60 + 30 + Math.floor(rand() * 60) // evening OT
        else outMin = 17 * 60 + 30 + Math.floor(rand() * 8)
        const checkIn = pickClock(inMin)
        const checkOut = pickClock(outMin)
        rows.push({ date, status: 'P', checkIn, checkOut, ...deriveStats(checkIn, checkOut), employeeName: employee.name, department: employee.department })
        break
      }
      case 'EMP-002': {
        // Two sick-leave days in the window; otherwise present.
        if (date === shiftDate(today, -13) || date === shiftDate(today, -12)) {
          rows.push({ date, status: 'SL', checkIn: null, checkOut: null, late: 0, regular: 0, overtime: 0, employeeName: employee.name, department: employee.department })
          break
        }
        const checkIn = pickClock(WORK_START_MINUTES + (rand() < 0.2 ? 10 + Math.floor(rand() * 15) : Math.floor(rand() * 10)))
        const checkOut = pickClock(17 * 60 + 30 + (rand() < 0.15 ? Math.floor(rand() * 40) : Math.floor(rand() * 6)))
        rows.push({ date, status: 'P', checkIn, checkOut, ...deriveStats(checkIn, checkOut), employeeName: employee.name, department: employee.department })
        break
      }
      case 'EMP-003': {
        // Approved annual leave block mid-window.
        if (date >= shiftDate(today, -20) && date <= shiftDate(today, -16)) {
          rows.push({ date, status: 'AL', checkIn: null, checkOut: null, late: 0, regular: 0, overtime: 0, employeeName: employee.name, department: employee.department })
          break
        }
        const checkIn = pickClock(WORK_START_MINUTES + Math.floor(rand() * 8))
        const checkOut = pickClock(17 * 60 + 30 + Math.floor(rand() * 6))
        rows.push({ date, status: 'P', checkIn, checkOut, ...deriveStats(checkIn, checkOut), employeeName: employee.name, department: employee.department })
        break
      }
      case 'EMP-004': {
        // Two unexcused absences, otherwise late-ish at times.
        if (date === shiftDate(today, -9) || date === shiftDate(today, -7)) {
          rows.push({ date, status: 'A', checkIn: null, checkOut: null, late: 0, regular: 0, overtime: 0, employeeName: employee.name, department: employee.department })
          break
        }
        const lateMin = rand() < 0.25 ? 10 + Math.floor(rand() * 25) : Math.floor(rand() * 8)
        const checkIn = pickClock(WORK_START_MINUTES + lateMin)
        const checkOut = pickClock(17 * 60 + 30 + Math.floor(rand() * 10))
        rows.push({ date, status: 'P', checkIn, checkOut, ...deriveStats(checkIn, checkOut), employeeName: employee.name, department: employee.department })
        break
      }
      case 'EMP-005': {
        const checkIn = pickClock(WORK_START_MINUTES + Math.floor(rand() * 12))
        const checkOut = pickClock(17 * 60 + 30 + (rand() < 0.2 ? 20 + Math.floor(rand() * 40) : Math.floor(rand() * 6)))
        rows.push({ date, status: 'P', checkIn, checkOut, ...deriveStats(checkIn, checkOut), employeeName: employee.name, department: employee.department })
        break
      }
      default: {
        // EMP-006: one absence, otherwise present.
        if (date === shiftDate(today, -3)) {
          rows.push({ date, status: 'A', checkIn: null, checkOut: null, late: 0, regular: 0, overtime: 0, employeeName: employee.name, department: employee.department })
          break
        }
        const checkIn = pickClock(WORK_START_MINUTES + Math.floor(rand() * 6))
        const checkOut = pickClock(17 * 60 + 30 + Math.floor(rand() * 4))
        rows.push({ date, status: 'P', checkIn, checkOut, ...deriveStats(checkIn, checkOut), employeeName: employee.name, department: employee.department })
        break
      }
    }
  }

  // One Saturday OT shift for Demis to demonstrate the weekly rest-day (1.5×)
  // plus a night-shift day. These highlight the Art. 68 tiers in reports.
  if (employee.employeeId === 'EMP-001') {
    let satDate = null
    for (let off = 1; off <= 41 && !satDate; off += 1) {
      const d = shiftDate(today, -off)
      if (weekday(d) === 6) satDate = d
    }
    if (satDate) {
      const checkIn = '09:00'
      const checkOut = '18:30'
      rows.push({ date: satDate, status: 'P', checkIn, checkOut, ...deriveStats(checkIn, checkOut), employeeName: employee.name, department: employee.department })
    }
  }

  return rows
}

// ─────────────────────────────────────────────────────────────
// PAYROLL (mirrors server/controllers/hr-manager.controller.js:
// PAYE brackets, 7%/11% pension, tiered overtime).
// ─────────────────────────────────────────────────────────────
const EMPLOYEE_PENSION_RATE = 0.07
const EMPLOYER_PENSION_RATE = 0.11

const PAYE_BRACKETS = [
  { min: 0, max: 2000, rate: 0, subtraction: 0 },
  { min: 2001, max: 4000, rate: 0.15, subtraction: 300 },
  { min: 4001, max: 7000, rate: 0.2, subtraction: 500 },
  { min: 7001, max: 10000, rate: 0.25, subtraction: 850 },
  { min: 10001, max: 14000, rate: 0.3, subtraction: 1350 },
  { min: 14001, max: Infinity, rate: 0.35, subtraction: 2050 },
]

function incomeTax(taxableIncome) {
  if (taxableIncome <= 0) return 0
  const bracket = PAYE_BRACKETS.find((b) => taxableIncome >= b.min && taxableIncome <= b.max)
  return Math.max(0, taxableIncome * bracket.rate - bracket.subtraction)
}

function isExempt(employee) {
  const t = String(employee.payrollType || employee.employmentType || '').toLowerCase()
  return t === 'contractual' || t === 'intern'
}

function computePayroll(employee, attendanceRows) {
  const exempt = isExempt(employee)
  const tiers = tieredOvertimeHours(attendanceRows)
  const overtimePay = calculateTieredOvertimePay(employee.basicSalary, tiers)

  const grossSalary =
    employee.basicSalary +
    employee.transportAllowance +
    employee.housingAllowance +
    employee.mealAllowance +
    employee.otherAllowance +
    overtimePay

  const pensionDeduction = exempt ? 0 : Number((employee.basicSalary * EMPLOYEE_PENSION_RATE).toFixed(2))
  const taxableIncome = Math.max(0, grossSalary - pensionDeduction)
  const incomeTaxValue = exempt ? 0 : Number(incomeTax(taxableIncome).toFixed(2))
  const totalDeductions = Number((pensionDeduction + incomeTaxValue).toFixed(2))
  const netSalary = Number((grossSalary - totalDeductions).toFixed(2))
  const employerPension = exempt ? 0 : Number((employee.basicSalary * EMPLOYER_PENSION_RATE).toFixed(2))
  const employerCost = Number((grossSalary + employerPension).toFixed(2))

  return {
    basicSalary: employee.basicSalary,
    transportAllowance: employee.transportAllowance,
    housingAllowance: employee.housingAllowance,
    mealAllowance: employee.mealAllowance,
    otherAllowance: employee.otherAllowance,
    overtimePay: Number(overtimePay.toFixed(2)),
    grossSalary,
    pensionDeduction,
    incomeTax: incomeTaxValue,
    loanDeduction: 0,
    otherDeduction: 0,
    totalDeductions,
    netSalary,
    employerPension,
    employerCost,
  }
}

// ─────────────────────────────────────────────────────────────
// LEAVE REQUESTS
// ─────────────────────────────────────────────────────────────
function networkdays(startDate, endDate) {
  let days = 0
  const cursor = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  while (cursor <= end) {
    const day = cursor.getDay()
    if (day >= 1 && day <= 5) days += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

function buildLeaveRequests(employee, today) {
  const employeeId = employee.id
  const employeeName = employee.name

  switch (employee.employeeId) {
    case 'EMP-002':
      return [
        {
          id: crypto.randomUUID(),
          employeeId,
          employeeName,
          department: employee.department,
          leaveType: 'Sick Leave',
          requestDate: shiftDate(today, -15),
          startDate: shiftDate(today, -13),
          endDate: shiftDate(today, -12),
          days: 2,
          approvalStatus: 'Approved',
          approvedBy: 'Sarah Jenkins',
          approvedDate: shiftDate(today, -14),
          remarks: 'Medical appointment — doctor\'s note provided.',
          balance: 8,
          businessId: employee.employeeId,
        },
      ]
    case 'EMP-003':
      return [
        {
          id: crypto.randomUUID(),
          employeeId,
          employeeName,
          department: employee.department,
          leaveType: 'Annual Leave',
          requestDate: shiftDate(today, -26),
          startDate: shiftDate(today, -20),
          endDate: shiftDate(today, -16),
          days: networkdays(shiftDate(today, -20), shiftDate(today, -16)),
          approvalStatus: 'Approved',
          approvedBy: 'Sarah Jenkins',
          approvedDate: shiftDate(today, -25),
          remarks: 'Family commitment.',
          balance: 12,
          businessId: employee.employeeId,
        },
      ]
    case 'EMP-004':
      return [
        {
          id: crypto.randomUUID(),
          employeeId,
          employeeName,
          department: employee.department,
          leaveType: 'Annual Leave',
          requestDate: shiftDate(today, -2),
          startDate: shiftDate(today, 3),
          endDate: shiftDate(today, 7),
          days: networkdays(shiftDate(today, 3), shiftDate(today, 7)),
          approvalStatus: 'Pending',
          approvedBy: null,
          approvedDate: null,
          remarks: 'Short break.',
          balance: 10,
          businessId: employee.employeeId,
        },
      ]
    default:
      return []
  }
}

// ─────────────────────────────────────────────────────────────
// CERTIFICATIONS (a couple for one employee)
// ─────────────────────────────────────────────────────────────
const CERTIFICATIONS = [
  {
    id: 'cert-001',
    employeeId: 'emp-001-demis-bekele',
    name: 'AWS Certified Developer – Associate',
    issuer: 'Amazon Web Services',
    issueDate: '2023-05-12',
    expiryDate: '2026-05-12',
    fileName: '',
    fileUrl: '',
    mimeType: '',
    fileSize: 0,
  },
  {
    id: 'cert-002',
    employeeId: 'emp-001-demis-bekele',
    name: 'Scrum Master Certification',
    issuer: 'Scrum Alliance',
    issueDate: '2022-11-20',
    expiryDate: '',
    fileName: '',
    fileUrl: '',
    mimeType: '',
    fileSize: 0,
  },
]

// Initial direct messages so the inbox isn't empty on first login.
const SEED_THREADS = [
  {
    pair: ['employer@yanol.com', 'hr@yanol.com'],
    dayOffset: 0,
    messages: [
      { from: 'them', text: 'Good morning, the September payroll figures are finalised — gross ETB 308,442.31 across 6 bank batches.', minutesAgo: 42 },
      { from: 'me', text: 'Perfect. I’ll sign off before the cut-off this afternoon.', minutesAgo: 38 },
      { from: 'them', text: 'Also, Kassahun Desta has a pending annual leave request that needs your approval.', minutesAgo: 25 },
    ],
  },
  {
    pair: ['employer@yanol.com', 'employee@yanol.com'],
    dayOffset: 0,
    messages: [
      { from: 'them', text: 'Hi, could you confirm the attendance export for this week? I want to lock my timesheet.', minutesAgo: 120 },
      { from: 'me', text: 'Sure — it’s ready on the attendance tab, all 14 days marked present.', minutesAgo: 75 },
    ],
  },
  {
    pair: ['hr@yanol.com', 'employee@yanol.com'],
    dayOffset: 1,
    messages: [
      { from: 'me', text: 'Your annual leave balance shows 10 days — all synced from the leave sheet.', minutesAgo: 60 * 24 },
      { from: 'them', text: 'Thanks! I’m planning my remaining leave in September.', minutesAgo: 60 * 24 - 5 },
    ],
  },
]

async function main() {
  const today = addisToday()
  const currentMonth = today.slice(0, 7)
  const previousMonth = shiftDate(today.slice(0, 7) + '-01', -1).slice(0, 7)

  // ── Reset demo data (children first) ───────────────────────
  await prisma.session.deleteMany()
  await prisma.message.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.employeeCertification.deleteMany()
  await prisma.payrollRecord.deleteMany()
  await prisma.leaveRequest.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.employee.deleteMany()

  // ── Users ─────────────────────────────────────────────────
  const usersById = {}

  for (const u of USERS) {
    const hashed = await bcrypt.hash(u.password, SALT_ROUNDS)
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { password: hashed },
      create: { name: u.name, email: u.email, password: hashed, role: u.role },
    })
    usersById[u.email] = user
  }
  console.log(`Seeded ${USERS.length} users (passwords hashed with bcrypt).`)

  // ── Employees + portal accounts ────────────────────────────
  for (const emp of EMPLOYEES) {
    await prisma.employee.create({
      data: {
        id: emp.id,
        employeeId: emp.employeeId,
        name: emp.name,
        gender: emp.gender,
        dateOfBirth: emp.dateOfBirth,
        joinDate: emp.joinDate,
        jobTitle: emp.jobTitle,
        department: emp.department,
        employmentType: emp.employmentType,
        basicSalary: emp.basicSalary,
        transportAllowance: emp.transportAllowance,
        housingAllowance: emp.housingAllowance,
        mealAllowance: emp.mealAllowance,
        otherAllowance: emp.otherAllowance,
        otherDeductions: 0,
        loanDeductions: 0,
        bankName: emp.bankName,
        bankAccount: emp.bankAccount,
        tin: emp.tin,
        pensionId: emp.pensionId,
        phone: emp.phone,
        email: emp.email,
        address: emp.address,
        emergencyContact: emp.emergencyContact,
        employmentStatus: emp.employmentStatus,
        exitDate: null,
        notes: emp.notes,
        status: emp.employmentStatus,
        avatar: '',
        location: emp.address,
        salary: emp.basicSalary,
        manager: emp.manager,
        roleType: emp.employmentType,
        initials: emp.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(),
        identityType: '',
        identityNumber: '',
        identityIssueDate: '',
        identityExpiryDate: '',
        identityFrontUrl: '',
        identityFrontName: '',
        identityBackUrl: '',
        identityBackName: '',
        cvUrl: '',
        cvName: '',
      },
    })

    // Portal login for every seeded employee ("employee123").
    if (!usersById[emp.email]) {
      const hashed = await bcrypt.hash('employee123', SALT_ROUNDS)
      const user = await prisma.user.upsert({
        where: { email: emp.email },
        update: { name: emp.name },
        create: { name: emp.name, email: emp.email, password: hashed, role: 'EMPLOYEE' },
      })
      usersById[emp.email] = user
    }
  }
  console.log(`Seeded ${EMPLOYEES.length} employees with portal accounts.`)

  // ── Attendance ─────────────────────────────────────────────
  const attendanceRowsByEmployee = {}
  let attendanceCount = 0

  for (const emp of EMPLOYEES) {
    const rows = buildAttendanceFor(emp, today)
    attendanceRowsByEmployee[emp.id] = rows
    attendanceCount += rows.length

    for (const row of rows) {
      await prisma.attendance.create({
        data: {
          id: crypto.randomUUID(),
          employeeId: emp.id,
          employeeName: emp.name,
          department: emp.department,
          date: row.date,
          status: row.status,
          checkIn: row.checkIn,
          checkOut: row.checkOut,
          late: row.late,
          earlyDeparture: 0,
          regular: row.regular,
          overtime: row.overtime,
          employeeRemark: null,
          emergencyAt: null,
          hrStatus: null,
          hrNote: null,
          hrUpdatedAt: null,
        },
      })
    }
  }
  console.log(`Seeded ${attendanceCount} attendance rows (${EMPLOYEES.length} employees × ~6 weeks).`)

  // ── Leave requests ─────────────────────────────────────────
  let leaveCount = 0
  for (const emp of EMPLOYEES) {
    for (const leave of buildLeaveRequests(emp, today)) {
      await prisma.leaveRequest.create({ data: leave })
      leaveCount += 1
    }
  }
  console.log(`Seeded ${leaveCount} leave requests.`)

  // ── Payroll records (current + previous month) ─────────────
  const months = [...new Set([currentMonth, previousMonth])]
  let payrollCount = 0

  for (const emp of EMPLOYEES) {
    const rows = attendanceRowsByEmployee[emp.id]

    for (const month of months) {
      const monthRows = rows.filter((r) => r.date.startsWith(`${month}-`))
      const figures = computePayroll(emp, monthRows)

      await prisma.payrollRecord.create({
        data: {
          id: crypto.randomUUID(),
          employeeId: emp.id,
          employeeName: emp.name,
          department: emp.department,
          payrollMonth: month,
          ...figures,
        },
      })
      payrollCount += 1
    }
  }
  console.log(`Seeded ${payrollCount} payroll records (${currentMonth} + ${previousMonth}).`)

  // ── Certifications ─────────────────────────────────────────
  for (const cert of CERTIFICATIONS) {
    await prisma.employeeCertification.create({ data: cert })
  }
  console.log(`Seeded ${CERTIFICATIONS.length} certifications.`)

  // ── Conversations ──────────────────────────────────────────
  for (const thread of SEED_THREADS) {
    const [aEmail, bEmail] = thread.pair
    const a = usersById[aEmail]
    const b = usersById[bEmail]
    if (!a || !b) continue

    const [lo, hi] = a.id < b.id ? [a.id, b.id] : [b.id, a.id]
    const conversation = await prisma.conversation.create({
      data: { userAId: lo, userBId: hi },
    })

    const [meId, themId] = [a.id, b.id]

    for (const m of thread.messages) {
      const senderId = m.from === 'me' ? meId : themId
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId,
          text: m.text,
          read: m.from === 'me',
          createdAt: new Date(Date.now() - m.minutesAgo * 60 * 1000),
        },
      })
    }
  }
  console.log(`Seeded ${SEED_THREADS.length} conversations.`)

  // ── Settings ───────────────────────────────────────────────
  await prisma.setting.upsert({
    where: { key: 'app_settings' },
    update: { value: JSON.stringify(SETTINGS) },
    create: { key: 'app_settings', value: JSON.stringify(SETTINGS) },
  })
  console.log('Seeded settings successfully.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })