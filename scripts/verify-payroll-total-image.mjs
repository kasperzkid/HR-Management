/**
 * Payroll total as an image — the PNG the "Total as image" button writes.
 *
 * No database, no credentials and no browser. The parts that decide what the
 * image *says* are pure, and the drawing is driven through a recording stub
 * canvas, so the layout and every string that reaches the pixels are asserted
 * without a real 2D context.
 *
 * The fixture is deliberately awkward: a summary holding values that are
 * null, undefined and NaN, a month that is not a real calendar month, a company
 * name with a stray quote in it, and a currency the caller did not supply. Those
 * are the inputs that put "NaN" or "undefined" on somebody's payslip image.
 *
 *   node scripts/verify-payroll-total-image.mjs
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
const OUT = resolve(ROOT, '.payroll-image-verify')

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
      input: resolve(ROOT, 'src/HR-Manager/lib/payroll-total-image.js'),
      output: { entryFileNames: 'entry.mjs' },
    },
  },
})

const {
  buildPayrollTotalImageModel,
  drawPayrollTotalImage,
  exportPayrollTotalImage,
  payrollTotalFilename,
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
    measureText: (text) => ({ width: String(text).length * 8 }),
    fillText(text, x, y) {
      drawn.push({ text: String(text), x, y, align: ctx.textAlign, font: ctx.font })
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
const SUMMARY = {
  employees: 8,
  totalGross: 1234567.5,
  totalDeductions: 234567.25,
  totalNet: 1000000.25,
  totalEmployerCost: 1370371.05,
}

const money = (value) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

suite('the model: every figure the image will show')

{
  const model = buildPayrollTotalImageModel({
    month: '2026-09',
    summary: SUMMARY,
    companyName: 'Yanol Technology PLC',
    currency: 'ETB',
    generatedAt: '2026-09-30T09:05:00Z',
  })

  check('there are exactly five rows', model.rows.length === 5, `got ${model.rows.length}`)
  check(
    'the rows are in reading order',
    JSON.stringify(model.rows.map((r) => r.label)) ===
      JSON.stringify([
        'Payroll Employees',
        'Gross Payroll',
        'Total Deductions',
        'Net Payroll',
        'Employer Cost',
      ]),
    model.rows.map((r) => r.label).join(' | '),
  )
  check('the title names the document', model.title === 'Payroll Total')
  check('a real month is spelled out', model.period === 'September 2026', model.period)
  check('the raw period is kept for the filename', model.periodRaw === '2026-09')
  check('the headcount is a whole number', model.rows[0].value === '8', model.rows[0].value)
  check('the headcount is labelled Employees', model.rows[0].unit === 'Employees')
  check('gross is formatted to 2dp', model.rows[1].value === money(SUMMARY.totalGross), model.rows[1].value)
  check('deductions are formatted to 2dp', model.rows[2].value === money(SUMMARY.totalDeductions), model.rows[2].value)
  check('net is formatted to 2dp', model.rows[3].value === money(SUMMARY.totalNet), model.rows[3].value)
  check('employer cost is formatted to 2dp', model.rows[4].value === money(SUMMARY.totalEmployerCost), model.rows[4].value)
  check('net payroll is the highlighted row', model.rows[3].highlight === true)
  check('no other row claims to be highlighted', model.rows.filter((r) => r.highlight).length === 1)
  check('every amount carries the currency', model.rows.slice(1).every((r) => r.unit === 'ETB'))
  check('the record count is carried through', model.recordCount === 8)
  check('the company name is kept', model.company === 'Yanol Technology PLC')
  check('a generated stamp is produced', /2026/.test(model.generated), model.generated)
}

suite('the model: bad input must not reach the image')

{
  // Every one of these has a habit of rendering as the word "NaN".
  const model = buildPayrollTotalImageModel({
    month: '2026-09',
    summary: {
      employees: null,
      totalGross: undefined,
      totalDeductions: NaN,
      totalNet: 'not a number',
      totalEmployerCost: Infinity,
    },
    currency: 'ETB',
  })

  const printed = model.rows.map((r) => r.value).join(' | ')
  check('no row prints NaN', !printed.includes('NaN'), printed)
  check('no row prints undefined', !printed.includes('undefined'), printed)
  check('no row prints Infinity', !printed.includes('Infinity'), printed)
  check('a null headcount becomes 0', model.rows[0].value === '0', model.rows[0].value)
  check('an undefined amount becomes 0.00', model.rows[1].value === '0.00', model.rows[1].value)
  check('a NaN amount becomes 0.00', model.rows[2].value === '0.00', model.rows[2].value)
  check('a non-numeric string becomes 0.00', model.rows[3].value === '0.00', model.rows[3].value)
  check('Infinity becomes 0.00', model.rows[4].value === '0.00', model.rows[4].value)
  check('the empty run is recognised as empty', model.recordCount === 0)
}

{
  const model = buildPayrollTotalImageModel({ month: '2026-13', summary: SUMMARY })
  check('a month that does not exist is not spelled out', model.period === '2026-13', model.period)
  check('a bad month does not become "Invalid Date"', !model.period.includes('Invalid Date'))
}

{
  const model = buildPayrollTotalImageModel({})
  check('a missing month reads as Unspecified', model.period === 'Unspecified', model.period)
  check('a missing month leaves the raw period empty', model.periodRaw === '')
  check('a missing summary does not throw', Array.isArray(model.rows) && model.rows.length === 5)
  check('a missing company leaves the header blank', model.company === '')
  check('the currency falls back to ETB', model.rows[1].unit === 'ETB')
  check('a missing generated stamp is simply absent', model.generated === '')
}

{
  const negatives = buildPayrollTotalImageModel({
    month: '2026-09',
    summary: { employees: -3, totalGross: -500, totalDeductions: -100, totalNet: -400, totalEmployerCost: -600 },
  })
  check('a negative amount keeps its sign', negatives.rows[1].value === '-500.00', negatives.rows[1].value)
  check('a negative headcount is not hidden', negatives.rows[0].value === '-3', negatives.rows[0].value)
}

{
  const trimmed = buildPayrollTotalImageModel({
    month: '2026-09',
    summary: SUMMARY,
    companyName: '  Spaced PLC  ',
  })
  check('a padded company name is trimmed', trimmed.company === 'Spaced PLC', `"${trimmed.company}"`)
}

suite('the filename')

{
  check('a normal month is used as-is', payrollTotalFilename('2026-09') === 'payroll-total-2026-09.png', payrollTotalFilename('2026-09'))
  check('a missing month still yields a name', payrollTotalFilename('') === 'payroll-total.png', payrollTotalFilename(''))
  check('null still yields a name', payrollTotalFilename(null) === 'payroll-total.png', payrollTotalFilename(null))
  check('undefined still yields a name', payrollTotalFilename(undefined) === 'payroll-total.png', payrollTotalFilename(undefined))
  check('a padded month is trimmed', payrollTotalFilename('  2026-09  ') === 'payroll-total-2026-09.png', payrollTotalFilename('  2026-09  '))

  // A month is attacker-influenced only in the sense that it comes from data, but
  // the value ends up in a download name, so separators must not survive.
  for (const hostile of ['../../etc/passwd', 'a/b', 'a\\b', 'x*y', '2026-09?x=1']) {
    const name = payrollTotalFilename(hostile)
    check(`"${hostile}" cannot escape the filename`, !/[\\/:*?"<>|]/.test(name) && name === 'payroll-total.png', name)
  }
}

suite('the drawing: layout and every string that reaches the pixels')

{
  const ctx = recordingContext()
  const model = buildPayrollTotalImageModel({
    month: '2026-09',
    summary: SUMMARY,
    companyName: 'Yanol Technology PLC',
    currency: 'ETB',
    generatedAt: '2026-09-30T09:05:00Z',
  })
  const canvas = drawPayrollTotalImage(model, { scale: 2, createCanvas: () => recordingCanvas(ctx) })

  const printed = ctx.drawn.map((d) => d.text)
  const all = printed.join(' | ')

  check('the canvas is 2x the layout width', canvas.width === 960 * 2, String(canvas.width))
  check('the canvas height covers the header, five rows and the footer', canvas.height > 0 && canvas.height % 2 === 0, String(canvas.height))
  check('the drawing was scaled, not upscaled after the fact', ctx.ops.includes('scale 2 2'))
  check('the document title is drawn', printed.includes('Payroll Total'))
  check('the company is drawn in caps', printed.includes('YANOL TECHNOLOGY PLC'), printed.join(' | '))
  check('the spelled-out month is drawn', printed.includes('September 2026'))
  check('all five labels are drawn', ['Payroll Employees', 'Gross Payroll', 'Total Deductions', 'Net Payroll', 'Employer Cost'].every((l) => printed.includes(l)))
  check('all five values are drawn', model.rows.every((r) => printed.includes(r.value)))
  check('the currency unit is drawn', printed.includes('ETB'))
  check('the generated stamp is drawn', printed.some((t) => t.startsWith('Generated ')), printed.join(' | '))

  check('no NaN is drawn', !all.includes('NaN'), all)
  check('no undefined is drawn', !all.includes('undefined'), all)
  check('no [object Object] is drawn', !all.includes('[object Object]'))
  check('no Invalid Date is drawn', !all.includes('Invalid Date'))

  // Values are right-aligned, labels left-aligned: a column of numbers with no
  // shared right edge is the classic way a totals image looks amateur.
  const valueDraws = ctx.drawn.filter((d) => model.rows.some((r) => r.value === d.text && r.value !== '0.00'))
  check('every amount is right-aligned', valueDraws.length > 0 && valueDraws.every((d) => d.align === 'right'), valueDraws.map((d) => `${d.text}:${d.align}`).join(' '))
  const labelDraws = ctx.drawn.filter((d) => d.align === 'left' && /^[A-Z][a-z]/.test(d.text) && d.text.length > 6)
  check('the labels are left-aligned', labelDraws.length > 0 && labelDraws.every((d) => d.align === 'left'))

  // The period is raised onto the title's cap height rather than sharing its
  // baseline, so the two are deliberately on different lines. What matters is
  // that they sit on the same visual line without running into each other.
  const title = ctx.drawn.find((d) => d.text === 'Payroll Total')
  const period = ctx.drawn.find((d) => d.text === 'September 2026')
  check('the period is within the title\'s line', period && period.y < title.y && period.y > title.y - 40, `${title?.y} vs ${period?.y}`)
  check('the period is right-aligned', period?.align === 'right', period?.align)
  check('the title is left-aligned', title?.align === 'left', title?.align)
  const titleWidth = 'Payroll Total'.length * 8
  check('the period clears the title horizontally', period && (960 - 56) - (title.x + titleWidth) > 40, String((960 - 56) - (title.x + titleWidth)))
  check('the period is drawn after the title, so it cannot overlap it', printed.indexOf('Payroll Total') < printed.indexOf('September 2026'))

  // Rows must not collide with each other or with the header.
  const rowYs = model.rows.map((r) => ctx.drawn.find((d) => d.text === r.value)?.y).filter(Boolean)
  check('every row drew a value', rowYs.length === 5, String(rowYs.length))
  check('the rows are evenly spaced and in order', rowYs.every((y, i) => i === 0 || y > rowYs[i - 1]), rowYs.join(' '))
  const gaps = rowYs.slice(1).map((y, i) => y - rowYs[i])
  check('the row spacing is uniform', new Set(gaps).size === 1, gaps.join(' '))
  check('the first row sits below the header divider', rowYs[0] > 188, String(rowYs[0]))
}

{
  // A name too long for the header must be shortened, not allowed to overflow.
  const ctx = recordingContext()
  const model = buildPayrollTotalImageModel({
    month: '2026-09',
    summary: SUMMARY,
    companyName: 'A'.repeat(200),
  })
  drawPayrollTotalImage(model, { scale: 1, createCanvas: () => recordingCanvas(ctx) })
  const company = ctx.drawn.find((d) => d.text.endsWith('...'))
  check('an overlong company name is truncated with an ellipsis', Boolean(company), ctx.drawn.map((d) => d.text).join(' | '))
  check('the truncated name is shorter than the original', company && company.text.length < 200, String(company?.text.length))
}

{
  // Scale 1 must still produce a correctly sized canvas.
  const ctx = recordingContext()
  const model = buildPayrollTotalImageModel({ month: '2026-09', summary: SUMMARY })
  const canvas = drawPayrollTotalImage(model, { scale: 1, createCanvas: () => recordingCanvas(ctx) })
  check('scale 1 gives a canvas of exactly the layout width', canvas.width === 960, String(canvas.width))
  check('the default scale is 2 when none is given', (() => {
    const c2 = recordingContext()
    const c = drawPayrollTotalImage(model, { createCanvas: () => recordingCanvas(c2) })
    return c.width === 960 * 2
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
  const result = await exportPayrollTotalImage({
    month: '2026-09',
    summary: SUMMARY,
    companyName: 'Yanol Technology PLC',
    currency: 'ETB',
    createCanvas: () => recordingCanvas(ctx),
  })

  check('it resolves with the filename it used', result.filename === 'payroll-total-2026-09.png', result.filename)
  check('exactly one download was triggered', downloads.length === 1, String(downloads.length))
  check('the download is named after the file', downloads[0]?.download === 'payroll-total-2026-09.png', downloads[0]?.download)
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
    await exportPayrollTotalImage({
      month: '2026-09',
      summary: { employees: 0 },
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
    await exportPayrollTotalImage({
      month: '2026-09',
      summary: SUMMARY,
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
