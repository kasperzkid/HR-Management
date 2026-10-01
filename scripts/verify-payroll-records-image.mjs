/**
 * Payroll records as an image — the PNG the "Table as image" button writes.
 *
 * No database, no credentials and no browser. The parts that decide what the
 * image *says* are pure, and the drawing is driven through a recording stub
 * canvas, so the layout and every string that reaches the pixels are asserted
 * without a real 2D context.
 *
 * The fixture is deliberately awkward: records holding null, undefined and NaN,
 * a month that is not a real calendar month, a company name with a stray quote
 * in it, and a currency the caller did not supply. Those are the inputs that
 * put "NaN" or "undefined" on somebody's payroll export.
 *
 *   node scripts/verify-payroll-records-image.mjs
 */

// The module under test imports "./payslips-export" without an extension, which
// is this repo's convention (277 relative imports, none carrying a .js) and is
// fine for Vite, but Node's ESM resolver will not follow it. Rather than break
// the convention in app code to suit a test, the module is bundled through the
// app's own pipeline first and the bundle is what gets exercised.
import { build } from 'vite'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = 'C:/Users/selam/HR-Management'
const OUT = resolve(ROOT, '.payroll-records-image-verify')

await build({
  root: ROOT,
  logLevel: 'error',
  configFile: false,
  build: {
    ssr: true,
    outDir: OUT,
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: resolve(ROOT, 'src/HR-Manager/lib/payroll-records-image.js'),
      output: { entryFileNames: 'entry.mjs' },
    },
  },
})

const {
  buildPayrollRecordsImageModel,
  drawPayrollRecordsImage,
  exportPayrollRecordsImage,
  payrollRecordsFilename,
} = await import(pathToFileURL(resolve(OUT, 'entry.mjs')).href)

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

/** A 2D context that records everything, so the calls can be inspected. */
function recordingContext() {
  const drawn = []
  const ops = []
  const ctx = {
    drawn,
    ops,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
    letterSpacing: '0px',
    // A real browser measures text with the current font. The stub cannot, so it
    // approximates: average glyph advance in a sans-serif face is a little over
    // half the font size. Without this every header looks far wider than it is
    // and the truncation checks test the stub rather than the layout.
    measureText: (text) => {
      const size = Number(String(ctx.font).match(/(\d+(?:\.\d+)?)px/)?.[1] || 12)
      return { width: String(text).length * size * 0.55 }
    },
    fillText(text, x, y) {
      drawn.push({ text: String(text), x, y, align: ctx.textAlign, font: ctx.font, fill: ctx.fillStyle })
    },
    beginPath() { ops.push('beginPath') },
    closePath() { ops.push('closePath') },
    moveTo() { ops.push('moveTo') },
    lineTo() { ops.push('lineTo') },
    arcTo() { ops.push('arcTo') },
    roundRect() { ops.push('roundRect') },
    stroke() { ops.push('stroke') },
    fill() { ops.push('fill') },
    fillRect(...args) { ops.push(`fillRect ${args.join(' ')}`) },
    scale(x, y) { ops.push(`scale ${x} ${y}`) },
  }
  return ctx
}

function recordingCanvas(ctx) {
  return {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toBlob(callback, type) {
      callback({ __blob: true, type })
    },
  }
}

/** A run whose arithmetic is checkable by eye. */
const RECORDS = [
  {
    id: '1',
    employee: { name: 'Samuel Wondimu', department: 'HR', employeeId: '0006' },
    basicSalary: 8000,
    transportAllowance: 500,
    housingAllowance: 1000,
    mealAllowance: 300,
    otherAllowance: 200,
    attendanceSummary: { overtimeHours: 2 },
    grossSalary: 10000,
    pensionDeduction: 560,
    incomeTax: 1200,
    totalDeductions: 1760,
    netSalary: 8240,
    employerCost: 10800,
    status: 'PRESENT',
  },
  {
    id: '2',
    employee: { name: 'Ayele Kebede', department: 'Engineering', employeeId: '0007' },
    basicSalary: 12000,
    transportAllowance: 500,
    housingAllowance: 1500,
    mealAllowance: 300,
    otherAllowance: 0,
    attendanceSummary: { overtimeHours: 0 },
    grossSalary: 14300,
    pensionDeduction: 840,
    incomeTax: 2000,
    totalDeductions: 2840,
    netSalary: 11460,
    employerCost: 15100,
    status: 'ABSENT',
  },
]

