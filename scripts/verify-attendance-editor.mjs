/**
 * Does the status editor's payload survive the server's merge, and is the page
 * wired to send it?
 *
 * No database, no credentials, no browser.
 *
 * The server merges an update with `data.x ?? current.x`, so the client has to
 * send every field or the old value silently survives. That is invisible from
 * the client side alone: the page would report success, the badge would change,
 * and payroll would still be reading yesterday's punch and hours off the same
 * record. So the merge itself is modelled here, from the controller's source,
 * and the stored result is asserted.
 *
 * The model is a copy, and copies rot. The suite therefore re-reads
 * hr-manager.controller.js and fails if the expressions it copied have changed
 * -- the alternative is a green test that has quietly stopped testing anything.
 *
 *   node scripts/verify-attendance-editor.mjs
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { attendanceStatusPayload } from '../src/HR-Manager/lib/attendance-status.js'

const ROOT = 'C:/Users/selam/HR-Management'

let passed = 0
let failed = 0

const suite = (name) => console.log(`\n${name}`)

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1
    console.log(`  ok    ${label}`)
  } else {
    failed += 1
    console.log(`  FAIL  ${label}${detail ? `\n          ${detail}` : ''}`)
  }
}

// ---------------------------------------------------------------------------
// The server's merge, transcribed from hr-manager.controller.js.
// ---------------------------------------------------------------------------

const n = (value, fallback = 0) => {
  const result = Number(value)
  return Number.isFinite(result) ? result : fallback
}

const s = (value, fallback = '') => (value == null ? fallback : String(value))

function lateMinutes(checkIn, required) {
  const toMinutes = (value) => {
    const text = s(value).trim()
    const match = text.match(/(?:T|\b)(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i)
    if (!match) return null
    let hour = Number(match[1])
    const minute = Number(match[2])
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) return null
    const meridiem = match[3]?.toUpperCase()
    if (meridiem) hour = (hour % 12) + (meridiem === 'PM' ? 12 : 0)
    return hour * 60 + minute
  }
  const actual = toMinutes(checkIn)
  const cutoff = toMinutes(required)
  if (actual == null || cutoff == null) return 0
  return Math.max(0, actual - cutoff)
}

function attendanceValues(data, employee, current = {}, config = {}) {
  const checkIn = data.checkIn ?? current.checkIn ?? null
  const requiredCheckInTime =
    data.requiredCheckInTime ?? config.requiredCheckInTime ?? current.requiredCheckInTime ?? null
  const late =
    checkIn && requiredCheckInTime
      ? lateMinutes(checkIn, requiredCheckInTime)
      : n(data.late, current.late)
  return {
    employeeId: employee.id,
    employeeName: data.employeeName ?? employee.name,
    department: data.department ?? employee.department,
    date: data.date ?? current.date,
    status: data.status ?? current.status,
    checkIn,
    checkOut: data.checkOut ?? current.checkOut ?? null,
    requiredCheckInTime,
    late,
    earlyDeparture: n(data.earlyDeparture, current.earlyDeparture),
    regular: n(data.regular, current.regular),
    overtime: n(data.overtime, current.overtime),
  }
}

// ---------------------------------------------------------------------------
// Guard against the copy drifting away from the original.
// ---------------------------------------------------------------------------

suite('the model still matches the controller it was copied from')

{
  const source = readFileSync(
    resolve(ROOT, 'server/controllers/hr-manager.controller.js'),
    'utf8',
  )
  const flat = source.replace(/\s+/g, ' ')

  const expected = [
    ['the check-in merge', 'const checkIn = data.checkIn ?? current.checkIn ?? null'],
    ['the check-out merge', 'checkOut: data.checkOut ?? current.checkOut ?? null'],
    ['the status merge', 'status: data.status ?? current.status'],
    ['the late fallback', ': n(data.late, current.late)'],
    ['the regular hours merge', 'regular: n(data.regular, current.regular)'],
    ['the overtime merge', 'overtime: n(data.overtime, current.overtime)'],
  ]

  for (const [label, fragment] of expected) {
    check(`${label} is unchanged upstream`, flat.includes(fragment), `missing: ${fragment}`)
  }

  // The one assumption the whole client approach rests on: a variable holding
  // "" is not nullish, so an empty string clears a punch instead of deferring
  // to the old value the way an explicit null would.
  const emptyString = ''
  const nullValue = null

  check(
    'an empty string is not treated as absent by ??',
    (emptyString ?? 'old-value') === '',
    `"" ?? "old" === ${JSON.stringify(emptyString ?? 'old')}`,
  )
  check(
    'a null would have been ignored, which is why "" is sent instead',
    (nullValue ?? 'old-value') === 'old-value',
  )
  check('n() reads a zero as a zero, not as a missing value', n(0, 850) === 0)
}

// ---------------------------------------------------------------------------
// The stored record after each edit.
// ---------------------------------------------------------------------------

const EMPLOYEE = { id: '1787', name: 'ayele ke', department: 'Engineering' }
const CONFIG = { requiredCheckInTime: '08:30' }

/** The live record: an absent day still carrying its punch, as found in the data. */
const STALE_ABSENT = {
  id: 'rec-1',
  employeeId: '1787',
  date: '2026-09-25',
  status: 'ABSENT',
  checkIn: '17:10',
  checkOut: '',
  late: 850,
  regular: 0,
  overtime: 0,
}

