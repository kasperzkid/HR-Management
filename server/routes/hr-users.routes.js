/**
 * HR user and role administration routes.
 *
 * Mounted under /api/hr-manager, so the paths are
 *   GET    /api/hr-manager/rbac/catalogue
 *   GET    /api/hr-manager/rbac/roles
 *   POST   /api/hr-manager/rbac/roles
 *   PUT    /api/hr-manager/rbac/roles/:key
 *   GET    /api/hr-manager/hr-users
 *   POST   /api/hr-manager/hr-users
 *   GET    /api/hr-manager/hr-users/:id
 *   PUT    /api/hr-manager/hr-users/:id
 *   PUT    /api/hr-manager/hr-users/:id/permissions
 *   POST   /api/hr-manager/hr-users/:id/reset-password
 *   DELETE /api/hr-manager/hr-users/:id
 *
 * Each route names the exact permission it needs. Reading the list of staff is
 * `users.view`; changing what somebody may do is `users.permissions`. By
 * default only HR Admin's role grants any of them.
 */

import { Router } from 'express'
import { requirePermission } from '../middleware/rbac.middleware.js'

import {
  getRbacCatalogue,
  listAssignableRoles,
  createRole,
  updateRolePermissions,
  listHrUsers,
  getHrUser,
  createHrUser,
  updateHrUser,
  setHrUserPermissions,
  resetHrUserPassword,
  deleteHrUser,
} from '../controllers/hr-users.controller.js'

const router = Router()

// ── Catalogue ────────────────────────────────────────────────────────
// The permission list itself. Anyone who may look at staff may see what the
// permissions are called, because the screen that lists staff links to it.

router.get(
  '/rbac/catalogue',
  requirePermission('users.view', 'users.permissions'),
  getRbacCatalogue,
)

router.get('/rbac/roles', requirePermission('users.view', 'users.permissions'), listAssignableRoles)

// Inventing a role is the same power as reshaping one, so it carries the same
// guard: only somebody who already administers permissions may do it.
router.post('/rbac/roles', requirePermission('users.permissions'), createRole)

// Changing what a role grants is the permission-management permission itself.
router.put('/rbac/roles/:key', requirePermission('users.permissions'), updateRolePermissions)

// ── HR users ─────────────────────────────────────────────────────────

router.get('/hr-users', requirePermission('users.view'), listHrUsers)
router.get('/hr-users/:id', requirePermission('users.view'), getHrUser)

router.post('/hr-users', requirePermission('users.create'), createHrUser)
router.put('/hr-users/:id', requirePermission('users.edit'), updateHrUser)

router.put(
  '/hr-users/:id/permissions',
  requirePermission('users.permissions'),
  setHrUserPermissions,
)

// A password reset is an edit to the account, and the same guard applies: you
// cannot reset the password of somebody outranking you, which is how a lesser
// admin would otherwise take over an admin account.
router.post(
  '/hr-users/:id/reset-password',
  requirePermission('users.edit'),
  resetHrUserPassword,
)

router.delete('/hr-users/:id', requirePermission('users.delete'), deleteHrUser)

export default router
