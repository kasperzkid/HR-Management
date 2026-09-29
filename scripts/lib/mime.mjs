// Minimal MIME reader for the verification harness.
//
// The emails this application sends are multipart/alternative and, because
// they contain long URLs, quoted-printable encoded with soft line breaks:
//
//   http://localhost:5173/reset-password?token=3DAAAA...=\r\nAAA...
//
// A naive search for the reset link in the raw bytes finds a broken token. So
// the harness decodes the message the way a mail client would before looking
// for anything inside it.

function decodeQuotedPrintable(input) {
  return (
    input
      // Soft line breaks first: a trailing "=" means "the line continues".
      .replace(/=\r\n/g, '')
      .replace(/=\n/g, '')
      // Then the =XX escapes.
      .replace(/=([0-9A-Fa-f]{2})/g, (_match, hex) =>
        String.fromCharCode(parseInt(hex, 16)),
      )
  )
}

function decodeBase64(input) {
  return Buffer.from(
    input.replace(/\s+/g, ''),
    'base64',
  ).toString('utf8')
}

/**
 * Splits a block of header lines into a lowercase-keyed map, joining folded
 * continuation lines (which start with space or tab) onto the header above.
 */
function parseHeaders(lines) {
  const headers = {}
  let current = null

  for (const line of lines) {
    if (/^[ \t]/.test(line) && current) {
      headers[current] += ` ${line.trim()}`
      continue
    }

    const separator = line.indexOf(':')

    if (separator > 0) {
      current = line.slice(0, separator).trim().toLowerCase()
      headers[current] = line.slice(separator + 1).trim()
    }
  }

  return headers
}

function decodeBody(headers, body) {
  if ((headers['content-type'] || '').toLowerCase().startsWith('multipart/')) {
    return null
  }

  const encoding = (headers['content-transfer-encoding'] || '7bit')
    .trim()
    .toLowerCase()

  if (encoding === 'quoted-printable') return decodeQuotedPrintable(body)
  if (encoding === 'base64') return decodeBase64(body)

  return body
}

/**
 * Returns the decoded text of every body part in the message, joined.
 * Handles quoted-printable and base64; anything else is passed through.
 */
export function decodeMessageText(raw) {
  if (!raw) return ''

  const normalised = raw.replace(/\r\n/g, '\n')
  const allLines = normalised.split('\n')

  // Find the blank line that ends the top-level headers.
  let headerEnd = allLines.findIndex((line) => line === '')

  if (headerEnd === -1) {
    // No body at all.
    return ''
  }

  const topHeaders = parseHeaders(allLines.slice(0, headerEnd))
  const contentType = (topHeaders['content-type'] || '').toLowerCase()

  // Not multipart: decode the single body directly.
  if (!contentType.startsWith('multipart/')) {
    return decodeBody(topHeaders, allLines.slice(headerEnd + 1).join('\n')) ?? ''
  }

  const boundaryMatch = topHeaders['content-type']?.match(
    /boundary="?([^";]+)"?/i,
  )
  const boundary = boundaryMatch?.[1]

  if (!boundary) return ''

  // Everything before the first "--boundary" is preamble.
  const lines = allLines.slice(headerEnd + 1)
  const decoded = []

  let current = null

  const flush = () => {
    if (!current) return

    const partBody = current.body.join('\n')
    const text = decodeBody(current.headers, partBody)

    if (text !== null) decoded.push(text)

    current = null
  }

  for (const line of lines) {
    // "--boundary" opens a part, "--boundary--" closes the message.
    if (line.trimEnd() === `--${boundary}`) {
      flush()
      current = { headers: {}, body: [] }
      continue
    }

    if (line.trimEnd() === `--${boundary}--`) {
      flush()
      break
    }

    if (!current) continue // preamble

    if (current.headersDone !== true) {
      if (line === '') {
        current.headersDone = true
      } else {
        const separator = line.indexOf(':')

        if (separator > 0) {
          current.headers[line.slice(0, separator).trim().toLowerCase()] =
            line.slice(separator + 1).trim()
        } else if (/^[ \t]/.test(line)) {
          // Folded continuation.
          const key = Object.keys(current.headers).pop()

          if (key) current.headers[key] += ` ${line.trim()}`
        }
      }
      continue
    }

    current.body.push(line)
  }

  flush()

  return decoded.join('\n')
}

/** Pulls the reset token out of a decoded password-reset email. */
export function extractResetToken(decoded) {
  return decoded.match(/\/reset-password\?token=([A-Za-z0-9_-]+)/)?.[1]
}

/** Pulls the token out of a decoded login-email confirmation email. */
export function extractVerificationToken(decoded) {
  return decoded.match(/\/verify-email\?token=([A-Za-z0-9_-]+)/)?.[1]
}

/** Pulls the temporary password out of a decoded credentials email. */
export function extractTemporaryPassword(decoded) {
  return decoded.match(/Temporary password:\s*([A-Za-z0-9_-]+)/)?.[1]
}
