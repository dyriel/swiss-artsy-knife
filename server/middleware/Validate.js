import { HttpError } from './Errors.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME = /^[A-Za-z0-9_]{3,24}$/
const HEX = /^#[0-9a-f]{6}$/i
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Control characters (including newlines) have no place in a name or tag.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/

export const PALETTE_SIZE = 5
export const MAX_PER_USER = 100

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function checkPassword(value, label) {
  const password = typeof value === 'string' ? value : ''
  if (password.length < 8) throw new HttpError(400, `${label} must be at least 8 characters`)
  // bcrypt only reads the first 72 bytes; reject rather than silently truncate.
  if (Buffer.byteLength(password) > 72) throw new HttpError(400, `${label} must be at most 72 bytes`)
  return password
}

function checkUsername(value) {
  const username = typeof value === 'string' ? value.trim() : ''
  if (!USERNAME.test(username)) {
    throw new HttpError(400, 'Username must be 3 to 24 letters, numbers or underscores')
  }
  return username
}

export function validateSignup(body) {
  if (!isPlainObject(body)) throw new HttpError(400, 'Send a JSON object')
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!EMAIL.test(email) || email.length > 254) throw new HttpError(400, 'Enter a valid email address')
  return {
    email,
    username: checkUsername(body.username),
    password: checkPassword(body.password, 'Password'),
  }
}

// "identifier" is an email or a username. Usernames cannot contain "@", so the
// two can never be confused.
export function validateLogin(body) {
  if (!isPlainObject(body)) throw new HttpError(400, 'Send a JSON object')
  const identifier = typeof body.identifier === 'string' ? body.identifier.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!identifier || identifier.length > 254) throw new HttpError(400, 'Enter your email or username')
  if (!password || Buffer.byteLength(password) > 72) throw new HttpError(400, 'Enter your password')
  return { identifier, password }
}

export function validateUsernameChange(body) {
  if (!isPlainObject(body)) throw new HttpError(400, 'Send a JSON object')
  return { username: checkUsername(body.username) }
}

export function validatePasswordChange(body) {
  if (!isPlainObject(body)) throw new HttpError(400, 'Send a JSON object')
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  if (!currentPassword || Buffer.byteLength(currentPassword) > 72) {
    throw new HttpError(400, 'Enter your current password')
  }
  return { currentPassword, newPassword: checkPassword(body.newPassword, 'New password') }
}

function cleanName(value) {
  if (typeof value !== 'string') throw new HttpError(400, 'Name must be text')
  const name = value.trim()
  if (name.length < 1 || name.length > 60) throw new HttpError(400, 'Name must be 1 to 60 characters')
  if (CONTROL.test(name)) throw new HttpError(400, 'Name contains characters that are not allowed')
  return name
}

function cleanTags(value) {
  if (!Array.isArray(value) || value.length > 8) throw new HttpError(400, 'Use at most 8 tags')
  const tags = value.map((t) => {
    if (typeof t !== 'string') throw new HttpError(400, 'Tags must be text')
    const tag = t.trim().toLowerCase()
    if (tag.length < 1 || tag.length > 24 || CONTROL.test(tag)) {
      throw new HttpError(400, 'Each tag must be 1 to 24 characters')
    }
    return tag
  })
  return [...new Set(tags)]
}

function cleanColors(value) {
  if (!Array.isArray(value) || value.length !== PALETTE_SIZE) {
    throw new HttpError(400, `A palette needs exactly ${PALETTE_SIZE} colours`)
  }
  return value.map((c) => {
    if (typeof c !== 'string' || !HEX.test(c)) throw new HttpError(400, 'Colours must look like #A1B2C3')
    return c.toUpperCase()
  })
}

export function validatePalette(body, { partial = false } = {}) {
  if (!isPlainObject(body)) throw new HttpError(400, 'Send a JSON object')
  const out = {}
  if (!partial || 'name' in body) out.name = cleanName(body.name)
  if (!partial || 'tags' in body) out.tags = cleanTags(body.tags ?? [])
  if (!partial || 'colors' in body) out.colors = cleanColors(body.colors)
  if (partial && Object.keys(out).length === 0) throw new HttpError(400, 'Nothing to update')
  return out
}

export function validateId(id) {
  if (!UUID.test(id)) throw new HttpError(404, 'Not found')
  return id
}
