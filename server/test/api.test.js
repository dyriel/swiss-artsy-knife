// Runs against a real PostgreSQL. Needs TEST_DATABASE_URL (a throwaway database).
//   TEST_DATABASE_URL=postgres://... npm test
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, describe, it } from 'node:test'
import pg from 'pg'
import { createApp } from '../App.js'

const url = process.env.TEST_DATABASE_URL
const SECRET = 'test-secret-test-secret-test-secret-123456'
const ORIGIN = 'https://allowed.example'

describe('API', { skip: !url && 'set TEST_DATABASE_URL to run' }, () => {
  let pool, server, base

  const call = async (method, path, { token, body, raw, headers } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(body !== undefined || raw ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
    })
    const text = await res.text()
    return { status: res.status, headers: res.headers, json: text ? JSON.parse(text) : null, text }
  }

  const nameOf = (email) => email.split('@')[0].replace(/[^a-z0-9_]/gi, '_').slice(0, 24)

  const signup = async (email, username = nameOf(email)) => {
    const r = await call('POST', '/api/auth/signup', { body: { email, username, password: 'correct horse' } })
    assert.equal(r.status, 201, r.text)
    return r.json.token
  }

  const palette = (over = {}) => ({
    name: 'Sunset',
    tags: ['warm', 'poster'],
    colors: ['#112233', '#445566', '#778899', '#aabbcc', '#ddeeff'],
    ...over,
  })

  before(async () => {
    pool = new pg.Pool({ connectionString: url })
    await pool.query('DROP TABLE IF EXISTS palettes, users CASCADE')
    await pool.query(await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8'))
    const app = createApp({ pool, jwtSecret: SECRET, corsOrigins: [ORIGIN], authLimit: 1000 })
    server = app.listen(0)
    base = `http://127.0.0.1:${server.address().port}`
  })

  after(async () => {
    server.close()
    await pool.end()
  })

  it('health and readiness', async () => {
    assert.equal((await call('GET', '/healthz')).status, 200)
    assert.equal((await call('GET', '/readyz')).status, 200)
  })

  it('signup validates input and rejects duplicates', async () => {
    const post = (body) => call('POST', '/api/auth/signup', { body })
    const good = { email: 'a@b.co', username: 'mia_01', password: 'longenough' }
    assert.equal((await post({ ...good, email: 'nope' })).status, 400)
    assert.equal((await post({ ...good, password: 'short' })).status, 400)
    assert.equal((await post({ ...good, password: 'x'.repeat(80) })).status, 400)
    for (const username of ['ab', 'x'.repeat(25), 'has space', 'semi;colon', 'a@b', '<b>', undefined, 5]) {
      assert.equal((await post({ ...good, username })).status, 400, String(username))
    }
    assert.equal((await call('POST', '/api/auth/signup', { body: [] })).status, 400)
    await signup('dupe@example.com', 'dupe_user')
    const sameEmail = await post({ email: 'DUPE@example.com', username: 'other_name', password: 'correct horse' })
    assert.equal(sameEmail.status, 409)
    assert.match(sameEmail.json.error, /email/)
    const sameName = await post({ email: 'new@example.com', username: 'DUPE_USER', password: 'correct horse' })
    assert.equal(sameName.status, 409)
    assert.match(sameName.json.error, /username/)
  })

  it('stores a hash, never the password', async () => {
    await signup('hash@example.com')
    const { rows } = await pool.query("SELECT password_hash FROM users WHERE email = 'hash@example.com'")
    assert.match(rows[0].password_hash, /^\$2[aby]\$12\$/)
    assert.ok(!rows[0].password_hash.includes('correct horse'))
  })

  it('login works with email or username, and wrong credentials look the same', async () => {
    await signup('login@example.com', 'Login_User')
    const byEmail = await call('POST', '/api/auth/login', { body: { identifier: 'Login@Example.com', password: 'correct horse' } })
    assert.equal(byEmail.status, 200)
    assert.ok(byEmail.json.token)
    assert.deepEqual(Object.keys(byEmail.json.user).sort(), ['email', 'id', 'username'])
    const byName = await call('POST', '/api/auth/login', { body: { identifier: 'login_user', password: 'correct horse' } })
    assert.equal(byName.status, 200)
    assert.equal(byName.json.user.username, 'Login_User')
    const bad = await call('POST', '/api/auth/login', { body: { identifier: 'login@example.com', password: 'wrong password' } })
    const none = await call('POST', '/api/auth/login', { body: { identifier: 'ghost', password: 'wrong password' } })
    assert.equal(bad.status, 401)
    assert.equal(none.status, 401)
    assert.equal(bad.json.error, none.json.error)
    assert.equal((await call('POST', '/api/auth/login', { body: { password: 'x' } })).status, 400)
  })

  it('profile: change username', async () => {
    const t = await signup('rename@example.com', 'old_name')
    await signup('taken@example.com', 'taken_name')
    const ok = await call('PATCH', '/api/profile', { token: t, body: { username: 'New_Name' } })
    assert.equal(ok.status, 200)
    assert.equal(ok.json.user.username, 'New_Name')
    assert.equal((await call('GET', '/api/auth/me', { token: t })).json.user.username, 'New_Name')
    // Keeping your own name, in a different case, is allowed.
    assert.equal((await call('PATCH', '/api/profile', { token: t, body: { username: 'new_name' } })).status, 200)
    assert.equal((await call('PATCH', '/api/profile', { token: t, body: { username: 'TAKEN_name' } })).status, 409)
    assert.equal((await call('PATCH', '/api/profile', { token: t, body: { username: 'no' } })).status, 400)
    assert.equal((await call('PATCH', '/api/profile', { body: { username: 'abc' } })).status, 401)
  })

  it('profile: change password needs the current one', async () => {
    const t = await signup('pw@example.com', 'pw_user')
    const put = (body, token = t) => call('PUT', '/api/profile/password', { token, body })
    assert.equal((await put({ currentPassword: 'wrong one', newPassword: 'brand new pass' })).status, 403)
    assert.equal((await put({ currentPassword: 'correct horse', newPassword: 'short' })).status, 400)
    assert.equal((await put({ currentPassword: 'correct horse', newPassword: 'correct horse' })).status, 400)
    assert.equal((await put({ newPassword: 'brand new pass' })).status, 400)
    assert.equal((await put({ currentPassword: 'correct horse', newPassword: 'brand new pass' })).status, 204)
    const login = (password) => call('POST', '/api/auth/login', { body: { identifier: 'pw@example.com', password } })
    assert.equal((await login('correct horse')).status, 401)
    assert.equal((await login('brand new pass')).status, 200)
    assert.equal((await put({ currentPassword: 'x', newPassword: 'whatever pass' }, null)).status, 401)
  })

  it('palette routes need a valid token', async () => {
    assert.equal((await call('GET', '/api/palettes')).status, 401)
    assert.equal((await call('GET', '/api/palettes', { token: 'garbage' })).status, 401)
    const forged = (await import('jsonwebtoken')).default.sign({ sub: 'x' }, 'other-secret-other-secret-other-secret')
    assert.equal((await call('GET', '/api/palettes', { token: forged })).status, 401)
  })

  it('palettes persist across logins and are private to their owner', async () => {
    const t1 = await signup('owner@example.com')
    const created = await call('POST', '/api/palettes', { token: t1, body: palette() })
    assert.equal(created.status, 201)
    assert.deepEqual(created.json.colors, ['#112233', '#445566', '#778899', '#AABBCC', '#DDEEFF'])
    assert.ok(created.json.createdAt)

    // "Log off" and back on: a new token still sees the palette.
    const again = await call('POST', '/api/auth/login', { body: { identifier: 'owner@example.com', password: 'correct horse' } })
    const list = await call('GET', '/api/palettes', { token: again.json.token })
    assert.equal(list.json.length, 1)
    assert.equal(list.json[0].name, 'Sunset')

    // Someone else cannot see, change or delete it.
    const t2 = await signup('other@example.com')
    assert.deepEqual((await call('GET', '/api/palettes', { token: t2 })).json, [])
    const id = created.json.id
    assert.equal((await call('PUT', `/api/palettes/${id}`, { token: t2, body: { name: 'Mine now' } })).status, 404)
    assert.equal((await call('DELETE', `/api/palettes/${id}`, { token: t2 })).status, 404)
    assert.equal((await call('GET', '/api/palettes', { token: t1 })).json.length, 1)
  })

  it('update and delete', async () => {
    const t = await signup('edit@example.com')
    const { json } = await call('POST', '/api/palettes', { token: t, body: palette() })
    const put = await call('PUT', `/api/palettes/${json.id}`, { token: t, body: { name: 'Renamed', tags: ['x'] } })
    assert.equal(put.status, 200)
    assert.equal(put.json.name, 'Renamed')
    assert.deepEqual(put.json.tags, ['x'])
    assert.equal(put.json.colors.length, 5)
    assert.equal((await call('DELETE', `/api/palettes/${json.id}`, { token: t })).status, 204)
    assert.equal((await call('DELETE', `/api/palettes/${json.id}`, { token: t })).status, 404)
    assert.equal((await call('DELETE', '/api/palettes/not-a-uuid', { token: t })).status, 404)
  })

  it('rejects invalid palette payloads before touching the database', async () => {
    const t = await signup('invalid@example.com')
    const bad = [
      palette({ name: '' }),
      palette({ name: 'x'.repeat(61) }),
      palette({ name: 'line\nbreak' }),
      palette({ name: 42 }),
      palette({ colors: ['#112233'] }),
      palette({ colors: ['#112233', '#445566', '#778899', '#aabbcc', 'red'] }),
      palette({ tags: new Array(9).fill('a').map((a, i) => a + i) }),
      palette({ tags: ['x'.repeat(25)] }),
      palette({ tags: [1] }),
      [],
      'text',
    ]
    for (const body of bad) {
      const r = await call('POST', '/api/palettes', { token: t, body })
      assert.equal(r.status, 400, JSON.stringify(body))
    }
    assert.equal((await call('POST', '/api/palettes', { token: t, raw: '{not json' })).status, 400)
    assert.equal((await call('POST', '/api/palettes', { token: t, raw: JSON.stringify({ name: 'x'.repeat(20000) }) })).status, 413)
  })

  it('stores hostile text as plain data, safely', async () => {
    const t = await signup('inject@example.com')
    const name = `x'); DROP TABLE palettes;-- <img src=x onerror=alert(1)>`
    const r = await call('POST', '/api/palettes', { token: t, body: palette({ name }) })
    assert.equal(r.status, 201)
    assert.equal(r.json.name, name)
    assert.equal((await call('GET', '/api/palettes', { token: t })).status, 200)
  })

  it('caps palettes per user', async () => {
    const t = await signup('cap@example.com')
    const { rows } = await pool.query("SELECT id FROM users WHERE email = 'cap@example.com'")
    await pool.query(
      `INSERT INTO palettes (user_id, name, colors) SELECT $1, 'n' || g, ARRAY['#000000','#000000','#000000','#000000','#000000'] FROM generate_series(1, 100) g`,
      [rows[0].id],
    )
    assert.equal((await call('POST', '/api/palettes', { token: t, body: palette() })).status, 409)
  })

  it('errors never leak internals', async () => {
    const broken = createApp({
      pool: { query: async () => { throw new Error('connection to 10.0.0.5 failed: password=hunter2') } },
      jwtSecret: SECRET,
    })
    const s = broken.listen(0)
    try {
      const r = await fetch(`http://127.0.0.1:${s.address().port}/readyz`)
      const text = await r.text()
      assert.equal(r.status, 500)
      assert.equal(text, '{"error":"Something went wrong"}')
    } finally {
      s.close()
    }
    const missing = await call('GET', '/api/nothing-here')
    assert.equal(missing.status, 404)
    assert.ok(!missing.text.includes('at '))
  })

  it('CORS only allows listed origins', async () => {
    const allowed = await call('GET', '/healthz', { headers: { Origin: ORIGIN } })
    assert.equal(allowed.headers.get('access-control-allow-origin'), ORIGIN)
    const denied = await call('GET', '/healthz', { headers: { Origin: 'https://evil.example' } })
    assert.equal(denied.headers.get('access-control-allow-origin'), null)
    const preflight = await call('OPTIONS', '/api/palettes', {
      headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' },
    })
    assert.equal(preflight.headers.get('access-control-allow-origin'), null)
    // The browser sends a preflight before PATCH, so the real site must be allowed to.
    const patch = await call('OPTIONS', '/api/profile', {
      headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'PATCH' },
    })
    assert.match(patch.headers.get('access-control-allow-methods'), /PATCH/)
  })

  it('sets security headers and hides Express', async () => {
    const r = await call('GET', '/healthz')
    assert.equal(r.headers.get('x-powered-by'), null)
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff')
  })

  it('rate limits login attempts', async () => {
    const app = createApp({ pool, jwtSecret: SECRET, authLimit: 3 })
    const s = app.listen(0)
    try {
      const codes = []
      for (let i = 0; i < 5; i++) {
        const r = await fetch(`http://127.0.0.1:${s.address().port}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: 'x@example.com', password: 'whatever' }),
        })
        codes.push(r.status)
      }
      assert.deepEqual(codes, [401, 401, 401, 429, 429])
    } finally {
      s.close()
    }
  })
})
