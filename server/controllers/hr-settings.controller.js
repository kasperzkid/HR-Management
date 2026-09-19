// ------------------------------------------------------------------
// HR-MANAGER — SETTINGS
// Database-backed HR settings based on the
// Ethiopia HR Payroll System workbook's "Settings" sheet.
// ------------------------------------------------------------------

import prisma from '../db.js'

const DEFAULT_SETTINGS = {
  // ============================================================
  // CONFIGURABLE LISTS
  // ============================================================

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

  // ============================================================
  // ATTENDANCE CODES
  // ============================================================

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

  // ============================================================
  // PAYROLL CONFIGURATION
  // Based on workbook Settings
  // ============================================================

  payrollConfiguration: {
    overtimeRateMultiplier: 1.5,
    standardMonthlyWorkingHours: 208,
    taxablePercentOfAllowances: 1,
    employeePensionRate: 0.07,
    employerPensionRate: 0.11,
  },

  // ============================================================
  // COMPANY INFORMATION
  // ============================================================

  companyInformation: {
    companyName: 'Yanol Tech',
    address: 'Bole Sub-City, Addis Ababa, Ethiopia',
    phone: '+251-11-000-0000',
    email: 'hr@yanoltech.com',
    logo: '',
  },
}

// ============================================================
// HELPERS
// ============================================================

function cloneDefaults() {
  return JSON.parse(
    JSON.stringify(DEFAULT_SETTINGS),
  )
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  )
}

function parseStoredValue(value, fallback) {
  if (
    value === null ||
    value === undefined
  ) {
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

// ============================================================
// STRING LIST NORMALIZATION
// ============================================================

function normalizeStringList(
  value,
  fallback,
) {
  if (!Array.isArray(value)) {
    return fallback
  }

  const result = [
    ...new Set(
      value
        .map((item) =>
          String(item ?? '').trim(),
        )
        .filter(Boolean),
    ),
  ]

  return result.length
    ? result
    : fallback
}

// ============================================================
// ATTENDANCE CODE NORMALIZATION
// ============================================================

function normalizeAttendanceCodes(
  value,
  fallback,
) {
  if (!isPlainObject(value)) {
    return fallback
  }

  const normalized = {}

  for (const [code, label] of Object.entries(
    value,
  )) {
    const cleanCode = String(
      code ?? '',
    )
      .trim()
      .toUpperCase()

    const cleanLabel = String(
      label ?? '',
    ).trim()

    if (
      cleanCode &&
      cleanLabel
    ) {
      normalized[cleanCode] =
        cleanLabel
    }
  }

  return Object.keys(normalized)
    .length
    ? normalized
    : fallback
}

// ============================================================
// PAYROLL CONFIGURATION NORMALIZATION
// ============================================================

function normalizePayrollConfiguration(
  value,
  fallback,
) {
  if (!isPlainObject(value)) {
    return fallback
  }

  const result = {
    ...fallback,
  }

  for (const key of Object.keys(
    fallback,
  )) {
    if (
      value[key] !== undefined &&
      value[key] !== null &&
      value[key] !== ''
    ) {
      const number = Number(
        value[key],
      )

      if (
        Number.isFinite(number)
      ) {
        result[key] = number
      }
    }
  }

  return result
}

// ============================================================
// COMPANY INFORMATION NORMALIZATION
// ============================================================

function normalizeCompanyInformation(
  value,
  fallback,
) {
  if (!isPlainObject(value)) {
    return fallback
  }

  const result = {
    ...fallback,
  }

  for (const key of Object.keys(
    fallback,
  )) {
    if (
      value[key] !== undefined &&
      value[key] !== null
    ) {
      result[key] = String(
        value[key],
      ).trim()
    }
  }

  return result
}

// ============================================================
// VALIDATION
// ============================================================

function validateSettings(
  settings,
) {
  const errors = []

  const payroll =
    settings.payrollConfiguration

  if (
    payroll.overtimeRateMultiplier <
      0 ||
    payroll.overtimeRateMultiplier >
      10
  ) {
    errors.push(
      'Overtime rate multiplier must be between 0 and 10.',
    )
  }

  if (
    payroll.standardMonthlyWorkingHours <=
      0 ||
    payroll.standardMonthlyWorkingHours >
      744
  ) {
    errors.push(
      'Standard monthly working hours must be greater than 0 and no more than 744.',
    )
  }

  if (
    payroll.taxablePercentOfAllowances <
      0 ||
    payroll.taxablePercentOfAllowances >
      1
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

  const company =
    settings.companyInformation

  if (
    !company.companyName?.trim()
  ) {
    errors.push(
      'Company name is required.',
    )
  }

  return errors
}

// ============================================================
// READ SETTINGS FROM DATABASE
// ============================================================

async function readSettingsFromDatabase() {
  const records =
    await prisma.setting.findMany({
      orderBy: {
        key: 'asc',
      },
    })

  const settings =
    cloneDefaults()

  for (const record of records) {
    if (
      !(record.key in settings)
    ) {
      continue
    }

    settings[record.key] =
      parseStoredValue(
        record.value,
        settings[record.key],
      )
  }

  // Normalize lists
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

  // Normalize attendance codes
  settings.attendanceCodes =
    normalizeAttendanceCodes(
      settings.attendanceCodes,
      DEFAULT_SETTINGS.attendanceCodes,
    )

  // Normalize payroll configuration
  settings.payrollConfiguration =
    normalizePayrollConfiguration(
      settings.payrollConfiguration,
      DEFAULT_SETTINGS.payrollConfiguration,
    )

  // Normalize company information
  settings.companyInformation =
    normalizeCompanyInformation(
      settings.companyInformation,
      DEFAULT_SETTINGS.companyInformation,
    )

  return settings
}

// ============================================================
// SAVE SETTINGS TO DATABASE
// ============================================================

async function saveSettingsToDatabase(
  settings,
) {
  const operations =
    Object.entries(settings).map(
      ([key, value]) =>
        prisma.setting.upsert({
          where: {
            key,
          },

          update: {
            value:
              serializeValue(value),
          },

          create: {
            key,
            value:
              serializeValue(value),
          },
        }),
    )

  await prisma.$transaction(
    operations,
  )
}

// ============================================================
// GET HR SETTINGS
// GET /api/hr-manager/settings
// ============================================================

export async function getHRSettings(
  req,
  res,
) {
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
      message:
        'Failed to load HR settings',
    })
  }
}

