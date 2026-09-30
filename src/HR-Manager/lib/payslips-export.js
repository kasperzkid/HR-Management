// Payment slip export helpers.
//
// A single employee is a handful of rows. "Export everything at once" is the
// whole payroll: every employee, every pay period, and the totals that let
// somebody check the run before paying it. That is a different shape of output
// from the one-slip-at-a-time print view, so it lives here rather than inline in
// the page.
//
// Everything is built as plain arrays of rows first and only then handed to
// XLSX or to a print window, so the two exports can never disagree about what
// the data is. The scope rules - what is in view, and what an export actually
// writes - live here too, because those are the rules that decide whether a
// payroll file is right, and they should be checkable without a browser.

import * as XLSX from 'xlsx'

const CURRENCY = 'ETB'

/** The period filter value that means "do not filter by period". */
export const ALL_PERIODS = 'all'

/** The department filter value that means "do not filter by department". */
export const ALL_DEPARTMENTS = 'All Departments'

/**
 * Narrows a set of slips to what the page is showing.
 *
 * A filter only applies when it is a non-empty value that is not the opt-out
 * sentinel, so `undefined`, `null` and `''` all mean "do not filter". That is
 * deliberate: a filter value arrives from a select element or a query string,
 * and a select that has not been given a value is the empty string, not the
 * sentinel. Treating that as a real filter would empty the table with nothing
 * on screen to explain why.
 *
 * `employeeId` narrows to one person. It compares against the employee record's
 * database id, which is what a payroll row points at, rather than the
 * human-facing code, so a scope cannot silently come back empty.
 */
export function filterSlips(slips, filters = {}) {
  const { search = '', department, period, employeeId } = filters

  const isSet = (value) => value != null && value !== '' && value !== false
  const query = isSet(search) ? String(search).trim().toLowerCase() : ''

  return slips.filter((slip) => {
    const matchesEmployee = !isSet(employeeId) || String(slip.employeeDatabaseId) === String(employeeId)
    const matchesSearch =
      !query ||
      [slip.employeeName, slip.employeeId, slip.department, slip.jobTitle].some((value) =>
        String(value || '').toLowerCase().includes(query),
      )
    const matchesDepartment = !isSet(department) || department === ALL_DEPARTMENTS || slip.department === department
    const matchesPeriod = !isSet(period) || period === ALL_PERIODS || slip.payrollMonth === period

    return matchesEmployee && matchesSearch && matchesDepartment && matchesPeriod
  })
}

/**
 * What an export actually writes.
 *
 * Ticked rows win over the filters, and that is the whole reason for the
 * checkbox column: somebody can filter down to a department, tick the two
 * people whose bank details need checking, and send exactly those.
 *
 * With nothing ticked the answer is the whole visible set, so the common case -
 * look at the page, press export - needs no extra step. Ticks that name a slip
 * no longer in view are ignored rather than resurrecting it, so changing a
 * filter cannot smuggle a hidden slip into a file.
 */
export function resolveExportSet(filteredSlips, selectedIds = []) {
  const ticked = new Set(Array.isArray(selectedIds) ? selectedIds : [])
  if (!ticked.size) return filteredSlips
  return filteredSlips.filter((slip) => ticked.has(slip.id))
}


/**
 * The columns of a payroll register: one row per employee per pay period.
 *
 * The order is deliberate - identity first, then what was earned, then what was
 * taken, then what is payable, then what the employer costs on top. That is the
 * order a payroll officer reads a register in.
 */
export const REGISTER_COLUMNS = [
  { key: 'payrollMonth', header: 'Pay Period', width: 12 },
  { key: 'employeeId', header: 'Employee ID', width: 16 },
  { key: 'employeeName', header: 'Employee Name', width: 24 },
  { key: 'department', header: 'Department', width: 18 },
  { key: 'jobTitle', header: 'Job Title', width: 20 },
  { key: 'employmentType', header: 'Employment Type', width: 16 },
  { key: 'bankName', header: 'Bank', width: 18 },
  { key: 'bankAccount', header: 'Account', width: 20 },

  { key: 'basicSalary', header: 'Basic Salary', money: true },
  { key: 'transportAllowance', header: 'Transport', money: true },
  { key: 'housingAllowance', header: 'Housing', money: true },
  { key: 'mealAllowance', header: 'Meal', money: true },
  { key: 'otherAllowance', header: 'Other Allowance', money: true },
  { key: 'overtimePay', header: 'Overtime Pay', money: true },
  { key: 'grossSalary', header: 'Gross Salary', money: true },

  { key: 'pensionDeduction', header: 'Employee Pension', money: true },
  { key: 'incomeTax', header: 'Income Tax', money: true },
  { key: 'loanDeduction', header: 'Loan Deduction', money: true },
  { key: 'otherDeduction', header: 'Other Deduction', money: true },
  { key: 'totalDeductions', header: 'Total Deductions', money: true },
  { key: 'netSalary', header: 'Net Salary', money: true },

  { key: 'employerPension', header: 'Employer Pension', money: true },
  { key: 'employerCost', header: 'Employer Cost', money: true },
]

