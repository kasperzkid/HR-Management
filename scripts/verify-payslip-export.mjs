/**
 * Payment slip export — the "export the whole run at once" path.
 *
 * No database and no credentials. The rules that decide whether a payroll file
 * is correct - what counts as the run, what gets summed, what lands in the
 * workbook, what a print run contains - are pure functions of a list of
 * slips, so they are checked against a fixture rather than against live data.
 *
 * The fixture is deliberately awkward. A payroll run is not a tidy table: a
 * slip with no bank details, two people in one department, a name with an
 * apostrophe, a period that repeats. Those are the cases that quietly produce
 * a wrong file, so they are the cases that are asserted.
 *
 *   node scripts/verify-payslip-export.mjs
 */

import * as XLSX from 'xlsx'

import {
  ALL_DEPARTMENTS,
  ALL_PERIODS,
  REGISTER_COLUMNS,
  buildPrintDocument,
  buildWorkbook,
  exportCsv,
  exportWorkbook,
  filenameFor,
  filterSlips,
  formatPeriod,
  groupByPeriod,
  printAllSlips,
  resolveExportSet,
  summarise,
} from '../src/HR-Manager/lib/payslips-export.js'

let passed = 0
let failed = 0

function suite(name) {
  console.log(`\n${name}`)
}

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1
    console.log(`  ok    ${label}`)
  } else {
    failed += 1
    console.log(`  FAIL  ${label}${detail ? `\n          ${detail}` : ''}`)
  }
}

const money = (value) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

/**
 * A two-month, four-person run.
 *
 * The numbers are chosen so the arithmetic is checkable by eye: gross is always
 * earnings, deductions are gross minus net, and the run totals are the sum of
 * the per-period totals.
 */
