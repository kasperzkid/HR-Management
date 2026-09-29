// Renders the employee modal and checks what is actually in the output.
//
//   node scripts/verify-employee-modal.mjs
//
// There is no browser in this environment, so instead of eyeballing the screen
// this renders the real component through Vite's SSR pipeline and inspects the
// HTML. That answers the question that actually matters for a single-page form:
// are all six sections present at the same time, or is one of them still hiding
// behind state?
//
// Fields are matched on their placeholders and labels rather than on a `name`
// attribute, because these are controlled inputs that never had one.

import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// The form reads a little browser state on first paint. renderToStaticMarkup
// runs no effects, so this only needs to exist, not behave.
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

const results = []

function check(label, ok, detail = '') {
  results.push({ label, ok })
  console.log(
    `  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`,
  )
}

const vite = await createServer({
  configFile: 'vite.config.js',
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const { default: AddEmployeeModal } =
    await vite.ssrLoadModule(
      '/src/HR-Manager/components/AddEmployeeModal.jsx',
    )

  const raw = renderToStaticMarkup(
    React.createElement(AddEmployeeModal, {
      isOpen: true,
      onClose: () => {},
      onSave: async () => {},
      existingEmployees: [],
    }),
  )

  // Undo the escaping and whitespace noise that JSX indentation introduces, so
  // a check can be written as the text a person would read.
  const html = raw.replace(/&amp;/g, '&').replace(/\s+/g, ' ')

  console.log('\nEmployee modal render check')
  console.log('-'.repeat(60))
  console.log(`  rendered ${raw.length} characters of HTML`)
  console.log('')

  // ── Every section, all at once ──────────────────────────────────────────
  // This is the whole point of the change. If one of these is missing,
  // something is still gated behind step state.
  const sections = [
    ['1. Identification & Personal Info', 'Personal'],
    ['2. Job & Employment Details', 'Job'],
    ['3. Compensation & Allowances', 'Compensation'],
    ['4. Banking & Statutory Identification', 'Banking'],
    ['5. Certificates & CV Documents', 'Documents'],
    ['6. Notes & Remarks', 'Notes'],
  ]

  for (const [heading, name] of sections) {
    check(
      `Section ${name} is on the page`,
      html.includes(heading),
      html.includes(heading) ? '' : `missing "${heading}"`,
    )
  }

  // ── Compensation specifically, since that is what was asked about ───────
  check(
    'Basic salary is on the page',
    html.includes('placeholder="e.g. 30000"'),
  )

  // The four allowances all carry the same "0" placeholder, so count them
  // rather than searching for each by name.
  const optionalZeroes =
    (html.match(/placeholder="0"/g) || []).length
  check(
    'All four allowances are on the page',
    optionalZeroes === 4,
    `found ${optionalZeroes} "0" placeholders`,
  )

  for (const label of [
    'Transport Allow.',
    'Housing Allow.',
    'Meal Allow.',
    'Other Allow.',
  ]) {
    check(`Allowance "${label}" is labelled`, html.includes(label))
  }

  // The live total is what the section is for, so it must still be there.
  check(
    'The monthly gross total still computes',
    html.includes('Total Monthly Gross: ETB'),
  )

  // ── The other sections, so one going missing is caught ─────────────────
  const otherMarkers = [
    ['placeholder="e.g. Almaz Bekele Kebede"', 'full name field'],
    // The HR Admin types the login address, and a company address is a normal
    // thing to enter. The field is filled in from the name as they type, and
    // stays editable afterwards.
    ['From the name', 'email field is marked as filled from the name'],
    ['placeholder="employee@yanoltech.com"', 'the company login domain is suggested'],
    ['placeholder="e.g. Senior Operations Officer"', 'job title field'],
    ['placeholder="1000123456781"', 'bank account field'],
    ['placeholder="TIN-40019290"', 'TIN field'],
    ['placeholder="PEN-00109"', 'pension ID field'],
    ['Internal HR onboarding notes', 'notes textarea'],
  ]

  for (const [marker, what] of otherMarkers) {
    check(`${what} is present`, html.includes(marker))
  }

  const fileInputs = (html.match(/type="file"/g) || []).length
  check(
    'Document uploads are present',
    fileInputs >= 2,
    `${fileInputs} file inputs`,
  )

  // ── The old stepper is gone ─────────────────────────────────────────────
  check('No stepper Next button', !/>Next</.test(html))
  check('No stepper Back button', !/>Back</.test(html))
  check('Cancel replaced it', html.includes('Cancel'))

  // ── One form, one save action ───────────────────────────────────────────
  const formCount = (html.match(/<form/g) || []).length
  check('There is a single form element', formCount === 1, `found ${formCount}`)
  check('There is a single submit button', (html.match(/type="submit"/g) || []).length === 1)
  check('The save action is labelled', html.includes('Add Employee'))

  // ── Submit-time behaviour that the single page depends on ──────────────
  // Native validation off, or the browser blocks the submit before the real
  // validation runs: the styled errors never appear and the scroll-to-error
  // never happens.
  check(
    'Native validation is disabled',
    /<form[^>]*novalidate/i.test(raw),
  )

  console.log('')
  console.log(
    `  inputs: ${(html.match(/<input/g) || []).length}, selects: ${
      (html.match(/<select/g) || []).length
    }, textareas: ${(html.match(/<textarea/g) || []).length}`,
  )
  console.log('-'.repeat(60))

  const failed = results.filter((r) => !r.ok)
  console.log(
    `  ${results.length - failed.length} passed, ${failed.length} failed`,
  )
  console.log('-'.repeat(60))
  console.log('')

  process.exitCode = failed.length > 0 ? 1 : 0
} finally {
  await vite.close()
}