/** The money columns, so totals are only added up over real amounts. */
const MONEY_KEYS = REGISTER_COLUMNS.filter((column) => column.money).map((column) => column.key)

/**
 * Totals across a set of slips.
 *
 * The one that matters is `netSalary`: the total actually payable to staff for
 * the period, which is the number the bank transfer is built from. Employer
 * cost is alongside it because it is what the month really costs the company.
 */
export function summarise(slips) {
  const totals = { count: slips.length }

  for (const key of MONEY_KEYS) {
    totals[key] =
      Math.round(
        slips.reduce((sum, slip) => sum + (Number(slip[key]) || 0), 0) * 100,
      ) / 100
  }

  return totals
}

function displayValue(slip, column) {
  const value = slip[column.key]
  if (column.money) return Number(value) || 0
  return value == null || value === '' ? '' : String(value)
}

/**
 * A register row, ready for a sheet: numbers stay numbers so Excel can sum.
 *
 * The pay period stays the stored `2026-09` rather than being spelled out. The
 * register is the part a bank or a pension portal ingests, and an ISO-ish
 * period sorts correctly and cannot be read differently in another locale; the
 * summary sheet is where the month is spelled out for a human. Both appear in
 * the same workbook, so nothing is lost by choosing per sheet.
 */
function registerRow(slip) {
  const row = {}
  for (const column of REGISTER_COLUMNS) row[column.header] = displayValue(slip, column)
  return row
}

/** Groups slips by pay period, oldest first, so exports read chronologically. */
export function groupByPeriod(slips) {
  const byPeriod = new Map()
  for (const slip of slips) {
    const period = slip.payrollMonth || 'Unspecified'
    if (!byPeriod.has(period)) byPeriod.set(period, [])
    byPeriod.get(period).push(slip)
  }
  return [...byPeriod.keys()].sort().map((period) => ({ period, slips: byPeriod.get(period) }))
}

export function formatPeriod(period) {
  const text = period == null ? '' : String(period)

  // Only a real calendar month is spelled out. Anything else - a truncated
  // value, or a month number that does not exist - is passed through as it
  // stands, because handing "2026-13" to the Date constructor yields an Invalid
  // Date and that string would then be printed at the top of a payslip.
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(text)) return text || 'Unspecified'

  return new Date(`${text}-01T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

/**
 * The workbook.
 *
 * A summary sheet first, because that is what gets read: one row per pay
 * period with its headcount and totals, then the full register, then one sheet
 * per period so a single month can be handed to somebody on its own.
 *
 * The month sheets are what make this a real payroll deliverable - a per-period
 * sheet is the shape a bank, an auditor or a pension authority asks for.
 */
export function buildWorkbook(slips) {
  const book = XLSX.utils.book_new()

  // ── Summary ──────────────────────────────────────────────────────────
  const groups = groupByPeriod(slips)

  const summaryRows = groups.map(({ period, slips: group }) => {
    const totals = summarise(group)
    return {
      'Pay Period': formatPeriod(period),
      Employees: totals.count,
      'Gross Salary': totals.grossSalary,
      'Total Deductions': totals.totalDeductions,
      'Net Payable': totals.netSalary,
      'Employer Pension': totals.employerPension,
      'Employer Cost': totals.employerCost,
    }
  })

  const grand = summarise(slips)
  summaryRows.push({
    'Pay Period': 'TOTAL',
    Employees: grand.count,
    'Gross Salary': grand.grossSalary,
    'Total Deductions': grand.totalDeductions,
    'Net Payable': grand.netSalary,
    'Employer Pension': grand.employerPension,
    'Employer Cost': grand.employerCost,
  })

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows)
  summarySheet['!cols'] = [
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
  ]
  XLSX.utils.book_append_sheet(book, summarySheet, 'Summary')

  // ── The full register ────────────────────────────────────────────────
  const widths = REGISTER_COLUMNS.map((column) => ({ wch: column.width || 14 }))

  const registerSheet = XLSX.utils.json_to_sheet(slips.map(registerRow))
  registerSheet['!cols'] = widths
  XLSX.utils.book_append_sheet(book, registerSheet, 'All Slips')

  // ── One sheet per pay period ─────────────────────────────────────────
  // Excel caps sheet names at 31 characters and forbids a handful of
  // characters, so a period is shortened rather than allowed to throw.
  const used = new Set(['Summary', 'All Slips'])

  for (const { period, slips: group } of groups) {
    const name = uniqueSheetName(safeSheetName(period), used)
    const sheet = XLSX.utils.json_to_sheet(group.map(registerRow))
    sheet['!cols'] = widths
    XLSX.utils.book_append_sheet(book, sheet, name)
  }

  return { book, grandTotal: grand, periodCount: groups.length }
}

function safeSheetName(period) {
  const cleaned = String(period || 'Slips')
    .replace(/[\\/?*[\]:]/g, '-')
    .slice(0, 31)
  return cleaned || 'Slips'
}

function uniqueSheetName(base, used) {
  if (!used.has(base)) return base
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base.slice(0, 28)} (${suffix})`
    if (!used.has(candidate)) return candidate
  }
}