const RUN = [
  {
    id: 'r1', employeeDatabaseId: 'e1', employeeId: 'EMP-001', employeeName: 'Selam Wondimu',
    department: 'Engineering', jobTitle: 'Senior Developer', employmentType: 'Permanent',
    bankName: 'Commercial Bank', bankAccount: '1000123456789', tin: '0012345678', pensionId: 'PEN-11',
    payrollMonth: '2026-08',
    basicSalary: 60000, transportAllowance: 2000, housingAllowance: 0, mealAllowance: 1000,
    otherAllowance: 0, overtimePay: 1500, grossSalary: 64500,
    pensionDeduction: 6450, incomeTax: 2100, loanDeduction: 1000, otherDeduction: 0,
    totalDeductions: 9550, netSalary: 54950, employerPension: 6450, employerCost: 70950,
  },
  {
    id: 'r2', employeeDatabaseId: 'e2', employeeId: 'EMP-002', employeeName: "Dawit O'Brien",
    department: 'Engineering', jobTitle: 'Developer', employmentType: 'Permanent',
    bankName: '', bankAccount: '', tin: '0023456789', pensionId: '',
    payrollMonth: '2026-08',
    basicSalary: 40000, transportAllowance: 1500, housingAllowance: 0, mealAllowance: 800,
    otherAllowance: 0, overtimePay: 0, grossSalary: 42300,
    pensionDeduction: 4230, incomeTax: 900, loanDeduction: 0, otherDeduction: 0,
    totalDeductions: 5130, netSalary: 37170, employerPension: 4230, employerCost: 46530,
  },
  {
    id: 'r3', employeeDatabaseId: 'e3', employeeId: 'EMP-003', employeeName: 'Marta Tesfaye',
    department: 'Finance', jobTitle: 'Accountant', employmentType: 'Permanent',
    bankName: 'Dashen Bank', bankAccount: '2000987654321', tin: '0034567890', pensionId: 'PEN-33',
    payrollMonth: '2026-08',
    basicSalary: 45000, transportAllowance: 0, housingAllowance: 3000, mealAllowance: 0,
    otherAllowance: 500, overtimePay: 0, grossSalary: 48500,
    pensionDeduction: 4850, incomeTax: 1500, loanDeduction: 2000, otherDeduction: 500,
    totalDeductions: 8850, netSalary: 39650, employerPension: 4850, employerCost: 53350,
  },
  {
    id: 'r4', employeeDatabaseId: 'e4', employeeId: 'EMP-004', employeeName: 'Yonas Bekele',
    department: 'Sales', jobTitle: 'Sales Lead', employmentType: 'Contractual',
    bankName: 'NBE', bankAccount: '3000556677889', tin: '', pensionId: '',
    payrollMonth: '2026-08',
    basicSalary: 35000, transportAllowance: 3000, housingAllowance: 0, mealAllowance: 700,
    otherAllowance: 0, overtimePay: 2200, grossSalary: 40900,
    pensionDeduction: 0, incomeTax: 1100, loanDeduction: 0, otherDeduction: 0,
    totalDeductions: 1100, netSalary: 39800, employerPension: 0, employerCost: 40900,
  },
  // ── September: the same people, different numbers ──
  {
    id: 'r5', employeeDatabaseId: 'e1', employeeId: 'EMP-001', employeeName: 'Selam Wondimu',
    department: 'Engineering', jobTitle: 'Senior Developer', employmentType: 'Permanent',
    bankName: 'Commercial Bank', bankAccount: '1000123456789', tin: '0012345678', pensionId: 'PEN-11',
    payrollMonth: '2026-09',
    basicSalary: 60000, transportAllowance: 2000, housingAllowance: 0, mealAllowance: 1000,
    otherAllowance: 0, overtimePay: 3000, grossSalary: 66000,
    pensionDeduction: 6600, incomeTax: 2300, loanDeduction: 1000, otherDeduction: 0,
    totalDeductions: 9900, netSalary: 56100, employerPension: 6600, employerCost: 72600,
  },
  {
    id: 'r6', employeeDatabaseId: 'e2', employeeId: 'EMP-002', employeeName: "Dawit O'Brien",
    department: 'Engineering', jobTitle: 'Developer', employmentType: 'Permanent',
    bankName: '', bankAccount: '', tin: '0023456789', pensionId: '',
    payrollMonth: '2026-09',
    basicSalary: 40000, transportAllowance: 1500, housingAllowance: 0, mealAllowance: 800,
    otherAllowance: 0, overtimePay: 0, grossSalary: 42300,
    pensionDeduction: 4230, incomeTax: 900, loanDeduction: 0, otherDeduction: 0,
    totalDeductions: 5130, netSalary: 37170, employerPension: 4230, employerCost: 46530,
  },
  {
    id: 'r7', employeeDatabaseId: 'e3', employeeId: 'EMP-003', employeeName: 'Marta Tesfaye',
    department: 'Finance', jobTitle: 'Accountant', employmentType: 'Permanent',
    bankName: 'Dashen Bank', bankAccount: '2000987654321', tin: '0034567890', pensionId: 'PEN-33',
    payrollMonth: '2026-09',
    basicSalary: 47000, transportAllowance: 0, housingAllowance: 3000, mealAllowance: 0,
    otherAllowance: 500, overtimePay: 0, grossSalary: 50500,
    pensionDeduction: 5050, incomeTax: 1700, loanDeduction: 2000, otherDeduction: 0,
    totalDeductions: 8750, netSalary: 41750, employerPension: 5050, employerCost: 55550,
  },
  {
    id: 'r8', employeeDatabaseId: 'e4', employeeId: 'EMP-004', employeeName: 'Yonas Bekele',
    department: 'Sales', jobTitle: 'Sales Lead', employmentType: 'Contractual',
    bankName: 'NBE', bankAccount: '3000556677889', tin: '', pensionId: '',
    payrollMonth: '2026-09',
    basicSalary: 35000, transportAllowance: 3000, housingAllowance: 0, mealAllowance: 700,
    otherAllowance: 0, overtimePay: 0, grossSalary: 38700,
    pensionDeduction: 0, incomeTax: 1000, loanDeduction: 0, otherDeduction: 0,
    totalDeductions: 1000, netSalary: 37700, employerPension: 0, employerCost: 38700,
  },
]

// The fixture's own arithmetic, asserted before it is trusted by anything else.
const sum = (list, key) => list.reduce((total, slip) => total + Number(slip[key] || 0), 0)

