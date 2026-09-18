import { loadOpenApiSpec } from '../server/docs/index.js'

const spec = loadOpenApiSpec()
const raw = JSON.stringify(spec)

// 1. Any external file refs left?
const yamlStrings = [...raw.matchAll(/"[^"]*\.yaml[^"]*"/g)].map((m) => m[0])
console.log('strings containing .yaml:', yamlStrings.length)
yamlStrings.forEach((r) => console.log('  ', r))

// 2. Collect every $ref value
const refs = []
function walk(node) {
  if (Array.isArray(node)) return node.forEach(walk)
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === '$ref' && typeof v === 'string') refs.push(v)
      else walk(v)
    }
  }
}
walk(spec)

const external = refs.filter((r) => !r.startsWith('#/'))
const internal = refs.filter((r) => r.startsWith('#/'))
console.log('total $refs:', refs.length, '| external:', external.length, '| internal:', internal.length)
external.forEach((r) => console.log('  EXTERNAL:', r))

// 3. Verify internal refs resolve
let broken = 0
for (const ref of internal) {
  const parts = ref.slice(2).split('/').map((x) => x.replace(/~1/g, '/').replace(/~0/g, '~'))
  let node = spec
  for (const p of parts) {
    if (node == null || !(p in node)) {
      broken++
      console.log('BROKEN:', ref)
      break
    }
    node = node[p]
  }
}
console.log('broken internal refs:', broken)

// 4. Summary
console.log('paths:', Object.keys(spec.paths).length)
console.log('schemas:', Object.keys(spec.components.schemas).length)
console.log('responses:', Object.keys(spec.components.responses).length)
const ops = []
for (const [p, item] of Object.entries(spec.paths)) {
  for (const m of ['get', 'post', 'put', 'delete', 'patch']) {
    if (item?.[m]) ops.push(`${m.toUpperCase()} ${p}`)
  }
}
console.log('operations:', ops.length)
if (broken === 0 && external.length === 0) {
  console.log('✔ SPEC VALID: self-contained, all refs resolve')
} else {
  console.log('✖ SPEC HAS PROBLEMS')
  process.exit(1)
}
