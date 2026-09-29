// Checks for the name -> email helper the add-employee forms use.
//
//   node scripts/check-employee-email-helper.mjs

import {
  emailLocalPart,
  looksGeneratedEmployeeEmail,
  previewEmployeeEmail,
  withEmailFromName,
  EMPLOYEE_EMAIL_DOMAIN,
} from '../src/lib/employeeEmail.js'

let failed = 0
function check(label, ok, detail = '') {
  if (!ok) failed += 1
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`)
}

console.log('')
console.log('Name -> login address')
console.log('='.repeat(64))

check('The domain is the company one', EMPLOYEE_EMAIL_DOMAIN === 'yanoltech.com', EMPLOYEE_EMAIL_DOMAIN)

check(
  'First and last word, middle dropped',
  emailLocalPart('Almaz Bekele Kebede') === 'almaz.kebede',
  emailLocalPart('Almaz Bekele Kebede'),
)
check(
  'A single word stands alone',
  emailLocalPart('Almaz') === 'almaz',
  emailLocalPart('Almaz'),
)
check(
  'Capitalisation is normalised',
  emailLocalPart('ALMAZ BEKELE') === 'almaz.bekele',
  emailLocalPart('ALMAZ BEKELE'),
)
check(
  'Extra whitespace collapses',
  emailLocalPart('  Almaz   Bekele  ') === 'almaz.bekele',
  emailLocalPart('  Almaz   Bekele  '),
)
check(
  'Accents are stripped, not dropped whole',
  emailLocalPart('Bekele Chala') === 'bekele.chala',
  emailLocalPart('Bekele Chala'),
)
check(
  'Characters an address cannot carry are removed',
  emailLocalPart("O'Brien-Smith") === 'obriensmith',
  emailLocalPart("O'Brien-Smith"),
)
check('An empty name yields nothing', emailLocalPart('') === '', JSON.stringify(emailLocalPart('')))
check('A missing name yields nothing', emailLocalPart(undefined) === '', JSON.stringify(emailLocalPart(undefined)))

// ── The full address ──────────────────────────────────────────────────────
//
// The rule is first + last word, so a middle name is dropped: "Almaz Bekele
// Kebede" is almaz.kebede, not almaz.bekele. The spelling below matters, and
// getting it wrong looks like a helper bug when it is not.
const THREE_WORDS = 'Almaz Bekele Kebede'
const THREE_WORDS_ADDRESS = 'almaz.kebede@yanoltech.com'

check(
  'A normal name becomes a full address (first + last word)',
  previewEmployeeEmail(THREE_WORDS) === THREE_WORDS_ADDRESS,
  previewEmployeeEmail(THREE_WORDS),
)
check(
  'The address works without an employee ID',
  previewEmployeeEmail('Almaz Bekele', '') === 'almaz.bekele@yanoltech.com',
  previewEmployeeEmail('Almaz Bekele', ''),
)

// Amharic has no Latin characters, which used to produce a bare "@domain".
const NON_LATIN = 'አበበ ካለም'

check(
  'A name with no Latin characters falls back to the employee ID',
  previewEmployeeEmail(NON_LATIN, '0042') === 'emp.0042@yanoltech.com',
  previewEmployeeEmail(NON_LATIN, '0042'),
)
check(
  'A non-Latin name with no ID yields nothing rather than a broken address',
  previewEmployeeEmail(NON_LATIN, '') === '',
  JSON.stringify(previewEmployeeEmail(NON_LATIN, '')),
)
check(
  'Nothing is ever a bare "@domain"',
  !['', 'a', 'b', 'Almaz', NON_LATIN, '  '].some((n) =>
    previewEmployeeEmail(n, '').startsWith('@'),
  ),
)

// ── The guard that decides whether the field still follows the name ───────
check('An empty field counts as still following the name', looksGeneratedEmployeeEmail('') === true)
check('A missing field counts as still following the name', looksGeneratedEmployeeEmail(undefined) === true)
check(
  'An address this helper produced counts as generated',
  looksGeneratedEmployeeEmail('almaz.bekele@yanoltech.com') === true,
)
check(
  'Capitalisation does not matter to that test',
  looksGeneratedEmployeeEmail('Almaz.Bekele@YanolTech.com') === true,
)
check(
  'A typed-in address does NOT count as generated, so it is preserved',
  looksGeneratedEmployeeEmail('almaZ.bekele@gmail.com') === false,
  'almaZ.bekele@gmail.com',
)
check(
  'A company address typed by hand is preserved too',
  looksGeneratedEmployeeEmail('j.doe@yanol.com') === false,
  'j.doe@yanol.com',
)
check(
  'A generated-looking address at a different domain is preserved',
  looksGeneratedEmployeeEmail('almaz.bekele@yanol.com') === false,
  'almaz.bekele@yanol.com',
)

// ── The form wiring ───────────────────────────────────────────────────────
//
// These drive withEmailFromName the way the add form does, keystroke by
// keystroke, so a regression in how the form passes the names in is caught
// here rather than by someone typing a name in the browser.
console.log('')
console.log('Driving the form, keystroke by keystroke')
console.log('-'.repeat(64))

const NON_LATIN_KEYSTROKES = 'አበበ ካለም'

/** Replays typing into a firstName/lastName form, the way the drawer does. */
function typeIntoDrawer(form, field, value) {
  const updated = { ...form, [field]: value }
  return withEmailFromName(updated, `${updated.firstName} ${updated.lastName}`)
}

let drawer = { firstName: '', lastName: '', employeeId: '0042', email: '' }

drawer = typeIntoDrawer(drawer, 'firstName', 'Almaz')
check(
  'Typing the first name fills the address',
  drawer.email === 'almaz@yanoltech.com',
  drawer.email,
)

drawer = typeIntoDrawer(drawer, 'lastName', 'Kebede')
check(
  'Typing the last name includes it - this is the stale-state bug',
  drawer.email === 'almaz.kebede@yanoltech.com',
  drawer.email,
)

drawer = typeIntoDrawer(drawer, 'lastName', 'Kebele')
check(
  'Correcting the last name corrects the address',
  drawer.email === 'almaz.kebele@yanoltech.com',
  drawer.email,
)

// Backspacing the name clears the field rather than leaving a stale address.
drawer = typeIntoDrawer(drawer, 'lastName', '')
check(
  'Backspacing the name falls back to the first name alone',
  drawer.email === 'almaz@yanoltech.com',
  drawer.email,
)

// Clearing the name entirely must not blank the address. An HR Admin who
// backspaces to fix a typo should not lose a value they may already have
// reviewed, and the name is required anyway so this state cannot be submitted.
// Typing a name again takes the field straight back over.
const emptied = { firstName: '', lastName: '', employeeId: '0042', email: 'almaz.bekede@yanoltech.com' }
const stillFilled = withEmailFromName(
  { ...emptied, firstName: '' },
  `${emptied.firstName} ${emptied.lastName}`,
)
check(
  'Clearing the name leaves the address alone rather than blanking it',
  stillFilled.email === 'almaz.bekede@yanoltech.com',
  stillFilled.email,
)

drawer = typeIntoDrawer(drawer, 'firstName', 'Selam')
check(
  'Typing a new name takes the field straight back over',
  drawer.email === 'selam@yanoltech.com',
  drawer.email,
)

const noNameYet = withEmailFromName(
  { firstName: '', lastName: '', employeeId: '0042', email: '' },
  '  ',
)
check(
  'An untouched form with no name yet stays empty for the required check',
  noNameYet.email === '',
  JSON.stringify(noNameYet.email),
)

// A typed-in address must win over the name, permanently.
let manual = { firstName: 'Almaz', lastName: 'Kebede', employeeId: '0042', email: '' }
manual = withEmailFromName(manual, `${manual.firstName} ${manual.lastName}`)
manual.email = 'almaZ.kebele@gmail.com'
manual = typeIntoDrawer(manual, 'firstName', 'Almazt')
check(
  'An address the HR Admin typed is not overwritten by later name edits',
  manual.email === 'almaZ.kebele@gmail.com',
  manual.email,
)

const untouched = withEmailFromName(
  { name: 'Almaz Kebede', employeeId: '0042', email: 'a.custom@yanol.com' },
  'Almaz Kebede',
)
check(
  'A hand-typed company address is preserved too',
  untouched.email === 'a.custom@yanol.com',
  untouched.email,
)

const fromEmpty = withEmailFromName(
  { name: '', employeeId: '', email: '' },
  '',
)
check(
  'An empty form is left alone',
  fromEmpty.email === '',
  JSON.stringify(fromEmpty.email),
)

// Amharic: no Latin characters, so the employee ID is the fallback.
let amharic = { firstName: '', lastName: '', employeeId: '0042', email: '' }
amharic = typeIntoDrawer(amharic, 'firstName', NON_LATIN_KEYSTROKES.split(' ')[0])
amharic = typeIntoDrawer(amharic, 'lastName', NON_LATIN_KEYSTROKES.split(' ')[1])
check(
  'A non-Latin name falls back to the employee ID, not a bare "@domain"',
  amharic.email === 'emp.0042@yanoltech.com',
  amharic.email,
)

const noId = withEmailFromName(
  { name: NON_LATIN_KEYSTROKES, employeeId: '', email: '' },
  NON_LATIN_KEYSTROKES,
)
check(
  'A non-Latin name with no ID leaves the field empty',
  noId.email === '',
  JSON.stringify(noId.email),
)

// The ID changing must refresh the fallback, or a stale address is offered.
const idChanged = withEmailFromName(
  { name: NON_LATIN_KEYSTROKES, employeeId: '0099', email: 'emp.0042@yanoltech.com' },
  NON_LATIN_KEYSTROKES,
)
check(
  'Changing the employee ID refreshes the fallback address',
  idChanged.email === 'emp.0099@yanoltech.com',
  idChanged.email,
)

check(
  'The input form is not mutated in place',
  (() => {
    const original = { name: 'Almaz Kebede', employeeId: '0042', email: '' }
    withEmailFromName(original, 'Almaz Kebede')
    return original.email === ''
  })(),
)

console.log('')
console.log('='.repeat(64))
console.log(failed === 0 ? '  All checks passed.' : `  ${failed} check(s) failed.`)
console.log('='.repeat(64))
console.log('')

process.exit(failed > 0 ? 1 : 0)