suite('Fixture integrity')
{
  const byId = Object.fromEntries(RUN.map((slip) => [slip.id, slip]))
  check('a run is one row per person per period', RUN.length === 8 && new Set(RUN.map((s) => s.id)).size === 8)
  check('every person appears once per period', new Set(RUN.map((s) => s.employeeDatabaseId)).size === 4 && RUN.every((s) => RUN.filter((o) => o.employeeDatabaseId === s.employeeDatabaseId).length === 2))
  check('gross is the sum of the earnings lines', RUN.every((s) => s.basicSalary + s.transportAllowance + s.housingAllowance + s.mealAllowance + s.otherAllowance + s.overtimePay === s.grossSalary), `offenders: ${RUN.filter((s) => s.basicSalary + s.transportAllowance + s.housingAllowance + s.mealAllowance + s.otherAllowance + s.overtimePay !== s.grossSalary).map((s) => s.id)}`)
  check('deductions are the sum of the deduction lines', RUN.every((s) => s.pensionDeduction + s.incomeTax + s.loanDeduction + s.otherDeduction === s.totalDeductions))
  check('net is gross less deductions', RUN.every((s) => s.grossSalary - s.totalDeductions === s.netSalary))
  check('employer cost is gross plus the employer pension', RUN.every((s) => s.grossSalary + s.employerPension === s.employerCost), `offenders: ${RUN.filter((s) => s.grossSalary + s.employerPension !== s.employerCost).map((s) => s.id)}`)
  check('contractual staff carry no pension', byId.r4.pensionDeduction === 0 && byId.r8.employerPension === 0)
  check('one person has no bank details at all', byId.r2.bankName === '' && byId.r2.bankAccount === '')
  check('one name carries an apostrophe', byId.r2.employeeName.includes("'"))
  check('one person has no TIN or pension id', byId.r4.tin === '' && byId.r4.pensionId === '')
}

suite('Totals')
{
  const totals = summarise(RUN)
  check('the count is the run size', totals.count === 8, String(totals.count))
  for (const key of ['grossSalary', 'totalDeductions', 'netSalary', 'employerPension', 'employerCost', 'overtimePay', 'basicSalary']) {
    check(`${key} sums the run`, totals[key] === sum(RUN, key), `${totals[key]} vs ${sum(RUN, key)}`)
  }
  check('gross less deductions is the net payable', totals.grossSalary - totals.totalDeductions === totals.netSalary)
  check('employer cost is gross plus employer pension', totals.employerCost === totals.grossSalary + totals.employerPension)
  check('totals are rounded to two decimals', Object.values(totals).every((v) => typeof v !== 'number' || Number.isInteger(v * 100)))
  check('an empty run totals to zero, not NaN', summarise([]).netSalary === 0 && summarise([]).count === 0)
  check('a slip with no money contributes zero, not NaN', summarise([{}]).netSalary === 0)
  check('text in a money field contributes zero, not NaN', summarise([{ netSalary: 'abc' }]).netSalary === 0)
  check('null contributes zero, not NaN', summarise([{ netSalary: null }]).netSalary === 0)
  check('a negative net is carried through, not clamped', summarise([{ netSalary: -100 }]).netSalary === -100)
}

suite('Grouping by period')
{
  const groups = groupByPeriod(RUN)
  check('two periods become two groups', groups.length === 2, String(groups.length))
  check('periods come back oldest first', groups.map((g) => g.period).join() === '2026-08,2026-09', groups.map((g) => g.period).join())
  check('every slip lands in exactly one group', groups.reduce((n, g) => n + g.slips.length, 0) === RUN.length)
  check('no slip is lost or duplicated', new Set(groups.flatMap((g) => g.slips.map((s) => s.id))).size === RUN.length)
  const perPeriodNet = groups.reduce((n, g) => n + summarise(g.slips).netSalary, 0)
  check('the period nets add up to the run net', perPeriodNet === summarise(RUN).netSalary, `${perPeriodNet} vs ${summarise(RUN).netSalary}`)
  check('each period holds one row per person', groups.every((g) => new Set(g.slips.map((s) => s.employeeDatabaseId)).size === 4))
  check('a slip with no period is not dropped', groupByPeriod([{ id: 'x' }]).length === 1)
  check('a missing period is named, not blank', groupByPeriod([{ id: 'x' }])[0].period === 'Unspecified', groupByPeriod([{ id: 'x' }])[0].period)
}