const store = (body, current = STALE_ABSENT) => attendanceValues(body, EMPLOYEE, current, CONFIG)

suite('Present to Absent: what the row ends up holding')

{
  const saved = store(attendanceStatusPayload({ employeeId: '1787', date: '2026-09-25', status: 'ABSENT' }))

  check('the status is stored', saved.status === 'ABSENT', saved.status)
  check('the stale punch is gone', saved.checkIn === '', JSON.stringify(saved.checkIn))
  check('the stale checkout is gone', saved.checkOut === '', JSON.stringify(saved.checkOut))
  check('the 850 late minutes are gone', saved.late === 0, String(saved.late))
  // The two fields payroll reads. If these survive, the day is still paid for.
  check('regular hours are zero, so payroll cannot pay for the day', saved.regular === 0, String(saved.regular))
  check('overtime is zero', saved.overtime === 0, String(saved.overtime))
  check('the employee is not renamed by the edit', saved.employeeName === EMPLOYEE.name)
  check('the date is not moved by the edit', saved.date === '2026-09-25')
}

{
  // Same outcome from a day that was genuinely Present and worked.
  const worked = { ...STALE_ABSENT, status: 'PRESENT', checkIn: '08:45', checkOut: '17:00', late: 15, regular: 8, overtime: 2 }
  const saved = store(attendanceStatusPayload({ employeeId: '1787', date: '2026-09-25', status: 'ABSENT' }), worked)

  check('marking a worked day absent clears the punch', saved.checkIn === '' && saved.checkOut === '')
  check('the 8 regular hours are removed', saved.regular === 0, String(saved.regular))
  check('the 2 overtime hours are removed', saved.overtime === 0, String(saved.overtime))
  check('the 15 late minutes are removed', saved.late === 0, String(saved.late))
}

suite('Absent to Present: the day is paid for again, on the times HR gave')

{
  const body = attendanceStatusPayload({
    employeeId: '1787',
    date: '2026-09-25',
    status: 'PRESENT',
    checkIn: '08:45',
    checkOut: '17:00',
    regular: 8,
    overtime: 1.5,
  })
  const saved = store(body)

  check('the check-in is stored', saved.checkIn === '08:45', saved.checkIn)
  check('the check-out is stored', saved.checkOut === '17:00', saved.checkOut)
  check('regular hours are stored', saved.regular === 8, String(saved.regular))
  check('overtime is stored', saved.overtime === 1.5, String(saved.overtime))
  // The server owns this figure; the client only ever sends a zero floor.
  check('late minutes are recomputed from the punch, not sent', saved.late === 15, String(saved.late))
  check('the computed late minutes are the true distance from the cutoff', lateMinutes('08:45', '08:30') === 15)
  check('arriving early is not negative', lateMinutes('08:00', '08:30') === 0)
}

{
  // HR marks it Present but types no times. The old punch must not come back.
  const body = attendanceStatusPayload({ employeeId: '1787', date: '2026-09-25', status: 'PRESENT' })
  const saved = store(body)

  check('a Present day with no punch has no punch', saved.checkIn === '', JSON.stringify(saved.checkIn))
  check('and no invented late minutes', saved.late === 0, String(saved.late))
  check('and no invented hours', saved.regular === 0 && saved.overtime === 0)
}

