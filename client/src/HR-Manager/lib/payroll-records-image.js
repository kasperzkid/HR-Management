import { formatPeriod } from './payslips-export'

/**
 * Renders the payroll records table to a PNG.
 *
 * Deliberately not a screenshot of the DOM. html2canvas/dom-to-image are not
 * installed, and the SVG foreignObject trick both taints the canvas and drops
 * web fonts, so a payroll figure would come out in Times New Roman. Drawing it
 * directly means the numbers are laid out by us, render identically on every
 * machine, and work with no network.
 *
 * The canvas work is kept separate from the model so the parts that decide what
 * the image *says* can be checked without a browser.
 */

const AMOUNT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

const PADDING = 48
const HEADER_HEIGHT = 158
const TABLE_HEADER_HEIGHT = 46
const ROW_HEIGHT = 42
const TOTAL_ROW_HEIGHT = 50
const FOOTER_HEIGHT = 72

/**
 * The columns, in the order the table shows them.
 *
 * The index and the row's edit action are left out: one is a position the image
 * has no use for, the other is a button. Everything else the table displays is
 * here, so the image is the table rather than a summary of it.
 */
const COLUMNS = [
  { key: 'employee', label: 'Employee', align: 'left', width: 170, type: 'text' },
  { key: 'department', label: 'Department', align: 'left', width: 116, type: 'text' },
  { key: 'basic', label: 'Basic', align: 'right', width: 96, type: 'money' },
  { key: 'allowances', label: 'Allowances', align: 'right', width: 100, type: 'money' },
  { key: 'ot', label: 'OT Hours', align: 'right', width: 102, type: 'hours' },
  { key: 'gross', label: 'Gross', align: 'right', width: 98, type: 'money' },
  { key: 'pension', label: 'Pension', align: 'right', width: 90, type: 'money' },
  { key: 'tax', label: 'Tax', align: 'right', width: 90, type: 'money' },
  { key: 'deductions', label: 'Deductions', align: 'right', width: 100, type: 'money' },
  { key: 'net', label: 'Net Salary', align: 'right', width: 100, type: 'money', highlight: true },
  { key: 'employerCost', label: 'Employer Cost', align: 'right', width: 134, type: 'money' },
  { key: 'status', label: 'Status', align: 'left', width: 108, type: 'text' },
]

// Anything that is not a finite number is reported as zero rather than as
// "NaN" -- a payroll table is not the place to discover a bad row.
function amount(value) {
  const number = Number(value)
  return AMOUNT.format(Number.isFinite(number) ? number : 0)
}

function hours(value) {
  const number = Number(value)
  return (Number.isFinite(number) ? number : 0).toFixed(2)
}

function sum(records, pick) {
  return records.reduce((total, record) => {
    const value = Number(pick(record))
    return total + (Number.isFinite(value) ? value : 0)
  }, 0)
}

function text(value, fallback = '—') {
  const result = String(value ?? '').trim()
  return result || fallback
}

/**
 * Everything the image will display, as plain data.
 *
 * Kept separate from the drawing so the wording and the numbers can be asserted
 * on directly, which is the part that would actually be wrong.
 */
export function buildPayrollRecordsImageModel({
  month,
  records = [],
  companyName = '',
  currency = 'ETB',
  generatedAt = null,
} = {}) {
  const rows = records.map((record) => {
    const employee = record.employee || {}
    const allowanceTotal =
      Number(record.transportAllowance || 0) +
      Number(record.housingAllowance || 0) +
      Number(record.mealAllowance || 0) +
      Number(record.otherAllowance || 0)

    return {
      employee: text(employee.name || record.employeeName),
      department: text(employee.department || record.department),
      basic: amount(record.basicSalary),
      allowances: amount(allowanceTotal),
      ot: hours(record.attendanceSummary?.overtimeHours || 0),
      gross: amount(record.grossSalary),
      pension: amount(record.pensionDeduction),
      tax: amount(record.incomeTax),
      deductions: amount(record.totalDeductions),
      net: amount(record.netSalary),
      employerCost: amount(record.employerCost),
      // The table's status column reads "Saved" for every row, so the image
      // matches it rather than showing a dash for a field the table does not
      // treat as data.
      status: text(record.status, 'Saved'),
    }
  })

  const totals = {
    employee: 'Total',
    department: '',
    basic: amount(sum(records, (r) => r.basicSalary)),
    allowances: amount(sum(records, (r) => Number(r.transportAllowance || 0) + Number(r.housingAllowance || 0) + Number(r.mealAllowance || 0) + Number(r.otherAllowance || 0))),
    ot: hours(sum(records, (r) => r.attendanceSummary?.overtimeHours || 0)),
    gross: amount(sum(records, (r) => r.grossSalary)),
    pension: amount(sum(records, (r) => r.pensionDeduction)),
    tax: amount(sum(records, (r) => r.incomeTax)),
    deductions: amount(sum(records, (r) => r.totalDeductions)),
    net: amount(sum(records, (r) => r.netSalary)),
    employerCost: amount(sum(records, (r) => r.employerCost)),
    status: '',
  }

  return {
    company: String(companyName || '').trim(),
    title: 'Payroll Records',
    period: formatPeriod(month),
    periodRaw: month == null ? '' : String(month),
    currency: String(currency || 'ETB'),
    columns: COLUMNS.map(({ key, label, align, width, type, highlight }) => ({
      key,
      label,
      align,
      width,
      type,
      highlight: Boolean(highlight),
    })),
    rows,
    totals,
    recordCount: records.length,
    generated: generatedAt ? new Date(generatedAt).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) : '',
  }
}