suite('Period formatting')
{
  check('a real period is spelled out', formatPeriod('2026-09') === 'September 2026', formatPeriod('2026-09'))
  check('January is not shortened', formatPeriod('2026-01') === 'January 2026', formatPeriod('2026-01'))
  check('December is not shortened', formatPeriod('2026-12') === 'December 2026', formatPeriod('2026-12'))
  check('a February period resolves', formatPeriod('2026-02') === 'February 2026')
  check('a two-digit year is not accepted as a period', formatPeriod('26-09') === '26-09', formatPeriod('26-09'))
  check('a month that does not exist is not turned into Invalid Date', formatPeriod('2026-13') === '2026-13' && !formatPeriod('2026-13').includes('Invalid'), formatPeriod('2026-13'))
  check('a zero month is not turned into Invalid Date', formatPeriod('2026-00') === '2026-00', formatPeriod('2026-00'))
  check('a leading-zero month is spelled out', formatPeriod('2026-09') === 'September 2026' && formatPeriod('2026-01') === 'January 2026')
  check('no input ever yields the words Invalid Date', ['2026-13', '2026-00', '2026-99', 'x', '', null, undefined, 0, 202609].every((value) => !String(formatPeriod(value)).includes('Invalid')), `2026-13 -> ${formatPeriod('2026-13')}`)
  check('a number is coerced rather than crashing', formatPeriod(202609) === '202609', String(formatPeriod(202609)))
  check('a zero period is not read as no period', formatPeriod(0) === '0', String(formatPeriod(0)))
  check('text is passed through rather than becoming NaN', formatPeriod('nonsense') === 'nonsense')
  check('a missing period says so', formatPeriod('') === 'Unspecified' && formatPeriod(null) === 'Unspecified')
}

suite('What is in view')
{
  check('the documented defaults really are the opt-outs', filterSlips(RUN, { department: ALL_DEPARTMENTS, period: ALL_PERIODS }).length === 8, `${ALL_DEPARTMENTS} / ${ALL_PERIODS}`)
  check('no filters returns the whole run', filterSlips(RUN).length === 8)
  check('an empty filter object returns the whole run', filterSlips(RUN, {}).length === 8)
  check('an omitted filter is treated as its opt-out value', filterSlips(RUN, { search: 'Marta', department: undefined, period: null }).length === 2, String(filterSlips(RUN, { search: 'Marta', department: undefined, period: null }).length))
  check('an empty-string filter is treated as unset, not as a match-nothing', filterSlips(RUN, { department: '', period: '', search: '', employeeId: '' }).length === 8, String(filterSlips(RUN, { department: '', period: '', search: '', employeeId: '' }).length))
  check('an unset scope does not narrow the run', filterSlips(RUN, { employeeId: null }).length === 8)
  check('whitespace-only search is not a filter', filterSlips(RUN, { search: '   ' }).length === 8)

  check('a name narrows the run', filterSlips(RUN, { search: 'Marta' }).length === 2)
  check('a search is case-insensitive', filterSlips(RUN, { search: 'marta' }).length === 2)
  check('a partial name matches', filterSlips(RUN, { search: 'art' }).length === 2)
  check('the employee code narrows the run', filterSlips(RUN, { search: 'EMP-004' }).length === 2)
  check('a department narrows the run', filterSlips(RUN, { department: 'Engineering' }).length === 4)
  check('a period narrows the run', filterSlips(RUN, { period: '2026-08' }).length === 4)
  check('a job title narrows the run', filterSlips(RUN, { search: 'Accountant' }).length === 2)
  check('a person narrows to their two periods', filterSlips(RUN, { employeeId: 'e2' }).length === 2, String(filterSlips(RUN, { employeeId: 'e2' }).length))
  check('the filters combine', filterSlips(RUN, { department: 'Engineering', period: '2026-09' }).length === 2)
  check('all three filters combine', filterSlips(RUN, { department: 'Engineering', period: '2026-09', search: 'Selam' }).length === 1)
  check('a department is matched exactly, not loosely', filterSlips(RUN, { department: 'Eng' }).length === 0)
  check('a blank department filter is not treated as "slips with no department"', filterSlips(RUN, { department: '' }).length === 8, String(filterSlips(RUN, { department: '' }).length))
  check('filtering for a department nobody is in yields nothing', filterSlips(RUN, { department: 'Legal' }).length === 0)
  check('a search that matches nothing yields nothing', filterSlips(RUN, { search: 'nobody' }).length === 0)
  check('an unknown employee yields nothing rather than everything', filterSlips(RUN, { employeeId: 'does-not-exist' }).length === 0)
  check('a person with no slips yields nothing', filterSlips(RUN, { employeeId: 'e99' }).length === 0)
  check('the department filter does not match blank departments', filterSlips(RUN.filter((s) => !s.department), { department: 'Engineering' }).length === 0)
  check('a numeric employee id narrows the run', filterSlips([...RUN, { ...RUN[0], id: 'r9', employeeDatabaseId: 7 }], { employeeId: 7 }).length === 1)
  check('a numeric id does not match a string id', filterSlips(RUN, { employeeId: 3 }).length === 0)
  check('filtering never mutates the run', (() => { const copy = RUN.length; filterSlips(RUN, { search: 'Marta' }); return RUN.length === copy })())
}

