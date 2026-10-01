// Reusable SMTP email service.
//
// Handles three flows:
//   - HR Admin / employee password reset
//   - Employee account creation (temporary credentials)
//   - Employee temporary password reset by HR
//
// All credentials come from environment variables. Nothing here is ever
// logged, returned to the client, or embedded in an error message that
// reaches the browser.

import nodemailer from 'nodemailer'

const RESET_TOKEN_TTL_MINUTES = 30

function readPort(value, fallback = 587) {
  const port = Number(value)
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : fallback
}

/**
 * True when enough SMTP settings are present to attempt a send.
 * Used by callers to degrade gracefully instead of crashing.
 */
export function isEmailConfigured() {
  return missingSmtpVars().length === 0
}

function missingSmtpVars() {
  const missing = []
  if (!process.env.SMTP_HOST) missing.push('SMTP_HOST')
  if (!process.env.SMTP_USER) missing.push('SMTP_USER')
  if (!process.env.SMTP_PASSWORD) missing.push('SMTP_PASSWORD')
  if (!process.env.SMTP_FROM && !process.env.SMTP_USER) missing.push('SMTP_FROM')
  return missing
}

/**
 * Human-readable description of the current SMTP setup.
 *
 * Only the host, port and the username are ever included. The password is
 * reduced to "set" / "not set" and is never printed, so this is safe to call
 * from a startup log or a CLI.
 */
export function smtpStatus() {
  const missing = missingSmtpVars()

  return {
    configured: missing.length === 0,
    host: process.env.SMTP_HOST || null,
    port: readPort(process.env.SMTP_PORT),
    user: process.env.SMTP_USER || null,
    from: fromAddress() || null,
    passwordSet: Boolean(process.env.SMTP_PASSWORD),
    missing,
  }
}

/**
 * Actually open a connection to the SMTP server and authenticate.
 *
 * This is the difference between "the environment variables are present" and
 * "email will actually be delivered". Returns
 * { ok, message, hint? } and never throws.
 *
 * The failure hint is a short, actionable instruction for whoever runs the
 * server. It contains no credentials, and the underlying error is only written
 * to the server log.
 */
export async function verifySmtpConfiguration() {
  const status = smtpStatus()

  if (!status.configured) {
    return {
      ok: false,
      // "Nobody has filled in the mail settings yet" is a normal state
      // for a fresh install, not a fault. It is reported separately from
      // a genuine misconfiguration so startup can stay quiet about it
      // instead of printing the same alarming block either way.
      state: 'unconfigured',
      message:
        `Email is not configured. Missing environment ${status.missing.length === 1 ? 'variable' : 'variables'}: ${status.missing.join(', ')}.`,
      hint:
        'Copy the SMTP_* lines from .env.example into .env and restart the server.',
    }
  }

  try {
    await getTransporter().verify()

    return {
      ok: true,
      state: 'ready',
      message: `Email is ready. Sending as "${fromAddress()}" via ${status.host}:${status.port}.`,
    }
  } catch (error) {
    const code = error?.code || error?.name || 'Error'
    console.error(
      '[email] SMTP verification failed:',
      code,
      error?.message || error,
    )

    const hints = {
      EAUTH:
        'The SMTP server rejected the username or password. For Gmail, use an App Password from https://myaccount.google.com/apppasswords rather than your account password.',
      ETIMEDOUT:
        'The SMTP server did not respond in time. Check SMTP_HOST/SMTP_PORT and any firewall rules.',
      ECONNREFUSED:
        'Nothing is listening on that host and port. Check SMTP_HOST and SMTP_PORT.',
      EENOTFOUND:
        'The SMTP host name could not be resolved. Check SMTP_HOST.',
    }

    return {
      ok: false,
      // The settings are present but the server will not accept them.
      // That is a real fault and deserves a loud report.
      state: 'misconfigured',
      message: `Email is configured but could not connect to ${status.host}:${status.port} (${code}).`,
      hint:
        hints[code] ||
        'Check SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD in .env.',
    }
  }
}

function fromAddress() {
  return process.env.SMTP_FROM || process.env.SMTP_USER || ''
}

/**
 * Public base URL of the app, used to build links inside emails.
 * Falls back to localhost so a misconfigured deployment still produces a
 * working (if not public) link rather than throwing.
 */
export function publicUrl() {
  const configured = (process.env.APP_PUBLIC_URL || '').trim()
  if (configured) return configured.replace(/\/+$/, '')
  return 'http://localhost:5173'
}

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  const port = readPort(process.env.SMTP_PORT)

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // Port 465 is implicit TLS; everything else (587/25) uses STARTTLS.
    secure: process.env.SMTP_SECURE
      ? /^(1|true|yes)$/i.test(process.env.SMTP_SECURE)
      : port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })

  return transporter
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Low-level send. Returns { sent: boolean, reason?: string } and never throws,
 * so callers can decide whether a failure should be surfaced or logged.
 */
