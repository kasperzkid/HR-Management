/**
 * Route guards.
 *
 * `requireAuth` establishes who the caller is. These guards establish what
 * they may do, and they are the enforcement point the UI mirrors - the reason
 * the Delete button is hidden is not that hiding it is the protection, it is
 * that hiding it is a courtesy and this is the wall.
 *
 * The JWT carries only an id, a coarse role and an employee link. Everything
 * that decides access - the HR role, the individual overrides and whether the
 * account is still active - is read from the database on each request. That is
 * one extra query, and it buys two things: deactivating somebody takes effect
 * on their next request rather than up to eight hours later when their token
 * expires, and there is no window where a stale token still carries a
 * permission that has since been revoked.
 */

import prisma from '../db.js'
import { requireAuth } from './auth.middleware.js'
import { hasAnyPermission, isAdmin } from '../rbac/rbac.service.js'


/** 403 body used for every denial, so a client sees one shape. */
function forbidden(res, message, extra = {}) {
  return res.status(403).json({ message, ...extra })
}

/**
 * Loads the account behind the token and attaches it as `req.account`.
 *
 * A token naming a user who no longer exists, or whose account has been
 * deactivated, is rejected here - 401 for a deleted account (the session is
 * simply invalid) and 403 for a deactivated one (the account is real, it is
 * the access that has been withdrawn).
 */
export async function loadAccount(req, res, next) {
  try {
    const account = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        hrRoleId: true,
        mustChangePassword: true,
        employeeId: true,
        createdAt: true,
      },
    })

    if (!account) {
      return res.status(401).json({
        message: 'Invalid or expired authentication token',
      })
    }

    if (account.isActive === false) {
      return forbidden(res, 'This account has been deactivated. Contact an HR administrator.', {
        code: 'ACCOUNT_DEACTIVATED',
      })
    }

    req.account = account
    next()
  } catch (error) {
    console.error('Account lookup error:', error)
    return res.status(500).json({ message: 'Could not verify your access.' })
  }
}

const notHr = (res) =>
  forbidden(res, 'This area is limited to HR staff accounts.', { code: 'NOT_HR_STAFF' })

const noPermission = (res, key) =>
  forbidden(res, 'You do not have permission to do that.', {
    code: 'MISSING_PERMISSION',
    requiredPermission: key,
  })

/**
 * requireAuth + account lookup + the user must hold at least one of these
 * permissions.
 *
 * Takes several keys so a read can be granted to a role that only has the read,
 * without the route having to know that "view" implies nothing else.
 */
export function requirePermission(...permissionKeys) {
  return [requireAuth, loadAccount, async (req, res, next) => {
    const account = req.account

    if (account.hrRoleId == null) return notHr(res)

    const allowed = await hasAnyPermission(account, permissionKeys)
    return allowed ? next() : noPermission(res, permissionKeys.join(' or '))
  }]
}

/** requireAuth + account lookup + the user must be able to manage access. */
export function requireAdmin() {
  return [requireAuth, loadAccount, async (req, res, next) => {
    const account = req.account

    if (account.hrRoleId == null) return notHr(res)

    const allowed = await isAdmin(account)
    return allowed ? next() : noPermission(res, 'users.permissions')
  }]
}

/**
 * requireAuth + account lookup + the user must hold at least one HR permission.
 *
 * Used for the dashboard, which aggregates every module and so has no single
 * permission of its own. It is a real check rather than a pass-through: an
 * account with no HR role still cannot read the HR dashboard, where nearly
 * every number is derived from the whole company.
 */
export function requireAnyHrPermission() {
  return [requireAuth, loadAccount, async (req, res, next) => {
    const account = req.account

    if (account.hrRoleId == null) return notHr(res)

    const allowed = await hasAnyPermission(account, [
      'employees.view',
      'attendance.view',
      'leave.view',
      'payroll.view',
      'payment_slips.view',
      'reports.view',
      'users.view',
    ])

    return allowed ? next() : noPermission(res, 'any HR module')
  }]
}