suite('What an export writes')
{
  const visible = filterSlips(RUN, { department: 'Engineering' })
  check('with nothing ticked the whole view is exported', resolveExportSet(visible).length === 4)
  check('with nothing ticked an empty view exports nothing', resolveExportSet([]).length === 0)
  check('ticked rows win over the filters', resolveExportSet(visible, ['r1', 'r5']).length === 2)
  check('a tick outside the view is ignored, not smuggled in', resolveExportSet(visible, ['r1', 'r3']).length === 1, String(resolveExportSet(visible, ['r1', 'r3']).map((s) => s.id)))
  check('a tick that matches nothing exports nothing', resolveExportSet(visible, ['nope']).length === 0)
  check('duplicate ticks do not duplicate rows', resolveExportSet(visible, ['r1', 'r1', 'r1']).length === 1)
  check('a missing selection is treated as none ticked', resolveExportSet(visible, undefined).length === 4 && resolveExportSet(visible, null).length === 4)
  check('a non-array selection is treated as none ticked', resolveExportSet(visible, 'r1').length === 4)
  check('an empty selection array is treated as none ticked', resolveExportSet(visible, []).length === 4)
  check('one ticked slip is one row', resolveExportSet(visible, ['r2']).map((s) => s.id).join() === 'r2')
}

suite('Filenames')
{
  const stamp = '2026-09-30'
  check('one month is named for that month', filenameFor(RUN.slice(0, 4), stamp) === 'payment-slips_2026-08_2026-09-30', filenameFor(RUN.slice(0, 4), stamp))
  check('a September-only run is named for September', filenameFor(RUN.slice(4), stamp) === 'payment-slips_2026-09_2026-09-30', filenameFor(RUN.slice(4), stamp))
  check('two months are named as a span', filenameFor(RUN, stamp) === 'payment-slips_2026-08_to_2026-09_2026-09-30', filenameFor(RUN, stamp))
  check('a run with no period is still named', filenameFor([{}], stamp) === 'payment-slips_no-periods_2026-09-30', filenameFor([{}], stamp))
  check('the name carries no path separator', filenameFor(RUN, stamp).includes('/') === false)
  check('the name is the same for the same run', filenameFor(RUN, stamp) === filenameFor([...RUN].reverse(), stamp))
  check('the periods are read in order, not arrival order', filenameFor([...RUN].reverse(), stamp) === 'payment-slips_2026-08_to_2026-09_2026-09-30')
}

suite('Workbook: the register')
{
  const { book } = buildWorkbook(RUN)
  const rows = XLSX.utils.sheet_to_json(book.Sheets['All Slips'])
  check('the register holds every slip in the run', rows.length === 8, String(rows.length))
  check('the register columns are the declared ones', Object.keys(rows[0]).join('|') === REGISTER_COLUMNS.map((c) => c.header).join('|'), Object.keys(rows[0]).join('|'))
  check('no two columns share a header', new Set(REGISTER_COLUMNS.map((c) => c.header)).size === REGISTER_COLUMNS.length)
  check('the header row holds the first header, not a stray value', book.Sheets['All Slips'].A1?.v === REGISTER_COLUMNS[0].header, JSON.stringify(book.Sheets['All Slips'].A1))
  check('money stays a number so Excel can sum it', typeof rows[0]['Net Salary'] === 'number', typeof rows[0]['Net Salary'])
  check('the pay period stays text so Excel cannot reformat it', typeof rows[0]['Pay Period'] === 'string', typeof rows[0]['Pay Period'])
  check('a blank bank account is empty, not undefined or NaN', rows.filter((r) => r['Account'] === '').length === 2, String(rows.filter((r) => r['Account'] === '').length))
  check('a name with an apostrophe survives', rows.some((r) => r['Employee Name'] === "Dawit O'Brien"))
  check('no cell in the register is undefined', rows.every((r) => Object.values(r).every((v) => v !== undefined)))
  check('the register sums back to the run net', rows.reduce((n, r) => n + r['Net Salary'], 0) === summarise(RUN).netSalary)
  check('the column widths are set for every column', Array.isArray(book.Sheets['All Slips']['!cols']) && book.Sheets['All Slips']['!cols'].length === REGISTER_COLUMNS.length)
}