const money = (value) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

// Hand-computed from RECORDS, so a regression in the totals cannot hide behind
// the same arithmetic the code under test uses.
const EXPECTED_TOTALS = {
  basic: money(20000),
  allowances: money(4300),
  ot: '2.00',
  gross: money(24300),
  pension: money(1400),
  tax: money(3200),
  deductions: money(4600),
  net: money(19700),
  employerCost: money(25900),
}

const EXPECTED_COLUMNS = [
  'Employee', 'Department', 'Basic', 'Allowances', 'OT Hours', 'Gross',
  'Pension', 'Tax', 'Deductions', 'Net Salary', 'Employer Cost', 'Status',
]

suite('the model: every figure the image will show')

{
  const model = buildPayrollRecordsImageModel({
    month: '2026-09',
    records: RECORDS,
    companyName: 'Yanol Technology PLC',
    currency: 'ETB',
    generatedAt: '2026-09-30T09:05:00Z',
  })

  check('there is one row per record', model.rows.length === 2, `got ${model.rows.length}`)
  check(
    'the columns match the table, in order',
    JSON.stringify(model.columns.map((c) => c.label)) === JSON.stringify(EXPECTED_COLUMNS),
    model.columns.map((c) => c.label).join(' | '),
  )
  check('the title names the document', model.title === 'Payroll Records')
  check('a real month is spelled out', model.period === 'September 2026', model.period)
  check('the raw period is kept for the filename', model.periodRaw === '2026-09')
  check('the record count is carried through', model.recordCount === 2)
  check('the company name is kept', model.company === 'Yanol Technology PLC')
  check('the currency is kept', model.currency === 'ETB')
  check('a generated stamp is produced', /2026/.test(model.generated), model.generated)

  const first = model.rows[0]
  check('the employee name is resolved from the record', first.employee === 'Samuel Wondimu', first.employee)
  check('the department is resolved from the record', first.department === 'HR', first.department)
  check('basic is formatted to 2dp', first.basic === money(8000), first.basic)
  check('allowances are summed from their parts', first.allowances === money(2000), first.allowances)
  check('overtime hours are shown to 2dp', first.ot === '2.00', first.ot)
  check('gross is formatted to 2dp', first.gross === money(10000), first.gross)
  check('pension is formatted to 2dp', first.pension === money(560), first.pension)
  check('tax is formatted to 2dp', first.tax === money(1200), first.tax)
  check('deductions are formatted to 2dp', first.deductions === money(1760), first.deductions)
  check('net is formatted to 2dp', first.net === money(8240), first.net)
  check('employer cost is formatted to 2dp', first.employerCost === money(10800), first.employerCost)
  check('the status is carried through', first.status === 'PRESENT', first.status)

  const second = model.rows[1]
  check('a zero overtime is shown as 0.00, not blank', second.ot === '0.00', second.ot)
  check('a zero allowance part does not break the sum', second.allowances === money(2300), second.allowances)
  check('the second employee is resolved', second.employee === 'Ayele Kebede', second.employee)

  check('the net column is the highlighted one', model.columns.find((c) => c.key === 'net')?.highlight === true)
  check('no other column claims to be highlighted', model.columns.filter((c) => c.highlight).length === 1)
}

suite('the model: the totals row')

{
  const model = buildPayrollRecordsImageModel({
    month: '2026-09',
    records: RECORDS,
  })

  check('the totals row is labelled', model.totals.employee === 'Total', model.totals.employee)
  check('basic totals correctly', model.totals.basic === EXPECTED_TOTALS.basic, model.totals.basic)
  check('allowances total correctly', model.totals.allowances === EXPECTED_TOTALS.allowances, model.totals.allowances)
  check('overtime totals correctly', model.totals.ot === EXPECTED_TOTALS.ot, model.totals.ot)
  check('gross totals correctly', model.totals.gross === EXPECTED_TOTALS.gross, model.totals.gross)
  check('pension totals correctly', model.totals.pension === EXPECTED_TOTALS.pension, model.totals.pension)
  check('tax totals correctly', model.totals.tax === EXPECTED_TOTALS.tax, model.totals.tax)
  check('deductions total correctly', model.totals.deductions === EXPECTED_TOTALS.deductions, model.totals.deductions)
  check('net totals correctly', model.totals.net === EXPECTED_TOTALS.net, model.totals.net)
  check('employer cost totals correctly', model.totals.employerCost === EXPECTED_TOTALS.employerCost, model.totals.employerCost)
  check('the status column has no total', model.totals.status === '')
}