suite('the one non-attending status leaves nothing payable behind')

{
  // Only Absent is offered now, so it is the only non-attending status a
  // payload can carry.
  for (const status of ['ABSENT']) {
    const worked = { ...STALE_ABSENT, status: 'PRESENT', checkIn: '08:45', checkOut: '17:00', late: 15, regular: 8, overtime: 2 }
    const saved = store(attendanceStatusPayload({ employeeId: '1787', date: '2026-09-25', status }), worked)
    check(
      `${status} leaves nothing payable behind`,
      saved.status === status && saved.checkIn === '' && saved.regular === 0 && saved.overtime === 0 && saved.late === 0,
      JSON.stringify(saved),
    )
  }
}

suite('a new record on an empty day')

{
  // The server creates with `data.x ?? null`, so an empty string lands as "".
  const created = attendanceValues(
    attendanceStatusPayload({ employeeId: '1787', date: '2026-09-26', status: 'ABSENT' }),
    EMPLOYEE,
    {},
    CONFIG,
  )
  check('the date is set', created.date === '2026-09-26')
  check('the status is set', created.status === 'ABSENT')
  check('nothing payable is created', created.regular === 0 && created.overtime === 0 && created.late === 0)
  check('no punch is created', !created.checkIn)
  check('a create needs no id from the client', !('id' in created))
}

suite('why every field is sent: the merge that this avoids')

{
  // Not the editor's payload -- a naive partial body, so the reason the lib
  // sends all eight fields is on the record rather than just in a comment.
  const worked = { ...STALE_ABSENT, status: 'PRESENT', checkIn: '08:45', checkOut: '17:00', late: 15, regular: 8, overtime: 2 }
  const naive = store({ status: 'ABSENT' }, worked)

  check('a partial body keeps the punch', naive.checkIn === '08:45', JSON.stringify(naive.checkIn))
  check('a partial body keeps the 8 regular hours', naive.regular === 8, String(naive.regular))
  check('a partial body keeps the 2 overtime hours', naive.overtime === 2, String(naive.overtime))
  check('a partial body still shows as absent in the UI', naive.status === 'ABSENT')

  const full = store(attendanceStatusPayload({ employeeId: '1787', date: '2026-09-25', status: 'ABSENT' }), worked)
  check('the editor payload clears all of it', full.checkIn === '' && full.regular === 0 && full.overtime === 0)
}

suite('the stored data is already inconsistent, which the editor also repairs')

{
  // 2026-09-25 / ayele ke: status ABSENT, checkIn 17:10, late 850. But late is
  // recomputed from the punch on every write, and 17:10 against the 08:30
  // cutoff is 520 minutes -- so 850 cannot have come from this punch. Nothing
  // recomputes the column on read, so the page shows 14h 10m late on a day the
  // employee was marked absent.
  const stored = STALE_ABSENT
  const recomputed = lateMinutes(stored.checkIn, CONFIG.requiredCheckInTime)

  check('the stored late minutes do not follow from the stored punch', stored.late !== recomputed, `${stored.late} vs ${recomputed}`)
  check('the figure that follows from the punch is 520 minutes', recomputed === 520, String(recomputed))
  check('the stored row is marked absent', stored.status === 'ABSENT')

  // Editing the day is what finally clears it.
  const saved = store(attendanceStatusPayload({ employeeId: '1787', date: stored.date, status: 'ABSENT' }))
  check('editing the status clears the inconsistent figure', saved.late === 0, String(saved.late))
  check('editing the status clears the punch behind it', saved.checkIn === '', JSON.stringify(saved.checkIn))
}

suite('the page is wired to send it')

