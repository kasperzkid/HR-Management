// ------------------------------------------------------------------
// MAILER — Gmail SMTP via nodemailer (same pattern as Pos-system).
// Credentials come from .env: EMAIL_USER / EMAIL_PASS.
// The .env is loaded by Prisma's environment loader when running
// `npm run server` (prisma generate / db push load it; NODE_ENV extra
// env files are read automatically by Prisma CLI as well).
// ------------------------------------------------------------------
import nodemailer from 'nodemailer'

const EMAIL_USER = process.env.EMAIL_USER
const EMAIL_PASS = process.env.EMAIL_PASS

let transporter = null

function getTransporter() {
  if (!EMAIL_USER || !EMAIL_PASS) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    })
  }
  return transporter
}

export function isEmailConfigured() {
  return Boolean(EMAIL_USER && EMAIL_PASS)
}

function credentialsEmailHtml({ name, email, employeeId, password, loginUrl }) {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f1f5f9; padding:32px;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e2e8f0;">
      <div style="background:#0f172a; padding:24px 28px;">
        <h2 style="color:#ffffff; margin:0; font-size:18px;">Welcome to Yanol HR</h2>
        <p style="color:#94a3b8; margin:4px 0 0; font-size:12px;">Your employee portal account has been created</p>
      </div>
      <div style="padding:28px;">
        <p style="font-size:14px; color:#0f172a; margin:0 0 6px;">Hi <strong>${name}</strong>,</p>
        <p style="font-size:13px; color:#475569; margin:0 0 20px;">Great news — your portal account is ready. Sign in with the credentials below:</p>

        <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:20px;">
          <tr>
            <td style="padding:10px 12px; background:#f8fafc; border:1px solid #e2e8f0; color:#64748b; width:140px;">Employee ID</td>
            <td style="padding:10px 12px; background:#f8fafc; border:1px solid #e2e8f0; font-family:monospace; font-weight:bold; color:#0f172a;">${employeeId}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px; background:#f8fafc; border:1px solid #e2e8f0; color:#64748b;">Email</td>
            <td style="padding:10px 12px; background:#f8fafc; border:1px solid #e2e8f0; color:#0f172a;">${email}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px; background:#fff7ed; border:1px solid #fed7aa; color:#9a3412; font-weight:bold;">Temporary Password</td>
            <td style="padding:10px 12px; background:#fff7ed; border:1px solid #fed7aa; font-family:monospace; font-weight:bold; letter-spacing:0.08em; color:#9a3412;">${password}</td>
          </tr>
        </table>

        <p style="font-size:12px; color:#64748b; margin:0 0 16px;">
          This is a temporary password (8 characters mixed with letters, numbers and symbols). Please change it after your first sign-in.
        </p>

        <a href="${loginUrl}" style="display:inline-block; background:#0f172a; color:#ffffff; text-decoration:none; padding:11px 22px; border-radius:10px; font-size:13px; font-weight:bold;">
          Sign in to the portal
        </a>
      </div>
      <div style="background:#f8fafc; padding:16px 28px; border-top:1px solid #e2e8f0;">
        <p style="font-size:11px; color:#94a3b8; margin:0;">If you didn't expect this email, please contact your HR department.</p>
      </div>
    </div>
  </div>
  `
}

/**
 * Send the portal login credentials to a newly created employee.
 * Returns { sent: boolean, error?: string } — never throws.
 */
export async function sendEmployeeCredentialsEmail({ name, email, employeeId, password, loginUrl }) {
  if (!isEmailConfigured()) {
    return { sent: false, error: 'Email is not configured (missing EMAIL_USER / EMAIL_PASS).' }
  }

  try {
    const transport = getTransporter()
    await transport.sendMail({
      from: `"Yanol HR" <${EMAIL_USER}>`,
      to: email,
      subject: 'Your Yanol HR Portal Account',
      html: credentialsEmailHtml({ name, email, employeeId, password, loginUrl }),
    })
    return { sent: true }
  } catch (error) {
    console.error('Send employee credentials email error:', error)
    return { sent: false, error: error.message || 'Failed to send credentials email.' }
  }
}
