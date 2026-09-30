/**
 * Editing an employee's attendance status - the rules, not the UI.
 *
 * No database and no credentials. The decision that matters is what happens to
 * the punch times and hours when HR changes a status, because that is what
 * payroll later reads: get it wrong and somebody is paid for a day they were
 * marked absent, with no error anywhere.
 *
 * The fixture is the awkward case found in the live data: absent days sitting at
 * 850 late minutes because the punch was never cleared.
 *
 *   node scripts/verify-attendance-status.mjs
 */

import {
  EDITABLE_STATUSES,
  attendanceStatusPayload,
  describeStatusChange,
  isAttending,
  normaliseStatus,
  statusFormFrom,
  statusLabel,
} from '../src/HR-Manager/lib/attendance-status.js'

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

const base = { employeeId: '1787', date: '2026-09-25' }

suite('the status vocabulary matches what the page already counts')

{
  const values = EDITABLE_STATUSES.map((s) => s.value)
  check('every status is upper case', values.every((v) => v === v.toUpperCase()), values.join(' '))
  check('there are no duplicates', new Set(values).size === values.length)
  check('present is offered', values.includes('PRESENT'))
  check('absent is offered', values.includes('ABSENT'))
  check('every status has a label', EDITABLE_STATUSES.every((s) => s.label && s.label.length > 1))
  // The list is deliberately just the two that decide whether the employee
  // worked. The finer statuses stay readable but are not offered here.
  check('only Present and Absent are offered', values.length === 2 && values.join(',') === 'PRESENT,ABSENT', values.join(' '))
  check('the leave codes are not offered', !['SL', 'AL', 'ML', 'OL', 'PH', 'WK'].some((v) => values.includes(v)))
  check('the intermediate statuses are not offered', !['LATE', 'CHECKED_IN', 'PENDING_CHECKOUT', 'PENDING_REVIEW'].some((v) => values.includes(v)))
  // "A" is an alias the readers accept; offering it as a choice next to Absent
  // would just be two ways of saying one thing.
  check('the bare "A" alias is not offered as a choice', !values.includes('A'))
  check('"A" still reads as absent', normaliseStatus('A') === 'ABSENT')
}

{
  // Check-in writes "Present"/"Late"; the readers compare upper case.
  check('title case folds to upper case', normaliseStatus('Present') === 'PRESENT')
  check('"Late" folds to upper case', normaliseStatus('Late') === 'LATE')
  check('surrounding space is ignored', normaliseStatus('  absent  ') === 'ABSENT')
  check('a missing status is empty, not PRESENT', normaliseStatus(null) === '' && normaliseStatus(undefined) === '')
  check('"Present" reads as Present', statusLabel('Present') === 'Present')
  check('an unknown status shows as itself', statusLabel('ZZZ') === 'ZZZ')
  check('no record reads as No Record', statusLabel('') === 'No Record')
}

{
  check('Present counts as attending', isAttending('PRESENT'))
  check('Late counts as attending', isAttending('LATE'))
  check('Checked In counts as attending', isAttending('CHECKED_IN'))
  for (const status of ['ABSENT', 'A', 'SL', 'AL', 'ML', 'OL', 'PH', 'WK']) {
    check(`${status} does not count as attending`, !isAttending(status))
  }
}

suite('the headline case: Present to Absent')

{
  const body = attendanceStatusPayload({ ...base, status: 'ABSENT' })
  check('the status is stored upper case', body.status === 'ABSENT', body.status)
  check('the punch is cleared', body.checkIn === '', `"${body.checkIn}"`)
  check('the checkout is cleared', body.checkOut === '', `"${body.checkOut}"`)
  check('regular hours are zeroed', body.regular === 0, String(body.regular))
  check('overtime is zeroed', body.overtime === 0, String(body.overtime))
  check('late minutes are zeroed', body.late === 0, String(body.late))
  check('the employee is identified', body.employeeId === '1787')
  check('the date is kept', body.date === '2026-09-25')
}