/** "payroll-records-2026-09.png". Falls back to a bare name for a missing month. */
export function payrollRecordsFilename(month) {
  const text = month == null ? '' : String(month).trim()
  const safe = /^[A-Za-z0-9._-]+$/.test(text) ? text : ''
  return `payroll-records${safe ? `-${safe}` : ''}.png`
}

/** Canvas needs a font string, and a stray quote in a family name breaks it. */
function font(weight, size) {
  return `${weight} ${size}px ${FONT}`
}

/** Trim to fit rather than let a long name run off the edge of the image. */
function fit(ctx, text, maxWidth) {
  const value = String(text ?? '')
  if (ctx.measureText(value).width <= maxWidth) return value

  let low = 0
  let high = value.length
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (ctx.measureText(`${value.slice(0, mid)}...`).width <= maxWidth) low = mid
    else high = mid - 1
  }
  return `${value.slice(0, low)}...`
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r)
    return
  }
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function hairline(ctx, y, width) {
  ctx.beginPath()
  ctx.moveTo(PADDING, y)
  ctx.lineTo(width - PADDING, y)
  ctx.lineWidth = 1
  ctx.strokeStyle = '#e2e8f0'
  ctx.stroke()
}

/** The x offset of each column's left edge, and the text inset within a cell. */
function columnLayout(columns) {
  const xs = []
  let cursor = PADDING
  for (const column of columns) {
    xs.push(cursor)
    cursor += column.width
  }
  return { xs, tableWidth: cursor - PADDING }
}

function drawCell(ctx, value, column, x, mid) {
  const inset = 12
  const tx = column.align === 'right' ? x + column.width - inset : x + inset
  ctx.textAlign = column.align === 'right' ? 'right' : 'left'
  ctx.fillText(fit(ctx, String(value), column.width - inset * 2), tx, mid)
}

/**
 * Paints the model onto a canvas and returns it.
 *
 * `scale` is the device pixel ratio: a 1x image is legible on screen but soft
 * once it is dropped into a document or a chat.
 */