export async function sendMail({ to, subject, text, html }) {
  if (!isEmailConfigured()) {
    return {
      sent: false,
      reason: `Email is not configured. Missing: ${missingSmtpVars().join(', ')}`,
    }
  }

  if (!to) {
    return { sent: false, reason: 'No recipient email address was provided.' }
  }

  try {
    await getTransporter().sendMail({
      from: fromAddress(),
      to,
      subject,
      text,
      html,
    })
    return { sent: true }
  } catch (error) {
    // Only the error code/name is surfaced. The message can contain
    // hostnames or credential hints, so it stays in the server log.
    console.error(
      `[email] send failed for ${to}:`,
      error?.code || error?.name || 'Error',
      error?.message || error,
    )

    return {
      sent: false,
      reason:
        error?.code === 'EAUTH'
          ? 'The email server rejected the SMTP credentials.'
          : 'The email could not be sent. Please try again later.',
    }
  }
}

function shell({ heading, intro, rows, footer }) {
  const rowHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 0;color:#64748b;font-size:13px;width:150px;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:10px 0;color:#0f172a;font-size:14px;font-weight:600;">${value}</td>
        </tr>`,
    )
    .join('')

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#0092B8;padding:22px 28px;">
              <div style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:-0.2px;">YANOL TECH</div>
              <div style="color:#ffffffcc;font-size:11px;letter-spacing:2px;margin-top:3px;">TOGETHER WE RISE</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 8px;font-size:19px;color:#0f172a;font-weight:700;">${escapeHtml(heading)}</h1>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;">${escapeHtml(intro)}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;">${rowHtml}</table>
              ${footer ? `<p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#475569;">${footer}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;line-height:1.6;color:#94a3b8;">
                This is an automated message from the YANOL TECH HR &amp; Payroll system. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

/**
 * Password reset email. Deliberately never contains the current password.
 */
export async function sendPasswordResetEmail({ to, name, resetToken }) {
  const link = `${publicUrl()}/reset-password?token=${encodeURIComponent(resetToken)}`

  return sendMail({
    to,
    subject: 'Reset your YANOL TECH HR account password',
    text: [
      `Hi ${name || 'there'},`,
      '',
      'We received a request to reset the password for your YANOL TECH HR account.',
      '',
      'Use the link below to choose a new password:',
      link,
      '',
      `This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes and can only be used once.`,
      '',
      'If you did not request this, you can safely ignore this email - your password will not change.',
    ].join('\n'),
    html: shell({
      heading: 'Reset your password',
      intro: `We received a request to reset the password for your YANOL TECH HR account. Use the button below to choose a new password.`,
      rows: [
        ['Account', escapeHtml(to)],
        ['Link expires in', `${RESET_TOKEN_TTL_MINUTES} minutes`],
      ],
      footer: `<a href="${link}" style="display:inline-block;background:#0092B8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 22px;border-radius:12px;">Choose a new password</a>
        <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">If the button does not work, copy this link into your browser:<br>${escapeHtml(link)}</p>`,
    }),
  })
}

// How long a login-email change stays confirmable. Long enough that someone
// setting the system up on one machine and opening the mail on another is not
// locked out of their own account, short enough that a link found months later
// in a mailbox is useless.
const EMAIL_VERIFICATION_TTL_MINUTES = 24 * 60

/**
 * Login-email change verification.
 *
 * Sent to the NEW address, which is the entire point: the link only reaches
 * the inbox of whoever actually owns the address, so clicking it is the proof
 * that the change was intended. It never mentions a password.
 */
export async function sendEmailVerificationEmail({
  to,
  name,
  verificationToken,
  previousEmail,
}) {
  const link = `${publicUrl()}/verify-email?token=${encodeURIComponent(verificationToken)}`

  return sendMail({
    to,
    subject: 'Confirm your new YANOL TECH HR login email',
    text: [
      `Hi ${name || 'there'},`,
      '',
      'A request was made to change the login email address on your YANOL TECH HR account to this address.',
      '',
      previousEmail
        ? `Once confirmed, ${previousEmail} will stop working for sign-in and password resets, and this address will take over.`
        : 'Once confirmed, this address becomes your sign-in and password reset address.',
      '',
      'Confirm the change using the link below:',
      link,
      '',
      `The address only changes if you open this link. It expires in ${Math.round(
        EMAIL_VERIFICATION_TTL_MINUTES / 60,
      )} hours and can be used once.`,
      '',
      'If you did not request this, ignore this email and nothing will change. Your current login address stays as it is.',
    ].join('\n'),
    html: shell({
      heading: 'Confirm your login email',
      intro:
        'A request was made to change the login email address on your YANOL TECH HR account to this address. Confirm it below to make the change permanent.',
      rows: [
        ['New login email', escapeHtml(to)],
        ...(previousEmail
          ? [['Current login email', escapeHtml(previousEmail)]]
          : []),
        ['Link expires in', `${Math.round(EMAIL_VERIFICATION_TTL_MINUTES / 60)} hours`],
      ],
      footer: `<a href="${link}" style="display:inline-block;background:#0092B8;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 22px;border-radius:12px;">Confirm this email address</a>
        <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">If the button does not work, copy this link into your browser:<br>${escapeHtml(link)}</p>
        <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;">If you did not request this change, ignore this email. Your login address will stay the same.</p>`,
    }),
  })
}

export { RESET_TOKEN_TTL_MINUTES, EMAIL_VERIFICATION_TTL_MINUTES }