{
  // Even if the form still holds a time, marking a day absent must drop it.
  const body = attendanceStatusPayload({
    ...base,
    status: 'ABSENT',
    checkIn: '08:45',
    checkOut: '17:00',
    regular: 8,
    overtime: 2,
  })
  check('a time typed alongside Absent is still dropped', body.checkIn === '' && body.checkOut === '')
  check('hours typed alongside Absent are still dropped', body.regular === 0 && body.overtime === 0)
}

suite('the one non-attending status clears the same way')

{
  // Only Absent is offered now, so it is the only non-attending status a
  // payload can carry. The others stay readable but are refused by the builder.
  for (const status of ['ABSENT']) {
    const body = attendanceStatusPayload({ ...base, status, checkIn: '09:00', checkOut: '17:00', regular: 8, overtime: 1 })
    check(
      `${status} clears the punches and the hours`,
      body.checkIn === '' && body.checkOut === '' && body.regular === 0 && body.overtime === 0 && body.late === 0,
      JSON.stringify(body),
    )
  }

  // The statuses that are no longer offered are refused rather than silently
  // coerced into something payable.
  for (const status of ['SL', 'AL', 'ML', 'OL', 'PH', 'WK', 'LATE', 'CHECKED_IN']) {
    let refused = false
    try {
      attendanceStatusPayload({ ...base, status })
    } catch {
      refused = true
    }
    check(`${status} is refused by the builder`, refused)
  }
}

suite('attending statuses keep what HR entered')

{
  const body = attendanceStatusPayload({
    ...base,
    status: 'PRESENT',
    checkIn: '08:45',
    checkOut: '17:00',
    regular: 8,
    overtime: 1.5,
  })
  check('the check-in survives', body.checkIn === '08:45', body.checkIn)
  check('the check-out survives', body.checkOut === '17:00', body.checkOut)
  check('regular hours survive', body.regular === 8, String(body.regular))
  check('overtime survives', body.overtime === 1.5, String(body.overtime))
  check('late is sent as 0 for the server to recompute', body.late === 0, String(body.late))
}

{
  // Marking a day Present with no punch must not resurrect a stale one.
  const body = attendanceStatusPayload({ ...base, status: 'PRESENT', checkIn: '', checkOut: '', regular: '', overtime: '' })
  check('an empty time stays empty rather than being dropped', body.checkIn === '', `"${body.checkIn}"`)
  check('empty hours become 0, not NaN', body.regular === 0 && body.overtime === 0)
  check('no field is ever NaN', !Object.values(body).some((v) => typeof v === 'number' && !Number.isFinite(v)))
}

{
  const body = attendanceStatusPayload({ ...base, status: 'PRESENT', checkIn: '9:5', checkOut: '17:00:31', regular: '7.256', overtime: -3 })
  check('a single-digit hour is padded', body.checkIn === '09:05', body.checkIn)
  check('seconds are trimmed off the checkout', body.checkOut === '17:00', body.checkOut)
  check('hours are rounded to 2dp', body.regular === 7.26, String(body.regular))
  check('negative hours are refused', body.overtime === 0, String(body.overtime))
  // An impossible time is not a time. Writing "99:99" would be worse than
  // leaving the day with no punch.
  check('an out-of-range hour is dropped', attendanceStatusPayload({ ...base, status: 'PRESENT', checkIn: '99:99' }).checkIn === '')
  check('an out-of-range minute is dropped', attendanceStatusPayload({ ...base, status: 'PRESENT', checkIn: '10:75' }).checkIn === '')
  check('free text is dropped', attendanceStatusPayload({ ...base, status: 'PRESENT', checkIn: 'morning' }).checkIn === '')
  check('a valid hour survives alongside a bad minute being dropped', attendanceStatusPayload({ ...base, status: 'PRESENT', checkIn: '23:59' }).checkIn === '23:59')
}