suite('the model: bad input must not reach the image')

{
  // Every one of these has a habit of rendering as the word "NaN".
  const model = buildPayrollRecordsImageModel({
    month: '2026-09',
    records: [
      {
        employee: { name: null, department: undefined },
        basicSalary: undefined,
        transportAllowance: NaN,
        housingAllowance: 'not a number',
        mealAllowance: Infinity,
        otherAllowance: -0,
        attendanceSummary: { overtimeHours: null },
        grossSalary: 'abc',
        pensionDeduction: {},
        incomeTax: [],
        totalDeductions: true,
        netSalary: false,
        employerCost: () => 1,
        status: null,
      },
    ],
  })

  const printed = [
    ...model.rows[0] && Object.values(model.rows[0]),
    ...Object.values(model.totals),
  ].join(' | ')

  check('no cell prints NaN', !printed.includes('NaN'), printed)
  check('no cell prints undefined', !printed.includes('undefined'), printed)
  check('no cell prints Infinity', !printed.includes('Infinity'), printed)
  check('no cell prints [object Object]', !printed.includes('[object Object]'), printed)
  check('an undefined basic becomes 0.00', model.rows[0].basic === '0.00', model.rows[0].basic)
  check('a NaN allowance becomes 0.00', model.rows[0].allowances === '0.00', model.rows[0].allowances)
  check('a null overtime becomes 0.00', model.rows[0].ot === '0.00', model.rows[0].ot)
  check('a non-numeric gross becomes 0.00', model.rows[0].gross === '0.00', model.rows[0].gross)
  check('a missing employee name becomes a dash', model.rows[0].employee === '—', model.rows[0].employee)
  check('a missing department becomes a dash', model.rows[0].department === '—', model.rows[0].department)
  check('a missing status reads as Saved, matching the table', model.rows[0].status === 'Saved', model.rows[0].status)
  check('the totals survive bad rows', model.totals.net === '0.00', model.totals.net)
}

{
  const model = buildPayrollRecordsImageModel({ month: '2026-13', records: RECORDS })
  check('a month that does not exist is not spelled out', model.period === '2026-13', model.period)
  check('a bad month does not become "Invalid Date"', !model.period.includes('Invalid Date'))
}

{
  const model = buildPayrollRecordsImageModel({})
  check('a missing month reads as Unspecified', model.period === 'Unspecified', model.period)
  check('a missing month leaves the raw period empty', model.periodRaw === '')
  check('no records means no rows', model.rows.length === 0)
  check('a missing company leaves the header blank', model.company === '')
  check('the currency falls back to ETB', model.currency === 'ETB')
  check('a missing generated stamp is simply absent', model.generated === '')
}

{
  const negatives = buildPayrollRecordsImageModel({
    month: '2026-09',
    records: [{ basicSalary: -500, grossSalary: -400, netSalary: -100 }],
  })
  check('a negative amount keeps its sign', negatives.rows[0].basic === '-500.00', negatives.rows[0].basic)
  check('a negative total keeps its sign', negatives.totals.net === '-100.00', negatives.totals.net)
}

{
  const trimmed = buildPayrollRecordsImageModel({
    month: '2026-09',
    records: RECORDS,
    companyName: '  Spaced PLC  ',
  })
  check('a padded company name is trimmed', trimmed.company === 'Spaced PLC', `"${trimmed.company}"`)
}

suite('the filename')

