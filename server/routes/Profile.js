import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { HttpError, wrap } from '../middleware/Errors.js'
import { requireAuth } from '../middleware/Auth.js'
import { validatePasswordChange, validateUsernameChange } from '../middleware/Validate.js'
import { COST } from './auth.js'

// The logged-in user's own account. There is no :id in these paths on purpose:
// the user is always the one named by the token, so nobody can edit someone else.
export default function profileRoutes({ pool, jwtSecret }) {
  const router = Router()
  router.use(requireAuth(jwtSecret))

  router.patch('/', wrap(async (req, res) => {
    const { username } = validateUsernameChange(req.body)
    try {
      const { rows } = await pool.query(
        'UPDATE users SET username = $1 WHERE id = $2 RETURNING id, email, username',
        [username, req.userId],
      )
      if (!rows[0]) throw new HttpError(401, 'Please log in')
      res.json({ user: rows[0] })
    } catch (error) {
      if (error.code === '23505') throw new HttpError(409, 'That username is taken')
      throw error
    }
  }))

  router.put('/password', wrap(async (req, res) => {
    const { currentPassword, newPassword } = validatePasswordChange(req.body)
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.userId])
    if (!rows[0]) throw new HttpError(401, 'Please log in')
    // Asking for the current password stops a borrowed, logged-in browser from
    // taking over the account.
    if (!(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
      throw new HttpError(403, 'Your current password is wrong')
    }
    if (await bcrypt.compare(newPassword, rows[0].password_hash)) {
      throw new HttpError(400, 'Choose a password you have not used for this account')
    }
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      await bcrypt.hash(newPassword, COST),
      req.userId,
    ])
    res.status(204).end()
  }))

  return router
}
