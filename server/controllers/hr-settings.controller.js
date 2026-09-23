// ------------------------------------------------------------------
// HR-MANAGER — SETTINGS
// Database-backed HR settings based on the Ethiopia HR Payroll System
// workbook's "Settings" sheet.
// ------------------------------------------------------------------

import prisma from '../db.js'

const DEFAULT_SETTINGS = {
  departments: [
    'HR',
    'Finance',
    'Sales',
    'Marketing',
    'Operations',
    'IT',
    'Procurement',
    'Customer Service',
    'Production',
    'Logistics',
  ],

  jobTitles: [
    'Manager',
    'Officer',
    'Specialist',
    'Assistant',
    'Supervisor',
    'Director',
    'Coordinator',
    'Analyst',
    'Intern',
    'Technician',
  ],

  employmentTypes: [
    'Permanent',
    'Contractual',
    'Intern',
  ],

  employmentStatuses: [
    'Active',
    'On Leave',
    'Resigned',
    'Terminated',
  ],

  genders: [
    'Male',
    'Female',
  ],

  leaveTypes: [
    'Annual Leave',
    'Sick Leave',
    'Maternity Leave',
    'Paternity Leave',
    'Compassionate Leave',
    'Unpaid Leave',
    'Other',
  ],

  attendanceStatuses: [
    'Present',
    'Absent',
    'Sick Leave',
    'Annual Leave',
    'Maternity Leave',
    'Other Approved Leave',
    'Public Holiday',
    'Weekend',
    'Half Day',
  ],

  approvalStatuses: [
    'Pending',
    'Approved',
    'Rejected',
  ],

  deductionTypes: [
    'Loan Repayment',
    'Salary Advance',
    'Uniform/Equipment',
    'Other',
  ],

  attendanceCodes: {
    P: 'Present',
    A: 'Absent',
    SL: 'Sick Leave',
    AL: 'Annual Leave',
    ML: 'Maternity Leave',
    OL: 'Other Approved Leave',
    PH: 'Public Holiday',
    WK: 'Weekend',
    HD: 'Half Day',
  },

  payrollConfiguration: {
    overtimeRateMultiplier: 1.5,
    standardMonthlyWorkingHours: 208,
    taxablePercentOfAllowances: 1,
    employeePensionRate: 0.07,
    employerPensionRate: 0.11,
  },

  // ---------------------------------------------------------------
  // Automatic Attendance Configuration
  // Stored in the existing Setting table as JSON.
  // ---------------------------------------------------------------
  attendanceConfiguration: {
    requiredCheckInTime: '08:30',

    officeLatitude: 8.999654748138806,

    officeLongitude: 38.820610900000005,

    allowedRadiusMeters: 100,
  },

  companyInformation: {
    companyName: 'Your Company Name PLC',
    address: 'Bole Sub-City, Addis Ababa, Ethiopia',
    phone: '+251-11-000-0000',
    email: 'hr@yourcompany.com',
    logo: '[Insert Company Logo Here]',
  },
}

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
}

function parseStoredValue(value, fallback) {
  if (value === null || value === undefined) {
    return fallback
  }

  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function serializeValue(value) {
  return JSON.stringify(value)
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  )
}

function normalizeStringList(value, fallback) {
  if (!Array.isArray(value)) {
    return fallback
  }

  return [
    ...new Set(
      value
        .map((item) => String(item ?? '').trim())
        .filter(Boolean),
    ),
  ]
}

function normalizeAttendanceCodes(value, fallback) {
  if (!isPlainObject(value)) {
    return fallback
  }

  const normalized = {}

  for (const [code, label] of Object.entries(value)) {
    const cleanCode = String(code ?? '')
      .trim()
      .toUpperCase()

    const cleanLabel = String(label ?? '').trim()

    if (cleanCode && cleanLabel) {
      normalized[cleanCode] = cleanLabel
    }
  }

  return Object.keys(normalized).length
    ? normalized
    : fallback
}

function normalizePayrollConfiguration(value, fallback) {
  if (!isPlainObject(value)) {
    return { ...fallback }
  }

  const result = { ...fallback }

  for (const key of Object.keys(fallback)) {
    if (
      value[key] !== undefined &&
      value[key] !== null &&
      value[key] !== ''
    ) {
      const number = Number(value[key])

      if (Number.isFinite(number)) {
        result[key] = number
      }
    }
  }

  return result
}

// ---------------------------------------------------------------
// Automatic Attendance Configuration
// ---------------------------------------------------------------

