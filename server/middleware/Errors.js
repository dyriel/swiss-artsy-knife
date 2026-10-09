// An error the client is allowed to see.
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function notFound(_req, _res, next) {
  next(new HttpError(404, 'Not found'))
}

// Last middleware. Responds with a message only, never a stack trace or
// database detail, in any environment. Details go to the server log.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = 500
  let message = 'Something went wrong'

  if (err instanceof HttpError) {
    status = err.status
    message = err.message
  } else if (err?.type === 'entity.parse.failed') {
    status = 400
    message = 'Request body is not valid JSON'
  } else if (err?.type === 'entity.too.large') {
    status = 413
    message = 'Request body is too large'
  }

  if (status >= 500) console.error(err)
  res.status(status).json({ error: message })
}

// Express 4 does not catch rejected promises by itself.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