{
  check('a normal month is used as-is', payrollRecordsFilename('2026-09') === 'payroll-records-2026-09.png', payrollRecordsFilename('2026-09'))
  check('a missing month still yields a name', payrollRecordsFilename('') === 'payroll-records.png', payrollRecordsFilename(''))
  check('null still yields a name', payrollRecordsFilename(null) === 'payroll-records.png', payrollRecordsFilename(null))
  check('undefined still yields a name', payrollRecordsFilename(undefined) === 'payroll-records.png', payrollRecordsFilename(undefined))
  check('a padded month is trimmed', payrollRecordsFilename('  2026-09  ') === 'payroll-records-2026-09.png', payrollRecordsFilename('  2026-09  '))

  // A month is attacker-influenced only in the sense that it comes from data, but
  // the value ends up in a download name, so separators must not survive.
  for (const hostile of ['../../etc/passwd', 'a/b', 'a\\b', 'x*y', '2026-09?x=1']) {
    const name = payrollRecordsFilename(hostile)
    check(`"${hostile}" cannot escape the filename`, !/[\\/:*?"<>|]/.test(name) && name === 'payroll-records.png', name)
  }
}

suite('the drawing: layout and every string that reaches the pixels')

{
  const ctx = recordingContext()
  const model = buildPayrollRecordsImageModel({
    month: '2026-09',
    records: RECORDS,
    companyName: 'Yanol Technology PLC',
    currency: 'ETB',
    generatedAt: '2026-09-30T09:05:00Z',
  })
  const canvas = drawPayrollRecordsImage(model, { scale: 2, createCanvas: () => recordingCanvas(ctx) })

  const printed = ctx.drawn.map((d) => d.text)
  const all = printed.join(' | ')

  // The columns sum to 1304, plus 2 * 48 of padding.
  check('the canvas is 2x the layout width', canvas.width === (1304 + 96) * 2, String(canvas.width))
  check('the canvas height covers the header, rows, totals and footer', canvas.height > 0 && canvas.height % 2 === 0, String(canvas.height))
  check('the drawing was scaled, not upscaled after the fact', ctx.ops.includes('scale 2 2'))
  check('the document title is drawn', printed.includes('Payroll Records'))
  check('the company is drawn in caps', printed.includes('YANOL TECHNOLOGY PLC'), printed.join(' | '))
  check('the spelled-out month is drawn', printed.includes('September 2026'))
  check('the currency is named once, in the header', printed.includes('All amounts in ETB'))
  check('every column header is drawn', EXPECTED_COLUMNS.every((l) => printed.includes(l)), printed.join(' | '))
  check('every row value is drawn', model.rows.every((r) => Object.values(r).every((v) => printed.includes(v))))
  check('every total is drawn', Object.values(model.totals).filter(Boolean).every((v) => printed.includes(v)))
  check('the generated stamp is drawn', printed.some((t) => t.startsWith('Generated ')), printed.join(' | '))

  check('no NaN is drawn', !all.includes('NaN'), all)
  check('no undefined is drawn', !all.includes('undefined'), all)
  check('no [object Object] is drawn', !all.includes('[object Object]'))
  check('no Invalid Date is drawn', !all.includes('Invalid Date'))

  // Numbers are right-aligned, text left-aligned: a column of figures with no
  // shared right edge is the classic way a payroll export looks amateur.
  const numberDraws = ctx.drawn.filter((d) => d.align === 'right' && /^-?[\d,]+\.\d{2}$/.test(d.text))
  check('every amount is right-aligned', numberDraws.length > 0 && numberDraws.every((d) => d.align === 'right'), numberDraws.map((d) => `${d.text}:${d.align}`).join(' '))
  const textDraws = ctx.drawn.filter((d) => d.align === 'left' && /^[A-Z]/.test(d.text))
  check('the text columns are left-aligned', textDraws.length > 0 && textDraws.every((d) => d.align === 'left'))

  // The net column is the one that matters, so it is set in the accent colour.
  const netDraws = ctx.drawn.filter((d) => d.fill === '#0369a1')
  check('the net column is drawn in the accent colour', netDraws.length > 0, netDraws.map((d) => d.text).join(' | '))
  check('the net values are among them', model.rows.every((r) => netDraws.some((d) => d.text === r.net)))

  // Rows must not collide with each other or with the header.
  const rowYs = model.rows.map((r) => ctx.drawn.find((d) => d.text === r.net)?.y).filter(Boolean)
  check('every row drew a net value', rowYs.length === 2, String(rowYs.length))
  check('the rows are evenly spaced and in order', rowYs.every((y, i) => i === 0 || y > rowYs[i - 1]), rowYs.join(' '))
  const gaps = rowYs.slice(1).map((y, i) => y - rowYs[i])
  check('the row spacing is uniform', new Set(gaps).size === 1, gaps.join(' '))
  check('the first row sits below the table header', rowYs[0] > 158, String(rowYs[0]))

  // The totals row sits below the last data row.
  const totalY = ctx.drawn.find((d) => d.text === EXPECTED_TOTALS.net)?.y
  check('the totals row is below the last data row', totalY > rowYs[rowYs.length - 1], `${totalY} vs ${rowYs[rowYs.length - 1]}`)
}

{
  // A name too long for its column must be shortened, not allowed to overflow.
  const ctx = recordingContext()
  const model = buildPayrollRecordsImageModel({
    month: '2026-09',
    records: RECORDS,
    companyName: 'A'.repeat(200),
  })
  drawPayrollRecordsImage(model, { scale: 1, createCanvas: () => recordingCanvas(ctx) })
  const company = ctx.drawn.find((d) => d.text.endsWith('...'))
  check('an overlong company name is truncated with an ellipsis', Boolean(company), ctx.drawn.map((d) => d.text).join(' | '))
  check('the truncated name is shorter than the original', company && company.text.length < 200, String(company?.text.length))
}

{
  // Scale 1 must still produce a correctly sized canvas.
  const ctx = recordingContext()
  const model = buildPayrollRecordsImageModel({ month: '2026-09', records: RECORDS })
  const canvas = drawPayrollRecordsImage(model, { scale: 1, createCanvas: () => recordingCanvas(ctx) })
  check('scale 1 gives a canvas of exactly the layout width', canvas.width === 1304 + 96, String(canvas.width))
  check('the default scale is 2 when none is given', (() => {
    const c2 = recordingContext()
    const c = drawPayrollRecordsImage(model, { createCanvas: () => recordingCanvas(c2) })
    return c.width === (1304 + 96) * 2
  })())
}

suite('the download: it hands over a real file, and refuses an empty run')

{
  const downloads = []
  const revoked = []
  globalThis.document = {
    createElement: () => ({
      set href(v) { this._href = v },
      get href() { return this._href },
      set download(v) { this._download = v },
      click() { downloads.push({ href: this._href, download: this._download }) },
      remove() {},
    }),
    body: { appendChild() {} },
  }
  globalThis.URL = {
    createObjectURL: (blob) => `blob:fake/${blob.type}`,
    revokeObjectURL: (url) => revoked.push(url),
  }

  const ctx = recordingContext()
  const result = await exportPayrollRecordsImage({
    month: '2026-09',
    records: RECORDS,
    companyName: 'Yanol Technology PLC',
    currency: 'ETB',
    createCanvas: () => recordingCanvas(ctx),
  })

  check('it resolves with the filename it used', result.filename === 'payroll-records-2026-09.png', result.filename)
  check('exactly one download was triggered', downloads.length === 1, String(downloads.length))
  check('the download is named after the file', downloads[0]?.download === 'payroll-records-2026-09.png', downloads[0]?.download)
  check('the download is a png', downloads[0]?.href === 'blob:fake/image/png', downloads[0]?.href)
  // The revoke is deliberately deferred to a macrotask -- Safari has been seen to
  // abort the download if the URL disappears in the same tick as the click -- so
  // the check has to let a tick pass before looking.
  await new Promise((resolve) => setTimeout(resolve, 0))
  check('the object URL is revoked', revoked.length === 1, JSON.stringify(revoked))
  check('the revoked URL is the one that was handed out', revoked[0] === downloads[0]?.href, `${revoked[0]} vs ${downloads[0]?.href}`)

  // The refusal has to happen before any drawing or file writing.
  const emptyCtx = recordingContext()
  let refused = null
  try {
    await exportPayrollRecordsImage({
      month: '2026-09',
      records: [],
      createCanvas: () => recordingCanvas(emptyCtx),
    })
  } catch (error) {
    refused = error
  }
  check('an empty run is refused', refused instanceof Error)
  check('the refusal explains itself', /no payroll records/i.test(refused?.message || ''), refused?.message)
  check('nothing was drawn for an empty run', emptyCtx.drawn.length === 0, String(emptyCtx.drawn.length))
  check('no file was written for an empty run', downloads.length === 1, String(downloads.length))

  // A canvas that cannot produce a blob must surface, not hang.
  let blobFailure = null
  try {
    await exportPayrollRecordsImage({
      month: '2026-09',
      records: RECORDS,
      createCanvas: () => ({ width: 0, height: 0, getContext: () => recordingContext() }),
    })
  } catch (error) {
    blobFailure = error
  }
  check('a canvas without toBlob is reported', blobFailure instanceof Error, String(blobFailure))
  check('the toBlob failure names the problem', /cannot save/i.test(blobFailure?.message || ''), blobFailure?.message)

  delete globalThis.document
  delete globalThis.URL
}

console.log(`\n${failed ? `${failed} FAILED` : 'All checks passed'}: ${passed} passed, ${failed} failed\n`)
rmSync(OUT, { recursive: true, force: true })
process.exit(failed ? 1 : 0)
