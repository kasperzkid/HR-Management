// ─────────────────────────────────────────────────────────────
// OpenAPI spec loader — merges the modular YAML docs in this
// directory (schemas, responses, per-domain paths) into one
// self-contained document for swagger-ui-express.
//
// The root openapi.yaml references path definitions with external
// $refs like './paths/auth.yaml#/paths/~1login'. swagger-ui-express
// does not resolve external files, so this loader resolves every
// external ref against the local file system and inlines the
// result. Internal refs (#/components/...) are left untouched.
// ─────────────────────────────────────────────────────────────

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import YAML from 'yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function readYaml(file) {
  // resolve (not join) — resets correctly if `file` is ever absolute
  return YAML.parse(fs.readFileSync(path.resolve(__dirname, file), 'utf8'))
}

// JSON Pointer lookup: '/paths/~1login' → doc.paths['/login']
function resolvePointer(doc, pointer) {
  const segments = pointer
    .split('/')
    .slice(1)
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'))
  return segments.reduce((node, key) => (node == null ? node : node[key]), doc)
}

// Recursively inline external refs relative to the referencing file.
function inlineExternalRefs(node, baseDir) {
  if (Array.isArray(node)) {
    return node.map((item) => inlineExternalRefs(item, baseDir))
  }
  if (node && typeof node === 'object') {
    if (typeof node.$ref === 'string' && !node.$ref.startsWith('#/')) {
      const [file, pointer = ''] = node.$ref.split('#')
      const targetPath = path.resolve(baseDir, file)
      const targetDoc = readYaml(targetPath)
      const resolved = resolvePointer(targetDoc, pointer)
      const resolvedDir = path.dirname(targetPath)
      return inlineExternalRefs(resolved, resolvedDir)
    }
    const out = {}
    for (const [key, value] of Object.entries(node)) {
      out[key] = inlineExternalRefs(value, baseDir)
    }
    return out
  }
  return node
}

export function loadOpenApiSpec() {
  const root = readYaml('openapi.yaml')
  const { components: schemasDoc } = readYaml('schemas.yaml')
  const rawResponses = readYaml('responses.yaml')

  // responses.yaml references schemas.yaml with external refs —
  // resolve those too so the final spec is fully self-contained.
  const responses = inlineExternalRefs(rawResponses.responses, __dirname)

  const components = {
    ...root.components,
    schemas: schemasDoc.schemas,
    responses,
  }

  const paths = inlineExternalRefs(root.paths, __dirname)

  return { ...root, paths, components }
}