suite('Workbook: the summary')
{
  const { book, grandTotal, periodCount } = buildWorkbook(RUN)
  const summary = XLSX.utils.sheet_to_json(book.Sheets.Summary)
  check('the summary leads the workbook', book.SheetNames[0] === 'Summary', book.SheetNames.join(', '))
  check('one row per period plus a total row', summary.length === 3, String(summary.length))
  check('the last row is the total', summary.at(-1)['Pay Period'] === 'TOTAL', String(summary.at(-1)['Pay Period']))
  check('the total row is labelled, not a third month', !/^[A-Z][a-z]+ \d{4}$/.test(summary.at(-1)['Pay Period']))
  check('the total row counts the whole run', summary.at(-1).Employees === 8, String(summary.at(-1).Employees))
  check('the total row carries the run net payable', summary.at(-1)['Net Payable'] === summarise(RUN).netSalary, String(summary.at(-1)['Net Payable']))
  check('the total row carries the run employer cost', summary.at(-1)['Employer Cost'] === summarise(RUN).employerCost)
  check('the period rows add up to the total net', Math.abs(summary.slice(0, -1).reduce((n, r) => n + r['Net Payable'], 0) - summary.at(-1)['Net Payable']) < 0.005)
  check('each period row is spelled out as a month', summary.slice(0, -1).every((r) => /^[A-Z][a-z]+ \d{4}$/.test(r['Pay Period'])), summary.slice(0, -1).map((r) => r['Pay Period']).join(', '))
  check('the summary reports the period count', periodCount === 2, String(periodCount))
  check('the grand total is handed back for the page to show', grandTotal.netSalary === summarise(RUN).netSalary)
}

suite('Workbook: one sheet per period')
{
  const { book } = buildWorkbook(RUN)
  check('summary, register and the periods are all present', book.SheetNames.length === 4, book.SheetNames.join(', '))
  check('the periods follow the register', book.SheetNames[1] === 'All Slips' && book.SheetNames.slice(2).join() === '2026-08,2026-09', book.SheetNames.join(', '))
  const august = XLSX.utils.sheet_to_json(book.Sheets['2026-08'])
  const september = XLSX.utils.sheet_to_json(book.Sheets['2026-09'])
  check('each period sheet holds only that period', august.every((r) => r['Pay Period'] === '2026-08') && september.every((r) => r['Pay Period'] === '2026-09'), `${[...new Set(august.map((r) => r['Pay Period']))].join(',')} / ${[...new Set(september.map((r) => r['Pay Period']))].join(',')}`)
  check('the register keeps the period machine-readable', [...august, ...september].every((r) => /^\d{4}-\d{2}$/.test(r['Pay Period'])), [...new Set([...august, ...september].map((r) => r['Pay Period']))].join(','))
  check('the summary spells the period out for a human', XLSX.utils.sheet_to_json(buildWorkbook(RUN).book.Sheets.Summary).slice(0, -1).every((r) => /^[A-Z][a-z]+ \d{4}$/.test(r['Pay Period'])))
  check('the period sheets together hold the whole run', august.length + september.length === 8)
  check('a period sheet totals to its own period net', august.reduce((n, r) => n + r['Net Salary'], 0) === summarise(RUN.slice(0, 4)).netSalary)
  check('every sheet is named within Excel\'s 31 characters', book.SheetNames.every((n) => n.length <= 31))
  check('an over-long period is shortened, not thrown on', buildWorkbook([{ id: 'x', payrollMonth: 'p'.repeat(60), netSalary: 1 }]).book.SheetNames.every((n) => n.length <= 31))
  check('two runs of the same period get distinct sheet names', (() => {
    const names = buildWorkbook([
      { id: '1', payrollMonth: 'x'.repeat(40), netSalary: 1 },
      { id: '2', payrollMonth: 'x'.repeat(40), netSalary: 1 },
    ]).book.SheetNames
    return new Set(names).size === names.length
  })())
  check('a missing period still gets a sheet', buildWorkbook([{ id: 'x' }]).book.SheetNames.includes('Unspecified'))
  check('characters Excel forbids do not throw', buildWorkbook([{ id: 'x', payrollMonth: 'a/b:c*d?e[f]g' }]).book.SheetNames.length === 3)
}