// ============================================================
// UPDATE HR SETTINGS
// PUT /api/hr-manager/settings
// ============================================================

export async function updateHRSettings(
  req,
  res,
) {
  try {
    const current =
      await readSettingsFromDatabase()

    const incoming =
      req.body || {}

    const nextSettings = {
      ...current,
    }

    // ----------------------------------------------------------
    // Lists
    // ----------------------------------------------------------

    nextSettings.departments =
      normalizeStringList(
        incoming.departments ??
          current.departments,
        current.departments,
      )

    nextSettings.jobTitles =
      normalizeStringList(
        incoming.jobTitles ??
          current.jobTitles,
        current.jobTitles,
      )

    nextSettings.employmentTypes =
      normalizeStringList(
        incoming.employmentTypes ??
          current.employmentTypes,
        current.employmentTypes,
      )

    nextSettings.employmentStatuses =
      normalizeStringList(
        incoming.employmentStatuses ??
          current.employmentStatuses,
        current.employmentStatuses,
      )

    nextSettings.genders =
      normalizeStringList(
        incoming.genders ??
          current.genders,
        current.genders,
      )

    nextSettings.leaveTypes =
      normalizeStringList(
        incoming.leaveTypes ??
          current.leaveTypes,
        current.leaveTypes,
      )

    nextSettings.attendanceStatuses =
      normalizeStringList(
        incoming.attendanceStatuses ??
          current.attendanceStatuses,
        current.attendanceStatuses,
      )

    nextSettings.approvalStatuses =
      normalizeStringList(
        incoming.approvalStatuses ??
          current.approvalStatuses,
        current.approvalStatuses,
      )

    nextSettings.deductionTypes =
      normalizeStringList(
        incoming.deductionTypes ??
          current.deductionTypes,
        current.deductionTypes,
      )

    // ----------------------------------------------------------
    // Attendance codes
    // ----------------------------------------------------------

    nextSettings.attendanceCodes =
      normalizeAttendanceCodes(
        incoming.attendanceCodes ??
          current.attendanceCodes,
        current.attendanceCodes,
      )

    // ----------------------------------------------------------
    // Payroll configuration
    // ----------------------------------------------------------

    nextSettings.payrollConfiguration =
      normalizePayrollConfiguration(
        incoming.payrollConfiguration ??
          current.payrollConfiguration,
        current.payrollConfiguration,
      )

    // ----------------------------------------------------------
    // Company information
    // ----------------------------------------------------------

    nextSettings.companyInformation =
      normalizeCompanyInformation(
        incoming.companyInformation ??
          current.companyInformation,
        current.companyInformation,
      )

    // ----------------------------------------------------------
    // Validate
    // ----------------------------------------------------------

    const errors =
      validateSettings(
        nextSettings,
      )

    if (errors.length) {
      return res.status(400).json({
        message:
          'Invalid HR settings',
        errors,
      })
    }

    // ----------------------------------------------------------
    // Save
    // ----------------------------------------------------------

    await saveSettingsToDatabase(
      nextSettings,
    )

    // ----------------------------------------------------------
    // Return saved settings
    // ----------------------------------------------------------

    res.json(
      nextSettings,
    )
  } catch (error) {
    console.error(
      'Update HR settings error:',
      error,
    )

    res.status(500).json({
      message:
        'Failed to save HR settings',
    })
  }
}

// ============================================================
// EXPORT DEFAULT SETTINGS
// ============================================================

export {
  DEFAULT_SETTINGS,
}