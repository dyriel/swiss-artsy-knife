// The real client. Every function here talks to the Express API in server/.
import { getToken } from './token.js'

const BASE = import.meta.env.VITE_API_BASE_URL || ''

async function request(path, options = {}) {
  const token = getToken()
  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again')
  }

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`
    try {
      const body = await response.json()
      if (body?.error) message = body.error
    } catch {
      // The body was not JSON. The status line is all we have.
    }
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return response.status === 204 ? null : response.json()
}

const send = (method, body) => ({ method, body: JSON.stringify(body) })

export const signup = (email, username, password) =>
  request('/api/auth/signup', send('POST', { email, username, password }))
export const login = (identifier, password) =>
  request('/api/auth/login', send('POST', { identifier, password }))
export const fetchMe = () => request('/api/auth/me')

export const updateUsername = (username) => request('/api/profile', send('PATCH', { username }))
export const changePassword = (currentPassword, newPassword) =>
  request('/api/profile/password', send('PUT', { currentPassword, newPassword }))

export const listPalettes = () => request('/api/palettes')
export const createPalette = (input) => request('/api/palettes', send('POST', input))
export const updatePalette = (id, input) => request(`/api/palettes/${id}`, send('PUT', input))
export const deletePalette = (id) => request(`/api/palettes/${id}`, { method: 'DELETE' })
