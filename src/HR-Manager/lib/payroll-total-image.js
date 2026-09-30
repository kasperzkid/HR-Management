import { formatPeriod } from './payslips-export'

/**
 * Renders the payroll run totals to a PNG.
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

const WIDTH = 960
const PADDING = 56
const ROW_HEIGHT = 74
const HEADER_HEIGHT = 188
const FOOTER_HEIGHT = 76

// Anything that is not a finite number is reported as zero rather than as
// "NaN" -- a summary card is not the place to discover a bad row.
function amount(value) {
  const number = Number(value)
  return AMOUNT.format(Number.isFinite(number) ? number : 0)
}

function count(value) {
  const number = Number(value)
  return String(Number.isFinite(number) ? number : 0)
}

/**
 * Everything the image will display, as plain data.
 *
 * Kept separate from the drawing so the wording and the numbers can be asserted
 * on directly, which is the part that would actually be wrong.
 */
export function buildPayrollTotalImageModel({
  month,
  summary = {},
  companyName = '',
  currency = 'ETB',
  generatedAt = null,
} = {}) {
  const rows = [
    { label: 'Payroll Employees', value: count(summary.employees), unit: 'Employees' },
    { label: 'Gross Payroll', value: amount(summary.totalGross), unit: currency },
    { label: 'Total Deductions', value: amount(summary.totalDeductions), unit: currency },
    { label: 'Net Payroll', value: amount(summary.totalNet), unit: currency, highlight: true },
    { label: 'Employer Cost', value: amount(summary.totalEmployerCost), unit: currency },
  ]

  return {
    company: String(companyName || '').trim(),
    title: 'Payroll Total',
    period: formatPeriod(month),
    periodRaw: month == null ? '' : String(month),
    rows,
    recordCount: Number.isFinite(Number(summary.employees)) ? Number(summary.employees) : 0,
    generated: generatedAt ? new Date(generatedAt).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) : '',
  }
}

/** "payroll-total-2026-09.png". Falls back to a bare name for a missing month. */
export function payrollTotalFilename(month) {
  const text = month == null ? '' : String(month).trim()
  const safe = /^[A-Za-z0-9._-]+$/.test(text) ? text : ''
  return `payroll-total${safe ? `-${safe}` : ''}.png`
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

function hairline(ctx, y) {
  ctx.beginPath()
  ctx.moveTo(PADDING, y)
  ctx.lineTo(WIDTH - PADDING, y)
  ctx.lineWidth = 1
  ctx.strokeStyle = '#e2e8f0'
  ctx.stroke()
}

/**
 * Paints the model onto a canvas and returns it.
 *
 * `scale` is the device pixel ratio: a 1x image is legible on screen but soft
 * once it is dropped into a document or a chat.
 */
export function drawPayrollTotalImage(model, { scale = 2, createCanvas } = {}) {
  // The size is assigned below rather than passed in, so the default factory
  // has no use for the dimensions.
  const make = createCanvas || (() => {
    if (typeof document === 'undefined') {
      throw new Error('A canvas is needed to draw the payroll total image.')
    }
    return document.createElement('canvas')
  })

  const height = HEADER_HEIGHT + model.rows.length * ROW_HEIGHT + FOOTER_HEIGHT
  const canvas = make()
  canvas.width = WIDTH * scale
  canvas.height = height * scale

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser could not provide a 2D canvas context.')
  ctx.scale(scale, scale)
  ctx.textBaseline = 'alphabetic'

  // Card
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, 0, 0, WIDTH, height, 24)
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = '#cbd5e1'
  roundRect(ctx, 0.5, 0.5, WIDTH - 1, height - 1, 24)
  ctx.stroke()

  // Accent bar down the left edge
  ctx.fillStyle = '#0092b8'
  roundRect(ctx, 0, 0, 10, height, 24)
  ctx.fill()

  // Header
  let y = 74
  if (model.company) {
    ctx.fillStyle = '#64748b'
    ctx.font = font(700, 15)
    ctx.textAlign = 'left'
    ctx.letterSpacing = '1.5px'
    ctx.fillText(fit(ctx, model.company.toUpperCase(), WIDTH - PADDING * 2 - 90), PADDING, y)
    ctx.letterSpacing = '0px'
    y += 40
  }

  ctx.fillStyle = '#0f172a'
  ctx.font = font(800, 40)
  ctx.textAlign = 'left'
  ctx.fillText(model.title, PADDING, y)

  // Period sits opposite the title, right-aligned. It is raised onto the
  // title's cap height rather than sharing its baseline: 20px text sitting on a
  // 40px baseline reads as though it has fallen to the bottom of the line.
  ctx.fillStyle = '#475569'
  ctx.font = font(600, 20)
  ctx.textAlign = 'right'
  ctx.fillText(fit(ctx, model.period, WIDTH - PADDING * 2 - 260), WIDTH - PADDING, y - 8)

  hairline(ctx, HEADER_HEIGHT - 40)

  // Rows
  model.rows.forEach((row, index) => {
    const top = HEADER_HEIGHT + index * ROW_HEIGHT
    const mid = top + ROW_HEIGHT / 2

    if (row.highlight) {
      ctx.fillStyle = '#f0f9ff'
      ctx.fillRect(PADDING - 16, top + 6, WIDTH - PADDING * 2 + 32, ROW_HEIGHT - 12)
    }

    ctx.fillStyle = '#475569'
    ctx.font = font(600, 19)
    ctx.textAlign = 'left'
    ctx.fillText(fit(ctx, row.label, WIDTH - PADDING * 2 - 300), PADDING, mid + 7)

    ctx.fillStyle = row.highlight ? '#0369a1' : '#0f172a'
    ctx.font = font(800, 30)
    ctx.textAlign = 'right'
    ctx.fillText(row.value, WIDTH - PADDING, mid + 11)

    ctx.fillStyle = '#94a3b8'
    ctx.font = font(600, 14)
    ctx.textAlign = 'left'
    ctx.fillText(row.unit || '', PADDING, mid + 30)

    if (index < model.rows.length - 1) hairline(ctx, top + ROW_HEIGHT)
  })

  // Footer
  if (model.generated) {
    ctx.fillStyle = '#94a3b8'
    ctx.font = font(500, 14)
    ctx.textAlign = 'left'
    ctx.fillText(`Generated ${model.generated}`, PADDING, height - 30)
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
 * "0.00" that looks like a real payroll total is worse than no picture.
 */
export function exportPayrollTotalImage(options = {}) {
  const model = buildPayrollTotalImageModel({
    ...options,
    generatedAt: options.generatedAt ?? new Date(),
  })

  if (!model.recordCount) {
    throw new Error('There are no payroll records for this month to total up.')
  }

  const canvas = drawPayrollTotalImage(model, options)
  const filename = payrollTotalFilename(model.periodRaw)

  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== 'function') {
      reject(new Error('This browser cannot save the payroll total as an image.'))
      return
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('The payroll total image could not be created.'))
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