/**
 * Names the file after what is inside it.
 *
 * A single-month export is named for that month; a multi-month one spans the
 * first to the last. Either way the name says the scope without being opened,
 * because these files get emailed and a payroll file called "export.xlsx" is
 * useless once it is in somebody's inbox a month later.
 */
export function filenameFor(slips, stamp) {
  const periods = [...new Set(slips.map((slip) => slip.payrollMonth).filter(Boolean))].sort()
  const scope =
    periods.length === 0
      ? 'no-periods'
      : periods.length === 1
        ? periods[0]
        : `${periods[0]}_to_${periods[periods.length - 1]}`
  return `payment-slips_${scope}_${stamp}`
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * The full workbook export.
 *
 * One file, three ways of reading it: a summary to check the run, the whole
 * register, and a sheet per month for whoever needs one month on its own.
 */
export function exportWorkbook(slips, options = {}) {
  if (!slips.length) throw new Error('There are no payment slips to export.')
  const stamp = options.stamp || todayStamp()
  const { book } = buildWorkbook(slips)
  const name = filenameFor(slips, stamp)
  XLSX.writeFile(book, `${name}.xlsx`)
  return { count: slips.length, filename: `${name}.xlsx` }
}

/**
 * CSV of the register.
 *
 * Offered alongside the workbook because a bank or a pension portal will often
 * only take a flat file, and because a CSV of one period is the easiest thing
 * to paste into an email.
 */
export function exportCsv(slips, options = {}) {
  if (!slips.length) throw new Error('There are no payment slips to export.')
  const stamp = options.stamp || todayStamp()

  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(slips.map(registerRow)))

  // The BOM is what makes Excel read a UTF-8 CSV correctly on Windows. Without
  // it a name with a non-ASCII character comes out mangled, which on an
  // Ethiopian payroll run is a real possibility.
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const name = filenameFor(slips, stamp)
  link.href = url
  link.download = `${name}.csv`
  link.click()
  URL.revokeObjectURL(url)

  return { count: slips.length, filename: `${name}.csv` }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c])

const money = (value) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

/**
 * Builds the printable document for a whole run.
 *
 * Kept separate from the window that shows it so the markup can be checked
 * without a browser, and so a bug in the print path is a string comparison
 * rather than something to be discovered on a printed page.
 */