export function drawPayrollRecordsImage(model, { scale = 2, createCanvas } = {}) {
  // The size is assigned below rather than passed in, so the default factory
  // has no use for the dimensions.
  const make = createCanvas || (() => {
    if (typeof document === 'undefined') {
      throw new Error('A canvas is needed to draw the payroll records image.')
    }
    return document.createElement('canvas')
  })

  const { xs, tableWidth } = columnLayout(model.columns)
  const width = tableWidth + PADDING * 2
  const height =
    HEADER_HEIGHT +
    TABLE_HEADER_HEIGHT +
    model.rows.length * ROW_HEIGHT +
    TOTAL_ROW_HEIGHT +
    FOOTER_HEIGHT

  const canvas = make()
  canvas.width = width * scale
  canvas.height = height * scale

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser could not provide a 2D canvas context.')
  ctx.scale(scale, scale)
  ctx.textBaseline = 'alphabetic'

  // Card
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, 0, 0, width, height, 24)
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = '#cbd5e1'
  roundRect(ctx, 0.5, 0.5, width - 1, height - 1, 24)
  ctx.stroke()

  // Accent bar down the left edge
  ctx.fillStyle = '#0092b8'
  roundRect(ctx, 0, 0, 10, height, 24)
  ctx.fill()

  // Header
  let y = 62
  if (model.company) {
    ctx.fillStyle = '#64748b'
    ctx.font = font(700, 15)
    ctx.textAlign = 'left'
    ctx.letterSpacing = '1.5px'
    ctx.fillText(fit(ctx, model.company.toUpperCase(), width - PADDING * 2 - 90), PADDING, y)
    ctx.letterSpacing = '0px'
    y += 38
  }

  ctx.fillStyle = '#0f172a'
  ctx.font = font(800, 36)
  ctx.textAlign = 'left'
  ctx.fillText(model.title, PADDING, y)

  // Period sits opposite the title, right-aligned. It is raised onto the
  // title's cap height rather than sharing its baseline: 19px text sitting on a
  // 36px baseline reads as though it has fallen to the bottom of the line.
  ctx.fillStyle = '#475569'
  ctx.font = font(600, 19)
  ctx.textAlign = 'right'
  ctx.fillText(fit(ctx, model.period, width - PADDING * 2 - 220), width - PADDING, y - 6)

  // The currency is named once here rather than repeated under every figure,
  // which would be noise across twelve columns.
  ctx.fillStyle = '#94a3b8'
  ctx.font = font(500, 13)
  ctx.textAlign = 'right'
  ctx.fillText(`All amounts in ${model.currency}`, width - PADDING, y + 24)

  hairline(ctx, HEADER_HEIGHT - 34, width)

  // Table header
  const tableTop = HEADER_HEIGHT
  ctx.fillStyle = '#f1f5f9'
  ctx.fillRect(PADDING - 12, tableTop, tableWidth + 24, TABLE_HEADER_HEIGHT)

  model.columns.forEach((column, index) => {
    ctx.fillStyle = column.highlight ? '#0369a1' : '#64748b'
    ctx.font = font(700, 12)
    drawCell(ctx, column.label, column, xs[index], tableTop + TABLE_HEADER_HEIGHT / 2 + 4)
  })

  hairline(ctx, tableTop + TABLE_HEADER_HEIGHT, width)

  // Rows. Zebra striping keeps a long table readable.
  model.rows.forEach((row, index) => {
    const top = tableTop + TABLE_HEADER_HEIGHT + index * ROW_HEIGHT
    const mid = top + ROW_HEIGHT / 2

    if (index % 2 === 1) {
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(PADDING - 12, top, tableWidth + 24, ROW_HEIGHT)
    }

    model.columns.forEach((column, colIndex) => {
      const value = row[column.key]
      if (value == null || value === '') return

      ctx.fillStyle = column.highlight ? '#0369a1' : '#0f172a'
      ctx.font = column.highlight ? font(700, 13) : font(500, 13)
      drawCell(ctx, value, column, xs[colIndex], mid + 5)
    })

    hairline(ctx, top + ROW_HEIGHT, width)
  })

  // Totals row, set off by a heavier accent rule so it does not read as one
  // more employee.
  const totalTop = tableTop + TABLE_HEADER_HEIGHT + model.rows.length * ROW_HEIGHT
  ctx.fillStyle = '#f0f9ff'
  ctx.fillRect(PADDING - 12, totalTop, tableWidth + 24, TOTAL_ROW_HEIGHT)

  ctx.beginPath()
  ctx.moveTo(PADDING, totalTop)
  ctx.lineTo(width - PADDING, totalTop)
  ctx.lineWidth = 2
  ctx.strokeStyle = '#0092b8'
  ctx.stroke()

  const totalMid = totalTop + TOTAL_ROW_HEIGHT / 2
  model.columns.forEach((column, index) => {
    const value = model.totals[column.key]
    if (value == null || value === '') return

    ctx.fillStyle = column.highlight ? '#0369a1' : '#0f172a'
    ctx.font = font(700, 13)
    drawCell(ctx, value, column, xs[index], totalMid + 5)
  })

  // Footer
  if (model.generated) {
    ctx.fillStyle = '#94a3b8'
    ctx.font = font(500, 13)
    ctx.textAlign = 'left'
    ctx.fillText(`Generated ${model.generated}`, PADDING, height - 28)
  }

  return canvas
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoked on the next tick: Safari has been seen to abort the download if the
  // URL disappears synchronously after click().
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Builds the image and hands it to the browser as a download.
 *
 * Refuses an empty run rather than writing a file full of zeros -- a picture of
 * "0.00" that looks like a real payroll table is worse than no picture.
 */
export function exportPayrollRecordsImage(options = {}) {
  const model = buildPayrollRecordsImageModel({
    ...options,
    generatedAt: options.generatedAt ?? new Date(),
  })

  if (!model.recordCount) {
    throw new Error('There are no payroll records for this month to export.')
  }

  const canvas = drawPayrollRecordsImage(model, options)
  const filename = payrollRecordsFilename(model.periodRaw)

  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== 'function') {
      reject(new Error('This browser cannot save the payroll records as an image.'))
      return
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('The payroll records image could not be created.'))
        return
      }
      try {
        triggerDownload(blob, filename)
        resolve({ filename, model })
      } catch (error) {
        reject(error)
      }
    }, 'image/png')
  })
}