function normalizeAttendanceConfiguration(value, fallback) {
  if (!isPlainObject(value)) {
    return { ...fallback }
  }

  const result = { ...fallback }

  if (
    value.requiredCheckInTime !== undefined &&
    value.requiredCheckInTime !== null &&
    value.requiredCheckInTime !== ''
  ) {
    result.requiredCheckInTime = String(
      value.requiredCheckInTime,
    ).trim()
  }

  if (
    value.officeLatitude === null ||
    value.officeLatitude === ''
  ) {
    result.officeLatitude = null
  } else if (value.officeLatitude !== undefined) {
    const number = Number(value.officeLatitude)

    if (Number.isFinite(number)) {
      result.officeLatitude = number
    }
  }

  if (
    value.officeLongitude === null ||
    value.officeLongitude === ''
  ) {
    result.officeLongitude = null
  } else if (value.officeLongitude !== undefined) {
    const number = Number(value.officeLongitude)

    if (Number.isFinite(number)) {
      result.officeLongitude = number
    }
  }

  if (
    value.allowedRadiusMeters !== undefined &&
    value.allowedRadiusMeters !== null &&
    value.allowedRadiusMeters !== ''
  ) {
    const number = Number(value.allowedRadiusMeters)

    if (Number.isFinite(number)) {
      result.allowedRadiusMeters = number
    }
  }

  return result
}

function normalizeCompanyInformation(value, fallback) {
  if (!isPlainObject(value)) {
    return { ...fallback }
  }

  const result = { ...fallback }

  for (const key of Object.keys(fallback)) {
    if (
      value[key] !== undefined &&
      value[key] !== null
    ) {
      result[key] = String(value[key]).trim()
    }
  }

  return result
}

function isValidTime(value) {
  if (typeof value !== 'string') {
    return false
  }

  const match = value.match(/^(\d{2}):(\d{2})$/)

  if (!match) {
    return false
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])

  return (
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  )
}

// ---------------------------------------------------------------
// Validation
// ---------------------------------------------------------------

function validateSettings(settings) {
  const errors = []

  const payroll =
    settings.payrollConfiguration

  const attendance =
    settings.attendanceConfiguration

  // Payroll validation
  if (
    payroll.overtimeRateMultiplier < 0 ||
    payroll.overtimeRateMultiplier > 10
  ) {
    errors.push(
      'Overtime rate multiplier must be between 0 and 10.',
    )
  }

  if (
    payroll.standardMonthlyWorkingHours <= 0 ||
    payroll.standardMonthlyWorkingHours > 744
  ) {
    errors.push(
      'Standard monthly working hours must be greater than 0 and no more than 744.',
    )
  }

  if (
    payroll.taxablePercentOfAllowances < 0 ||
    payroll.taxablePercentOfAllowances > 1
  ) {
    errors.push(
      'Taxable percentage of allowances must be between 0 and 1.',
    )
  }

  if (
    payroll.employeePensionRate < 0 ||
    payroll.employeePensionRate > 1
  ) {
    errors.push(
      'Employee pension rate must be between 0 and 1.',
    )
  }

  if (
    payroll.employerPensionRate < 0 ||
    payroll.employerPensionRate > 1
  ) {
    errors.push(
      'Employer pension rate must be between 0 and 1.',
    )
  }

  // -------------------------------------------------------------
  // Attendance validation
  // -------------------------------------------------------------

  if (
    !isValidTime(
      attendance.requiredCheckInTime,
    )
  ) {
    errors.push(
      'Required check-in time must be a valid 24-hour time such as 08:30.',
    )
  }

  const latitude =
    attendance.officeLatitude

  const longitude =
    attendance.officeLongitude

  // Either both coordinates must exist or both must be null.
  if (
    (latitude === null) !==
    (longitude === null)
  ) {
    errors.push(
      'Office latitude and longitude must both be configured together.',
    )
  }

  if (latitude !== null) {
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      errors.push(
        'Office latitude must be between -90 and 90.',
      )
    }
  }

  if (longitude !== null) {
    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      errors.push(
        'Office longitude must be between -180 and 180.',
      )
    }
  }

  if (
    !Number.isFinite(
      attendance.allowedRadiusMeters,
    ) ||
    attendance.allowedRadiusMeters <= 0 ||
    attendance.allowedRadiusMeters > 10000
  ) {
    errors.push(
      'Allowed attendance radius must be greater than 0 and no more than 10,000 meters.',
    )
  }

  return errors
}

// ---------------------------------------------------------------
// Read Settings
// ---------------------------------------------------------------

