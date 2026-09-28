import jwt from 'jsonwebtoken'
import prisma from '../db.js'

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'hr-management-development-secret'

function normalizeRole(role) {
  const value = String(role || '')
    .trim()
    .toUpperCase()

  if (
    value === 'EMPLOYER' ||
    value === 'EMPLOYEE'
  ) {
    return 'EMPLOYEE'
  }

  if (
    value === 'HR' ||
    value === 'ADMIN' ||
    value === 'HR_ADMIN' ||
    value === 'HR_MANAGER'
  ) {
    return 'HR_MANAGER'
  }

  return value
}

export async function login(req, res) {
  try {
    const email = String(
      req.body?.email || '',
    )
      .trim()
      .toLowerCase()

    const password = String(
      req.body?.password || '',
    )

    if (!email || !password) {
      return res.status(400).json({
        message:
          'Email and password are required',
      })
    }

    const user =
      await prisma.user.findUnique({
        where: { email },
        include: {
          employee: true,
        },
      })

    if (
      !user ||
      user.password !== password
    ) {
      return res.status(401).json({
        message:
          'Invalid email or password',
      })
    }

    const role = normalizeRole(user.role)

    const token = jwt.sign(
      {
        userId: user.id,
        role,
        employeeRecordId:
          user.employeeId || null,
      },
      JWT_SECRET,
      {
        expiresIn: '8h',
      },
    )

    return res.json({
      id: user.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role,
      originalRole: user.role,

      mustChangePassword:
        Boolean(user.mustChangePassword),

      employeeId:
        user.employee?.employeeId ||
        null,

      employeeRecordId:
        user.employeeId || null,

      token,

      employee: user.employee
        ? {
            id: user.employee.id,
            employeeId:
              user.employee.employeeId,
            name: user.employee.name,
            email: user.employee.email,
            department:
              user.employee.department,
            jobTitle:
              user.employee.jobTitle,
            employmentStatus:
              user.employee
                .employmentStatus,
          }
        : null,
    })
  } catch (error) {
    console.error(
      'Login error:',
      error,
    )

    return res.status(500).json({
      message:
        'Login failed. Please check the server console for details.',
    })
  }
}

export async function changePassword(
  req,
  res,
) {
  try {
    const currentPassword = String(
      req.body?.currentPassword || '',
    )

    const newPassword = String(
      req.body?.newPassword || '',
    )

    if (
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        message:
          'Current password and new password are required.',
      })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message:
          'New password must be at least 8 characters.',
      })
    }

    if (
      newPassword === currentPassword
    ) {
      return res.status(400).json({
        message:
          'New password must be different from the temporary password.',
      })
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: req.user.userId,
        },
      })

    if (
      !user ||
      user.password !== currentPassword
    ) {
      return res.status(401).json({
        message:
          'Current password is incorrect.',
      })
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        password: newPassword,
        mustChangePassword: false,
      },
    })

    return res.json({
      success: true,
      message:
        'Password updated successfully.',
      mustChangePassword: false,
    })
  } catch (error) {
    console.error(
      'Change password error:',
      error,
    )

    return res.status(500).json({
      message:
        'Could not update password.',
    })
  }
}

export async function forgotPassword(
  req,
  res,
) {
  try {
    const email = String(
      req.body?.email || '',
    )
      .trim()
      .toLowerCase()

    const newPassword = String(
      req.body?.newPassword || '',
    )

    const confirmPassword = String(
      req.body?.confirmPassword || '',
    )

    if (
      !email ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        message:
          'Email, new password and password confirmation are required.',
      })
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      return res.status(400).json({
        message:
          'New password and confirmation do not match.',
      })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message:
          'Password must contain at least 8 characters.',
      })
    }

    const user =
      await prisma.user.findUnique({
        where: { email },
      })

    if (!user) {
      return res.status(404).json({
        message:
          'No account was found with this email address.',
      })
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        password: newPassword,
        mustChangePassword: false,
      },
    })

    return res.json({
      success: true,
      message:
        'Password updated successfully.',
    })
  } catch (error) {
    console.error(
      'Forgot password error:',
      error,
    )

    return res.status(500).json({
      message:
        'Unable to update password.',
    })
  }
}