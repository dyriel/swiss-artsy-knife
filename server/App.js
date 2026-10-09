import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { errorHandler, notFound, wrap } from './middleware/Errors.js'
import authRoutes from './routes/Auth.js'
import paletteRoutes from './routes/Palettes.js'
import profileRoutes from './routes/Profile.js'

/**
 * Builds the Express app. Dependencies come in as arguments so the tests can
 * hand it their own pool and secret.
 */
export function createApp({ pool, jwtSecret, corsOrigins = [], trustProxy = false, authLimit = 20 }) {
  const app = express()
  if (trustProxy) app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(helmet())

  // Only the listed origins get CORS headers. Anything else is blocked by the
  // browser. The API uses a Bearer token, not cookies, so credentials are off.
  app.use(cors({
    origin(origin, callback) {
      // No Origin header means curl or a server, not a browser page.
      callback(null, !origin || corsOrigins.includes(origin))
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }))

  app.use(express.json({ limit: '10kb' }))

  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }))
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: authLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts. Try again in a few minutes' },
  })

  app.get('/healthz', (_req, res) => res.json({ ok: true }))
  app.get('/readyz', wrap(async (_req, res) => {
    await pool.query('SELECT 1')
    res.json({ ok: true })
  }))

  app.use('/api/auth/signup', authLimiter)
  app.use('/api/auth/login', authLimiter)
  app.use('/api/profile/password', authLimiter)
  app.use('/api/auth', authRoutes({ pool, jwtSecret }))
  app.use('/api/profile', profileRoutes({ pool, jwtSecret }))
  app.use('/api/palettes', paletteRoutes({ pool, jwtSecret }))

  app.use(notFound)
  app.use(errorHandler)
  return app
}
