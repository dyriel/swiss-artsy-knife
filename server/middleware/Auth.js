import jwt from 'jsonwebtoken'
import { HttpError } from './Errors.js'

export function signToken(user, secret) {
  return jwt.sign({ sub: user.id }, secret, { algorithm: 'HS256', expiresIn: '7d' })
}

export function requireAuth(secret) {
  return (req, _res, next) => {
    const header = req.get('authorization') || ''
    const [scheme, token] = header.split(' ')
    if (scheme !== 'Bearer' || !token) return next(new HttpError(401, 'Please log in'))
    try {
      const payload = jwt.verify(token, secret, { algorithms: ['HS256'] })
      req.userId = payload.sub
      next()
    } catch {
      next(new HttpError(401, 'Your session has expired. Please log in again'))
    }
  }
}