suite('Print document')
{
  const html = buildPrintDocument(RUN, { stamp: '2026-09-30 10:00' })
  const countOf = (needle) => html.split(needle).length - 1
  check('one document section per slip', countOf('<article class="slip">') === 8, String(countOf('<article class="slip">')))
  check('every slip but the last ends a page', /\.slip \{ page-break-after: always/.test(html) && /\.slip:last-child \{ page-break-after: auto/.test(html))
  check('the page size is A4', /@page \{ size: A4/.test(html))
  check('the run totals come before the first slip', html.indexOf('Net payable') < html.indexOf('<article'))
  check('the run total is the summed net', html.includes(`Net payable ${money(summarise(RUN).netSalary)} ETB`))
  check('each slip states its own net', RUN.every((s) => html.includes(`<strong>${money(s.netSalary)} ETB</strong>`)))
  check('each slip names its period', RUN.every((s) => html.includes(formatPeriod(s.payrollMonth))))
  check('each slip names its employee', RUN.every((s) => html.includes(s.employeeName.replace(/'/g, '&#39;'))), 'a name is missing from the document')
  check('each slip shows its bank details', RUN.filter((s) => s.bankName).every((s) => html.includes(s.bankAccount)))
  check('a slip with no bank details still prints a row', html.includes('NBE') && html.split('<dt>Bank</dt>').length - 1 === 8, `${html.split('<dt>Bank</dt>').length - 1} bank rows`)
  check('a two-period run says so', /2 pay periods/.test(html), (html.match(/slips? ·[^<]*/) || [])[0])
  check('a single slip is worded in the singular', / 1 slip ·/.test(buildPrintDocument([RUN[0]], { stamp: 'x' })), (buildPrintDocument([RUN[0]], { stamp: 'x' }).match(/slips? ·/) || [])[0])
  check('a single-period run names the month', buildPrintDocument(RUN.slice(0, 4), { stamp: 'x' }).includes('August 2026'))
  check('print is triggered exactly once, after load', countOf('window.print()') === 1 && countOf('window.onload') === 1)
  check('the document declares utf-8 so names do not mangle', /<meta charset="utf-8"/.test(html))
  check('the document is complete', html.trimStart().startsWith('<!DOCTYPE html>') && html.trimEnd().endsWith('</html>'))
  for (const tag of ['article', 'section', 'table', 'dl', 'footer', 'div', 'header', 'p']) {
    check(`<${tag}> is balanced`, countOf(`<${tag}`) === countOf(`</${tag}>`), `${countOf(`<${tag}`)} opened, ${countOf(`</${tag}>`)} closed`)
  }
  check('no script tag is left open', countOf('<script>') === countOf('</script>'))
}

suite('Print document: escaping')
{
  const hostile = buildPrintDocument([{
    id: 'x', employeeDatabaseId: 'x', employeeId: '<b>1</b>', employeeName: '<img src=x onerror=alert(1)>',
    department: 'A & B "C"', jobTitle: "<script>alert('x')</script>", employmentType: 'Permanent',
    bankName: '', bankAccount: '', tin: '', pensionId: '',
    payrollMonth: '2026-09', basicSalary: 5, overtimePay: 0, transportAllowance: 0, housingAllowance: 0,
    mealAllowance: 0, otherAllowance: 0, grossSalary: 5, pensionDeduction: 0, incomeTax: 0,
    loanDeduction: 0, otherDeduction: 0, totalDeductions: 0, netSalary: 5,
    employerPension: 0, employerCost: 5,
  }], { stamp: '<b>stamp</b>', companyName: '"Yanol" & Co <script>' })
  check('a name cannot inject an image', !hostile.includes('<img src=x'), 'raw <img src=x present')
  check('a name is printed as text', hostile.includes('&lt;img src=x onerror=alert(1)&gt;'))
  check('a job title cannot inject a script', !hostile.includes("<script>alert('x')</script>"), 'raw <script> in the output')
  check('the job title is escaped as text', hostile.includes('&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;'))
  check('an ampersand is escaped', hostile.includes('A &amp; B'))
  check('a double quote is escaped', hostile.includes('&quot;C&quot;'))
  check('a hostile company name is escaped', hostile.includes('&quot;Yanol&quot; &amp; Co &lt;script&gt;'))
  check('a hostile stamp is escaped', hostile.includes('&lt;b&gt;stamp&lt;/b&gt;') && !hostile.includes('<b>stamp</b>'))
  check('a hostile employee id is escaped', hostile.includes('&lt;b&gt;1&lt;/b&gt;'))
  check('only the one intended script tag survives', hostile.split('<script>').length - 1 === 1, `${hostile.split('<script>').length - 1} script tags`)
}

suite('Refusing an empty run')
{
  const savedWindow = globalThis.window
  const openStub = (result) => {
    let written = null
    globalThis.window = { open: () => (result === null ? null : { document: { write: (h) => { written = h }, close: () => {} } }) }
    return () => written
  }
  try {
    check('the workbook export refuses an empty run', (() => { try { exportWorkbook([]); return false } catch (error) { return /no payment slips/i.test(error.message) } })())
    check('the CSV export refuses an empty run', (() => { try { exportCsv([]); return false } catch (error) { return /no payment slips/i.test(error.message) } })())
    check('printing refuses an empty run', (() => { try { printAllSlips([]); return false } catch (error) { return /no payment slips/i.test(error.message) } })())

    check('a blocked pop-up is reported rather than swallowed', (() => {
      openStub(null)
      try { printAllSlips([RUN[0]]); return false } catch (error) { return /pop-up/i.test(error.message) }
    })())

    check('a successful print reports how many slips went out', (() => {
      const read = openStub('ok')
      const result = printAllSlips(RUN.slice(0, 3))
      return result.count === 3 && String(read()).includes('3 slips')
    })())

    check('the printed document is what was written', (() => {
      const read = openStub('ok')
      printAllSlips(RUN.slice(0, 2))
      return String(read()).includes('<!DOCTYPE html>') && String(read()).split('<article class="slip">').length - 1 === 2
    })())

    check('the print window is told to close its handle', (() => {
      let closed = false
      globalThis.window = { open: () => ({ document: { write: () => {}, close: () => { closed = true } } }) }
      printAllSlips([RUN[0]])
      return closed
    })())
  } finally {
    globalThis.window = savedWindow
  }
}

suite('CSV')
{
  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(RUN.map((slip) => Object.fromEntries(REGISTER_COLUMNS.map((c) => [c.header, c.money ? Number(slip[c.key] || 0) : (slip[c.key] ?? '')])))))
  const lines = csv.trim().split('\n')
  check('there is one line per slip plus a header', lines.length === 9, String(lines.length))
  check('the header names every register column', lines[0].split(',').length === REGISTER_COLUMNS.length, `${lines[0].split(',').length} columns`)
  check('an apostrophe in a name is not mangled', csv.includes("O'Brien"))
  check('money is unquoted so a spreadsheet reads it as a number', !/"[0-9]+\.[0-9]{2}"/.test(lines[1]), lines[1])
  check('the run is not silently truncated', csv.includes('2026-08') && csv.includes('2026-09'))
  check('a comma in a name is quoted so the columns do not shift', (() => {
    const withComma = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet([{ Name: 'Abebe, Bekele' }]))
    return withComma.includes('"Abebe, Bekele"')
  })(), 'quoting not applied')
  check('a double quote inside a name is doubled', (() => {
    const withQuote = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet([{ Name: 'A "Nick" B' }]))
    return withQuote.includes('"A ""Nick"" B"')
  })(), 'quote not doubled')
  // A newline inside a quoted field is legal CSV and is what keeps a name
  // readable rather than silently splitting one employee across two rows, so
  // the round trip through a real parser is the assertion, not a line count.
  check('a line break in a name does not split the row', (() => {
    const withNewline = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet([{ Name: 'A\nB', Note: 'plain' }]))
    const book = XLSX.read(withNewline, { type: 'string' })
    return XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]]).length === 1
  })(), 'the row did not survive a round trip')
  check('a comma in a name survives a round trip in the right column', (() => {
    const withComma = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet([{ Name: 'Abebe, Bekele', Note: 'kept' }]))
    const book = XLSX.read(withComma, { type: 'string' })
    const row = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]])[0]
    return row.Name === 'Abebe, Bekele' && row.Note === 'kept'
  })(), 'the columns shifted')
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