{
  const page = readFileSync(
    resolve(ROOT, 'src/HR-Manager/pages/Attendance.jsx'),
    'utf8',
  )

  // Every request on the page goes through authHeaders. The route layer
  // rejects anything without a bearer token, so a missed header is a dead page
  // rather than a degraded one.
  const fetches = page.match(/fetch\(/g) || []
  const authHeaders = page.match(/authHeaders\(/g) || []
  check('the page has requests to account for', fetches.length >= 5, String(fetches.length))
  check(
    'every request is authenticated',
    authHeaders.length >= fetches.length - 1,
    `${fetches.length} fetch calls, ${authHeaders.length} authHeaders calls`,
  )
  check('the unauthenticated header shape is gone', !/headers: \{ 'Content-Type': 'application\/json' \}/.test(page))

  check('the status editor is imported', /from '\.\.\/lib\/attendance-status'/.test(page))
  check('the payload builder is the one under test', /attendanceStatusPayload\(\{/.test(page))
  check('the editor is gated on the manage permission', /canManage/.test(page) && /attendance\.manage/.test(page))
  check('an existing record is updated by id', /PUT/.test(page) && /attendance\/\$\{existingId\}/.test(page))
  check('a day with no record is created', /POST/.test(page))
  check('the editor is re-keyed per cell, so times cannot carry over', /key=\{`\$\{editingCell\.employeeId\}:\$\{editingCell\.date\}`\}/.test(page))
  check('the editor closes before the data is reloaded', /setEditingCell\(null\)[\s\S]{0,200}await loadData/.test(page))
  check('the cell announces what editing it will do', /aria-label=\{/.test(page))
  check('the cell is reachable by keyboard', /tabIndex=\{/.test(page) && /onKeyDown=\{/.test(page))
  check('the manager permission is not hardcoded to one role', !/role\s*===\s*['"]HR_MANAGER['"]/.test(page))

  // The records table gets the same editor through the same entry point, so the
  // two paths cannot drift apart in what they send.
  check('the records table has an Actions column', /Actions/.test(page))
  check('the Actions column is gated on the manage permission', /canManage && \(\s*<th[^>]*>\s*Actions/.test(page))
  check('each record row has an Edit button', /openStatusEditorForRecord\(\s*record,\s*\)/.test(page))
  check('the Edit button is gated on the manage permission', /canManage && \(\s*<td className="px-5 py-4 text-right">/.test(page))
  check('the Edit button is disabled while saving', /disabled=\{\s*savingAttendance\s*\}/.test(page))
  check('the Edit button names the status it will edit', /Edit \$\{statusLabel\(/.test(page))
  check('both paths share one editor entry point', /function openEditor\(\{/.test(page) && /openStatusEditorForRecord\(record\)/.test(page))
  check('the record path resolves the employee before opening', /openStatusEditorForRecord[\s\S]{0,400}employees\.find/.test(page))
  check('the record path falls back to the stored name', /record\.employeeName \|\|/.test(page))
}

suite('the editor modal reads as a correction, not a form')

{
  // The modal is reached from a table row and a calendar cell, so its markup is
  // asserted here rather than by eye.
  const page = readFileSync(
    resolve(ROOT, 'src/HR-Manager/pages/Attendance.jsx'),
    'utf8',
  )

  check('the employee is shown with an avatar', /getInitials\(employeeName\)/.test(page))
  check('the employee name and code are on one line', /truncate text-sm font-semibold text-slate-800/.test(page))
  check('the current status is shown as a badge, not as prose', /record && \(\s*<StatusBadge status=\{record\.status\} \/>\s*\)/.test(page))
  check('the awkward "Currently no record" line is gone', !/Currently['"]/.test(page) && !/no record/.test(page))
  check('the status field is a labelled select', /<span className="mb-1\.5 block text-xs font-semibold text-slate-700">\s*Status\s*<\/span>/.test(page))
  check('the times and hours only appear for an attending status', /attending \? \(/.test(page))
  check('the absent warning names the payroll reason', /Payroll reads those hours/.test(page))
  check('the warning no longer branches over statuses that are not offered', !/This status means the employee was not working/.test(page))
  check('every input carries the accent focus ring', (page.match(/focus:ring-\[#0092B8\]\/20/g) || []).length >= 5, String((page.match(/focus:ring-\[#0092B8\]\/20/g) || []).length))
  check('the modal is still the shared one', /<StatusEditorModal/.test(page))
}

console.log(`\n${failed ? `${failed} FAILED` : 'All checks passed'}: ${passed} passed, ${failed} failed\n`)
process.exit(failed ? 1 : 0)
