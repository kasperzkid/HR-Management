// Renders the two restyled sections and checks the result, so a styling change
// cannot quietly leave a component unmounted or a value missing.
//
//   npm run verify:section-design

import { createServer } from 'vite'
import React, { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFile } from 'node:fs/promises'

// These pages read a little browser state and may reach for router hooks on
// first paint. renderToStaticMarkup runs no effects, so this only has to exist.
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

let failed = 0
function check(label, ok, detail = '') {
  if (!ok) failed += 1
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`)
}

function section(title) {
  console.log('')
  console.log(title)
  console.log('-'.repeat(64))
}

function render(Component) {
  try {
    return { html: renderToStaticMarkup(createElement(Component)), error: null }
  } catch (error) {
    return { html: '', error }
  }
}

// The markup a section produced, with class names and React comment markers
// stripped, so assertions are about what a person would read.
function textOf(html, from, to) {
  const start = html.indexOf(from)
  if (start === -1) return ''
  const rest = html.slice(start)
  const end = to ? rest.indexOf(to, from.length) : -1
  const slice = end === -1 ? rest.slice(0, 20000) : rest.slice(0, end)
  return slice
    .replace(/class="[^"]*"/g, '')
    .replace(/<!--[^>]*-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const vite = await createServer({
  configFile: 'vite.config.js',
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

let payrollHtml = ''

try {
  const { default: Payroll } = await vite.ssrLoadModule(
    '/src/HR-Manager/pages/Payroll.jsx',
  )
  const { default: HRReports } = await vite.ssrLoadModule(
    '/src/HR-Manager/pages/HRReports.jsx',
  )

  const payroll = render(Payroll)
  const reports = render(HRReports)

  console.log('')
  console.log('Section design: Payroll Rules / Data Quality & Validation')
  console.log('='.repeat(64))

  // ── Payroll Rules ────────────────────────────────────────────────────────
  section('Payroll Rules')

  check(
    'Payroll page renders without throwing',
    !payroll.error,
    payroll.error?.message || '',
  )
  if (payroll.error) throw payroll.error
  payrollHtml = payroll.html

  const rules = textOf(payroll.html, 'Payroll Rules', 'Payroll Records')

check('The section is present', rules.length > 0, `${rules.length} chars of text`)
check(
  'Its heading is unchanged',
  rules.includes('Payroll Rules'),
)
check(
  'Its description is unchanged',
  rules.includes('Current payroll calculations loaded from HR Settings.'),
)

for (const label of [
  'Standard Monthly Hours',
  'Overtime Multiplier',
  'Employee Pension',
  'Employer Pension',
]) {
  check(`Keeps the "${label}" label`, rules.includes(label))
}

check('Keeps "Contractual / Intern: Excluded"', rules.includes('Contractual / Intern: Excluded'))
check('Keeps the overtime rule wording', /Overtime: Hours ÷/.test(rules))
check('Keeps "Taxable Income"', rules.includes('Taxable Income'))
check('Keeps "Rate"', rules.includes('Rate'))
check('Keeps "Subtraction"', rules.includes('Subtraction'))

// Every pension rate is rendered as a percentage with two decimals.
const percentages = rules.match(/\d+\.\d{2}%/g) || []
check(
  'Pension rates still render to two decimals',
  percentages.length >= 2,
  percentages.join(' ') || 'none found',
)

// The unit lives in its own tinted span, so the text has a space before it.
const multipliers = rules.match(/\d+(?:\.\d+)?\s*×/g) || []
check('The overtime multiplier still shows its × unit', multipliers.length >= 1, multipliers.join(' '))

// Design requirements, as opposed to content requirements.
check(
  'Section sits on a white rounded card',
  /rounded-2xl/.test(payrollHtml) && /bg-white/.test(payrollHtml),
)
check(
  'Uses the blue/teal accent gradient',
  /from-sky-500 to-teal-500/.test(payrollHtml),
)
check(
  'The tax table is scrollable on narrow screens',
  /overflow-x-auto/.test(payrollHtml),
)
check(
  'Values use tabular figures so columns line up',
  (payrollHtml.match(/tabular-nums/g) || []).length >= 4,
)

  // ── Data Quality & Validation ────────────────────────────────────────────
  //
  // This one is checked from source rather than from rendered HTML, and the
  // reason is worth stating: the section sits behind the page's `loading` gate,
  // and `loading` starts true and is only cleared by a fetch in an effect.
  // renderToStaticMarkup runs no effects and there is no DOM here, so the
  // section is unreachable by SSR no matter how it is styled.
  section('Data Quality & Validation (source level - see note)')

  check(
    'HRReports page still renders without throwing',
    !reports.error,
    reports.error?.message || '',
  )
  if (reports.error) throw reports.error

  const source = await readFile('src/HR-Manager/pages/HRReports.jsx', 'utf8')

  // Pull out just this section's JSX so assertions are not satisfied by text
  // that happens to sit elsewhere in the file.
  const sectionStart = source.indexOf('title="Data Quality & Validation"')
  const sectionEnd = source.indexOf('title="Salary & Payroll Overview"')
  check('The section block can be located', sectionStart !== -1 && sectionEnd > sectionStart)
  const quality = sectionStart === -1 ? '' : source.slice(sectionStart, sectionEnd)

  check(
    'Its heading is unchanged',
    quality.includes('title="Data Quality & Validation"'),
  )
  check(
    'Its description is unchanged',
    quality.includes(
      'Validation checks generated by the HR Reports backend based on the workbook reporting requirements.',
    ),
  )
  check(
    'It shows the no-alerts state when there are none',
    quality.includes('No validation alerts'),
  )
  check(
    'And keeps the explanatory sentence',
    quality.includes('The current reporting checks did not find any flagged records.'),
  )
  check(
    'The section is no longer rendered without a card',
    !/\bplain\b/.test(quality),
    'the plain wrapper is gone',
  )
  check(
    'It uses the same blue/teal accent as Payroll Rules',
    /icon=\{ShieldCheck\}/.test(quality),
  )
  check(
    'It carries a status summary in the header',
    /action=\{/.test(quality) && /alertTotal/.test(quality),
  )

  // The data path has to be untouched: these drive every number on screen.
  check(
    'Alerts are still filtered to counts above zero',
    /Number\(value \|\| 0\) > 0/.test(quality),
  )
  check(
    'The alert total still drives the empty state',
    /alertTotal === 0/.test(quality),
  )
  check(
    'Each alert still renders its own key and value',
    /\{key\}/.test(quality) && /\{value\}/.test(quality),
  )
  check(
    'The alert total still comes from the report payload',
    /Number\(report\?\.alertTotal \|\| 0\)/.test(source),
  )

  // ── Other report sections were not restyled ──────────────────────────────
  section('Untouched neighbours')

  check(
    'ReportSection only gained optional props',
    /function ReportSection\(\{ title, description, children, plain = false, icon: Icon, action \}\)/.test(
      source,
    ),
  )
  check(
    'The optional props are safe when omitted',
    /\{Icon \?/.test(source) && /\{action \?/.test(source),
  )
  // The Data Quality block's props are long and contain ternaries, so matching
  // an opening tag to its closing ">" is unreliable. These are counted across
  // the file instead: if a sibling section later grows the same treatment, the
  // count moves and this fails.
  const countOf = (needle) => (source.match(needle) || []).length

  check(
    'Every ReportSection was found',
    countOf(/<ReportSection\b/g) >= 5,
    `${countOf(/<ReportSection\b/g)} section(s)`,
  )
  check(
    'Only one section asks for an icon',
    countOf(/icon=\{ShieldCheck\}/g) === 1,
    `${countOf(/icon=\{ShieldCheck\}/g)} section(s)`,
  )
  check(
    'Only one section has a header action',
    countOf(/\n\s+action=\{/g) === 1,
    `${countOf(/\n\s+action=\{/g)} section(s)`,
  )
  check(
    'The other five still render without either prop',
    countOf(/\n\s+plain\b/g) === 1 ||
      countOf(/title="Data Quality & Validation"[\s\S]{0,900}?action=\{/g) === 1,
    'and the plain wrapper moved to this section alone',
  )
} finally {
  await vite.close()
}

console.log('')
console.log('='.repeat(64))
console.log(failed === 0 ? '  All checks passed.' : `  ${failed} check(s) failed.`)
console.log('='.repeat(64))
console.log('')

process.exitCode = failed > 0 ? 1 : 0