{
  // The server merges with "data.x ?? current.x", so an omitted field keeps its
  // old value. Every field must therefore always be present in the body.
  const body = attendanceStatusPayload({ ...base, status: 'ABSENT' })
  const required = ['employeeId', 'date', 'status', 'checkIn', 'checkOut', 'regular', 'overtime', 'late']
  check('every mergeable field is present in the body', required.every((k) => k in body), required.filter((k) => !(k in body)).join(' '))
  check('no field is left undefined', !Object.values(body).includes(undefined))
  check('the body is JSON-safe', (() => { try { JSON.parse(JSON.stringify(body)); return true } catch { return false } })())
}

suite('refusals')

{
  const attempt = (input, pattern) => {
    try {
      attendanceStatusPayload({ ...base, ...input })
      return null
    } catch (error) {
      return pattern.test(error.message) ? error : new Error(`wrong message: ${error.message}`)
    }
  }
  check('a missing employee is refused', /employee/i.test(attempt({ employeeId: '' }, /employee/i)?.message || ''))
  check('a missing date is refused', /date/i.test(attempt({ date: '' }, /date/i)?.message || ''))
  check('a missing status is refused', /status/i.test(attempt({ status: '' }, /status/i)?.message || ''))
  check('a null status is refused', attempt({ status: null }, /status/i) instanceof Error)
  const unknown = attempt({ status: 'TELEPORTED' }, /not a status/i)
  check('a status the page cannot set is refused', unknown instanceof Error, unknown?.message)
  // A rejected status must not be silently coerced into something payable.
  check('the refused call produced no payload', unknown === null || unknown instanceof Error)
}

suite('seeding the form from a stored record')

{
  const seeded = statusFormFrom({ status: 'present', checkIn: '08:45:12', checkOut: '17:00', regular: 8, overtime: 1.5 })
  check('the stored status is normalised for the form', seeded.status === 'PRESENT', seeded.status)
  check('seconds are stripped from the seeded time', seeded.checkIn === '08:45', seeded.checkIn)
  check('the checkout is seeded', seeded.checkOut === '17:00')
  check('regular hours are seeded', seeded.regular === '8', seeded.regular)
  check('overtime is seeded', seeded.overtime === '1.5', seeded.overtime)
}

{
  const blank = statusFormFrom(null)
  check('a day with no record defaults to Present', blank.status === 'PRESENT', blank.status)
  check('a day with no record has no times', blank.checkIn === '' && blank.checkOut === '')
  check('a day with no record has blank hours, not "0"', blank.regular === '' && blank.overtime === '')
  check('a "null" string in the data is treated as no time', statusFormFrom({ checkIn: 'null' }).checkIn === '')
  check('an undefined time is treated as no time', statusFormFrom({ checkIn: undefined }).checkIn === '')
}

suite('the confirmation wording')

{
  check('a change is described as from-to', describeStatusChange('PRESENT', 'ABSENT') === 'Present to Absent', describeStatusChange('PRESENT', 'ABSENT'))
  check('an untouched status says so', describeStatusChange('ABSENT', 'ABSENT') === 'Absent (unchanged)', describeStatusChange('ABSENT', 'ABSENT'))
  check('a new record says "set to"', describeStatusChange('', 'ABSENT') === 'set to Absent', describeStatusChange('', 'ABSENT'))
  check('a day with no record does not say "No Record to X"', !describeStatusChange(null, 'ABSENT').includes('No Record'), describeStatusChange(null, 'ABSENT'))
  check('the change reads correctly from a title-case source', describeStatusChange('Present', 'Absent') === 'Present to Absent', describeStatusChange('Present', 'Absent'))
}

console.log(`\n${failed ? `${failed} FAILED` : 'All checks passed'}: ${passed} passed, ${failed} failed\n`)
process.exit(failed ? 1 : 0)