async function readSettingsFromDatabase() {
  const records = await prisma.setting.findMany({
    orderBy: {
      key: 'asc',
    },
  })

  const settings = cloneDefaults()

  for (const record of records) {
    if (!(record.key in settings)) {
      continue
    }

    settings[record.key] = parseStoredValue(
      record.value,
      settings[record.key],
    )
  }

  settings.departments =
    normalizeStringList(
      settings.departments,
      DEFAULT_SETTINGS.departments,
    )

  settings.jobTitles =
    normalizeStringList(
      settings.jobTitles,
      DEFAULT_SETTINGS.jobTitles,
    )

  settings.employmentTypes =
    normalizeStringList(
      settings.employmentTypes,
      DEFAULT_SETTINGS.employmentTypes,
    )

  settings.employmentStatuses =
    normalizeStringList(
      settings.employmentStatuses,
      DEFAULT_SETTINGS.employmentStatuses,
    )

  settings.genders =
    normalizeStringList(
      settings.genders,
      DEFAULT_SETTINGS.genders,
    )

  settings.leaveTypes =
    normalizeStringList(
      settings.leaveTypes,
      DEFAULT_SETTINGS.leaveTypes,
    )

  settings.attendanceStatuses =
    normalizeStringList(
      settings.attendanceStatuses,
      DEFAULT_SETTINGS.attendanceStatuses,
    )

  settings.approvalStatuses =
    normalizeStringList(
      settings.approvalStatuses,
      DEFAULT_SETTINGS.approvalStatuses,
    )

  settings.deductionTypes =
    normalizeStringList(
      settings.deductionTypes,
      DEFAULT_SETTINGS.deductionTypes,
    )

  settings.attendanceCodes =
    normalizeAttendanceCodes(
      settings.attendanceCodes,
      DEFAULT_SETTINGS.attendanceCodes,
    )

  settings.payrollConfiguration =
    normalizePayrollConfiguration(
      settings.payrollConfiguration,
      DEFAULT_SETTINGS.payrollConfiguration,
    )

  settings.attendanceConfiguration =
    normalizeAttendanceConfiguration(
      settings.attendanceConfiguration,
      DEFAULT_SETTINGS.attendanceConfiguration,
    )

  settings.companyInformation =
    normalizeCompanyInformation(
      settings.companyInformation,
      DEFAULT_SETTINGS.companyInformation,
    )

  return settings
}

// ---------------------------------------------------------------
// Save Settings
// ---------------------------------------------------------------

async function saveSettingsToDatabase(settings) {
  await prisma.$transaction(
    Object.entries(settings).map(
      ([key, value]) =>
        prisma.setting.upsert({
          where: {
            key,
          },

          update: {
            value: serializeValue(value),
          },

          create: {
            key,
            value: serializeValue(value),
          },
        }),
    ),
  )
}

// ---------------------------------------------------------------
// GET /settings
// ---------------------------------------------------------------

export async function getHRSettings(req, res) {
  try {
    const settings =
      await readSettingsFromDatabase()

    res.json(settings)
  } catch (error) {
    console.error(
      'Get HR settings error:',
      error,
    )

    res.status(500).json({
      message: 'Failed to load HR settings',
    })
  }
}

// ---------------------------------------------------------------
// PUT /settings
// ---------------------------------------------------------------

export async function updateHRSettings(req, res) {
  try {
    const current =
      await readSettingsFromDatabase()

    const incoming = req.body || {}

    const nextSettings = {
      ...current,

      ...incoming,

      departments:
        normalizeStringList(
          incoming.departments ??
            current.departments,
          current.departments,
        ),

      jobTitles:
        normalizeStringList(
          incoming.jobTitles ??
            current.jobTitles,
          current.jobTitles,
        ),

      employmentTypes:
        normalizeStringList(
          incoming.employmentTypes ??
            current.employmentTypes,
          current.employmentTypes,
        ),

      employmentStatuses:
        normalizeStringList(
          incoming.employmentStatuses ??
            current.employmentStatuses,
          current.employmentStatuses,
        ),

      genders:
        normalizeStringList(
          incoming.genders ??
            current.genders,
          current.genders,
        ),

      leaveTypes:
        normalizeStringList(
          incoming.leaveTypes ??
            current.leaveTypes,
          current.leaveTypes,
        ),

      attendanceStatuses:
        normalizeStringList(
          incoming.attendanceStatuses ??
            current.attendanceStatuses,
          current.attendanceStatuses,
        ),

      approvalStatuses:
        normalizeStringList(
          incoming.approvalStatuses ??
            current.approvalStatuses,
          current.approvalStatuses,
        ),

      deductionTypes:
        normalizeStringList(
          incoming.deductionTypes ??
            current.deductionTypes,
          current.deductionTypes,
        ),

      attendanceCodes:
        normalizeAttendanceCodes(
          incoming.attendanceCodes ??
            current.attendanceCodes,
          current.attendanceCodes,
        ),

      payrollConfiguration:
        normalizePayrollConfiguration(
          incoming.payrollConfiguration ??
            current.payrollConfiguration,
          current.payrollConfiguration,
        ),

      attendanceConfiguration:
        normalizeAttendanceConfiguration(
          incoming.attendanceConfiguration ??
            current.attendanceConfiguration,
          current.attendanceConfiguration,
        ),

      companyInformation:
        normalizeCompanyInformation(
          incoming.companyInformation ??
            current.companyInformation,
          current.companyInformation,
        ),
    }

    const errors =
      validateSettings(nextSettings)

    if (errors.length) {
      return res.status(400).json({
        message: 'Invalid HR settings',
        errors,
      })
    }

    await saveSettingsToDatabase(
      nextSettings,
    )

    res.json(nextSettings)
  } catch (error) {
    console.error(
      'Update HR settings error:',
      error,
    )

    res.status(500).json({
      message: 'Failed to save HR settings',
    })
  }
}

export { DEFAULT_SETTINGS }