// The simulated backend for demo mode. Same function names, return shapes and
// failure style as httpApi.js, so nothing else in the app can tell them apart.
//
// Accounts and palettes live in this browser's localStorage. That is NOT secure
// storage: it exists so the GitHub Pages demo works without a server. Never
// type a password you use anywhere else into a demo-mode site.
import { getToken } from './token.js'

const USERS = 'swiss-artsy-knife.demo.users'
const PALETTES = 'swiss-artsy-knife.demo.palettes'
const MAX_PER_USER = 100

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))

function readJson(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value))

async function digest(email, password) {
  const bytes = new TextEncoder().encode(`${email}\n${password}`)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function fail(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

const publicUser = ({ id, email, username }) => ({ id, email, username })
const session = (user) => ({ token: `demo-${user.id}`, user: publicUser(user) })

const USERNAME = /^[A-Za-z0-9_]{3,24}$/

function currentUser() {
  const token = getToken() || ''
  const id = token.startsWith('demo-') ? token.slice(5) : null
  const user = readJson(USERS).find((u) => u.id === id)
  if (!user) throw fail(401, 'Please log in')
  return user
}

function checkUsername(value, users, selfId) {
  const username = String(value ?? '').trim()
  if (!USERNAME.test(username)) {
    throw fail(400, 'Username must be 3 to 24 letters, numbers or underscores')
  }
  if (users.some((u) => u.id !== selfId && (u.username ?? '').toLowerCase() === username.toLowerCase())) {
    throw fail(409, 'That username is taken')
  }
  return username
}

export async function signup(email, username, password) {
  await delay()
  const clean = String(email).trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw fail(400, 'Enter a valid email address')
  if (String(password).length < 8) throw fail(400, 'Password must be at least 8 characters')
  const users = readJson(USERS)
  if (users.some((u) => u.email === clean)) throw fail(409, 'An account with that email already exists')
  const user = {
    id: crypto.randomUUID(),
    email: clean,
    username: checkUsername(username, users, null),
    hash: await digest(clean, password),
  }
  writeJson(USERS, [...users, user])
  return session(user)
}

export async function login(identifier, password) {
  await delay()
  const key = String(identifier).trim().toLowerCase()
  const user = readJson(USERS).find((u) => u.email === key || (u.username ?? '').toLowerCase() === key)
  if (!user || user.hash !== (await digest(user.email, password))) {
    throw fail(401, 'Email, username or password is wrong')
  }
  return session(user)
}

export async function fetchMe() {
  await delay(100)
  return { user: publicUser(currentUser()) }
}

export async function updateUsername(username) {
  await delay()
  const me = currentUser()
  const users = readJson(USERS)
  const next = checkUsername(username, users, me.id)
  writeJson(USERS, users.map((u) => (u.id === me.id ? { ...u, username: next } : u)))
  return { user: publicUser({ ...me, username: next }) }
}

export async function changePassword(currentPassword, newPassword) {
  await delay()
  const me = currentUser()
  if (me.hash !== (await digest(me.email, currentPassword))) throw fail(403, 'Your current password is wrong')
  if (String(newPassword).length < 8) throw fail(400, 'New password must be at least 8 characters')
  const hash = await digest(me.email, newPassword)
  if (hash === me.hash) throw fail(400, 'Choose a password you have not used for this account')
  writeJson(USERS, readJson(USERS).map((u) => (u.id === me.id ? { ...u, hash } : u)))
  return null
}

const mine = (user) => readJson(PALETTES).filter((p) => p.userId === user.id)
const publicShape = ({ userId, ...rest }) => rest // eslint-disable-line no-unused-vars

export async function listPalettes() {
  await delay()
  const user = currentUser()
  return mine(user)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(publicShape)
}

export async function createPalette(input) {
  await delay()
  const user = currentUser()
  if (mine(user).length >= MAX_PER_USER) {
    throw fail(409, `You can keep up to ${MAX_PER_USER} palettes. Delete one first`)
  }
  const created = {
    id: crypto.randomUUID(),
    userId: user.id,
    name: input.name,
    colors: input.colors,
    tags: input.tags,
    createdAt: new Date().toISOString(),
  }
  writeJson(PALETTES, [...readJson(PALETTES), created])
  return publicShape(created)
}

export async function updatePalette(id, input) {
  await delay()
  const user = currentUser()
  const all = readJson(PALETTES)
  const index = all.findIndex((p) => p.id === id && p.userId === user.id)
  if (index === -1) throw fail(404, 'Not found')
  all[index] = { ...all[index], ...input }
  writeJson(PALETTES, all)
  return publicShape(all[index])
}

export async function deletePalette(id) {
  await delay()
  const user = currentUser()
  const all = readJson(PALETTES)
  if (!all.some((p) => p.id === id && p.userId === user.id)) throw fail(404, 'Not found')
  writeJson(PALETTES, all.filter((p) => p.id !== id))
  return null
}
