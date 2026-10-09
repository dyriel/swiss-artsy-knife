import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { HttpError, wrap } from '../middleware/Errors.js'
import { requireAuth, signToken } from '../middleware/Auth.js'
import { validateLogin, validateSignup } from '../middleware/Validate.js'

export const COST = 12
// Compared against when the account is unknown, so a miss takes as long as a hit.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', COST)

// What the client is allowed to know about a user. Never the hash.
const publicUser = ({ id, email, username }) => ({ id, email, username })

export default function authRoutes({ pool, jwtSecret }) {
  const router = Router()

  router.post('/signup', wrap(async (req, res) => {
    const { email, username, password } = validateSignup(req.body)
    const hash = await bcrypt.hash(password, COST)
    try {
      const { rows } = await pool.query(
        'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username',
        [email, username, hash],
      )
      res.status(201).json({ token: signToken(rows[0], jwtSecret), user: publicUser(rows[0]) })
    } catch (error) {
      if (error.code === '23505') {
        throw new HttpError(
          409,
          error.constraint === 'users_email_key'
            ? 'An account with that email already exists'
            : 'That username is taken',
        )
      }
      throw error
    }
  }))

  router.post('/login', wrap(async (req, res) => {
    const { identifier, password } = validateLogin(req.body)
    const { rows } = await pool.query(
      'SELECT id, email, username, password_hash FROM users WHERE email = $1 OR lower(username) = $1 LIMIT 1',
      [identifier],
    )
    const user = rows[0]
    const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH)
    if (!user || !ok) throw new HttpError(401, 'Email, username or password is wrong')
    res.json({ token: signToken(user, jwtSecret), user: publicUser(user) })
  }))

  router.get('/me', requireAuth(jwtSecret), wrap(async (req, res) => {
    const { rows } = await pool.query('SELECT id, email, username FROM users WHERE id = $1', [req.userId])
    if (!rows[0]) throw new HttpError(401, 'Please log in')
    res.json({ user: publicUser(rows[0]) })
  }))

  return router
}