export function buildPrintDocument(slips, options = {}) {
  const companyName = options.companyName || 'Yanol Tech'
  const stamp = options.stamp || new Date().toLocaleString()
  const groups = groupByPeriod(slips)
  const totals = summarise(slips)

  /** A two-column table; `rows` is [[label, value], ...]. */
  const ledger = (rows, { total } = {}) => `
    <table>
      <tbody>
        ${rows
          .map(
            ([label, value]) =>
              `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(money(value))}</td></tr>`,
          )
          .join('')}
        ${
          total
            ? `<tr class="total"><th>${escapeHtml(total[0])}</th><td>${escapeHtml(money(total[1]))}</td></tr>`
            : ''
        }
      </tbody>
    </table>`

  const oneSlip = (slip) => `
    <article class="slip">
      <header>
        <div>
          <h1>${escapeHtml(companyName)}</h1>
          <p>Employee Payment Slip</p>
        </div>
        <div class="meta">
          <strong>${escapeHtml(formatPeriod(slip.payrollMonth))}</strong>
          <span>${escapeHtml(slip.employeeName)}</span>
        </div>
      </header>

      <dl class="facts">
        ${[
          ['Employee ID', slip.employeeId],
          ['Department', slip.department],
          ['Job Title', slip.jobTitle],
          ['Employment Type', slip.employmentType],
          ['Bank', [slip.bankName, slip.bankAccount].filter(Boolean).join(' — ')],
          ['TIN', slip.tin],
          ['Pension ID', slip.pensionId],
        ]
          .map(
            ([label, value]) =>
              `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value) || '—'}</dd></div>`,
          )
          .join('')}
      </dl>

      <div class="split">
        <section>
          <h2>Earnings</h2>
          ${ledger(
            [
              ['Basic Salary', slip.basicSalary],
              ['Transport Allowance', slip.transportAllowance],
              ['Housing Allowance', slip.housingAllowance],
              ['Meal Allowance', slip.mealAllowance],
              ['Other Allowance', slip.otherAllowance],
              ['Overtime Pay', slip.overtimePay],
            ],
            { total: ['Gross Salary', slip.grossSalary] },
          )}
        </section>
        <section>
          <h2>Deductions</h2>
          ${ledger(
            [
              ['Employee Pension', slip.pensionDeduction],
              ['Income Tax', slip.incomeTax],
              ['Loan Deduction', slip.loanDeduction],
              ['Other Deduction', slip.otherDeduction],
            ],
            { total: ['Total Deductions', slip.totalDeductions] },
          )}
        </section>
      </div>

      <footer>
        <span>Net Salary Payable</span>
        <strong>${escapeHtml(money(slip.netSalary))} ${CURRENCY}</strong>
      </footer>
      <p class="note">
        Employer pension ${escapeHtml(money(slip.employerPension))} ${CURRENCY} ·
        total employer cost ${escapeHtml(money(slip.employerCost))} ${CURRENCY}.
        Generated from the saved payroll record.
      </p>
    </article>`

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Payment Slips — ${escapeHtml(companyName)}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; }
      .run { padding: 16px; }
      .run-head { margin-bottom: 18px; }
      .run-head h1 { margin: 0 0 4px; font-size: 18px; }
      .run-head p { margin: 0; font-size: 12px; color: #64748b; }
      .run-head .totals { margin-top: 10px; font-size: 12px; color: #334155; }
      .run-head .totals strong { color: #0f172a; }
      .slip { page-break-after: always; break-after: page; padding: 6px 0; }
      .slip:last-child { page-break-after: auto; break-after: auto; }
      .slip header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
      .slip header h1 { margin: 0; font-size: 20px; }
      .slip header p { margin: 2px 0 0; font-size: 12px; color: #64748b; }
      .slip .meta { text-align: right; }
      .slip .meta strong { display: block; font-size: 14px; }
      .slip .meta span { font-size: 12px; color: #64748b; }
      .facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 16px; margin: 0 0 16px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; }
      .facts dt { font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; }
      .facts dd { margin: 2px 0 0; font-size: 12px; font-weight: 600; word-break: break-word; }
      .split { display: flex; gap: 20px; }
      .split section { flex: 1; min-width: 0; }
      .split h2 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin: 0 0 6px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { text-align: left; font-weight: 500; color: #475569; padding: 5px 6px; border-bottom: 1px solid #e2e8f0; }
      td { text-align: right; font-variant-numeric: tabular-nums; padding: 5px 6px; border-bottom: 1px solid #f1f5f9; font-weight: 600; }
      tr.total th, tr.total td { border-top: 2px solid #0f172a; border-bottom: none; font-weight: 700; color: #0f172a; }
      .slip footer { margin-top: 16px; padding: 12px 14px; background: #0f172a; color: #fff; display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
      .note { margin: 10px 0 0; font-size: 10px; color: #94a3b8; }
      @media screen {
        .run { max-width: 820px; margin: 0 auto; }
        .slip { border: 1px solid #e2e8f0; margin-bottom: 24px; padding: 20px; }
      }
    </style>
  </head>
  <body>
    <div class="run">
      <div class="run-head">
        <h1>${escapeHtml(companyName)} — payment slip run</h1>
        <p>
          ${slips.length} slip${slips.length === 1 ? '' : 's'} ·
          ${escapeHtml(
            groups.length === 1
              ? formatPeriod(groups[0].period)
              : `${groups.length} pay periods`,
          )} · printed ${escapeHtml(stamp)}
        </p>
        <p class="totals">
          Gross <strong>${escapeHtml(money(totals.grossSalary))}</strong> ·
          Deductions <strong>${escapeHtml(money(totals.totalDeductions))}</strong> ·
          <strong>Net payable ${escapeHtml(money(totals.netSalary))} ${CURRENCY}</strong>
        </p>
      </div>
      ${slips.map(oneSlip).join('')}
    </div>
    <script>window.onload = function () { window.print(); }</script>
  </body>
</html>`
}

/**
 * Every slip as a printable document, one per page.
 *
 * This is the "print the whole run" path. A separate window is used rather than
 * this page's own print stylesheet, so printing does not depend on which slip
 * happens to be open in the preview, and so nothing else on the page can leak
 * into the printout.
 */
export function printAllSlips(slips, options = {}) {
  if (!slips.length) throw new Error('There are no payment slips to print.')

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('The print window was blocked. Allow pop-ups for this page and try again.')
  }

  printWindow.document.write(buildPrintDocument(slips, options))
  printWindow.document.close()

  return { count: slips.length }
}
