import { createApp } from './App.js'
import { pool } from './db/pool.js'

const secret = process.env.JWT_SECRET
if (!secret || secret.length < 32) {
  console.error('JWT_SECRET must be set to at least 32 characters. See .env.example.')
  process.exit(1)
}

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean)

const app = createApp({
  pool,
  jwtSecret: secret,
  corsOrigins,
  trustProxy: process.env.TRUST_PROXY === '1',
})

const port = Number(process.env.PORT) || 3000
app.listen(port, () => console.log(`API listening on port ${port}`))
