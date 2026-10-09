import { Router } from 'express'
import { HttpError, wrap } from '../middleware/Errors.js'
import { requireAuth } from '../middleware/Auth.js'
import { MAX_PER_USER, validateId, validatePalette } from '../middleware/Validate.js'

export default function paletteRoutes({ pool, jwtSecret }) {
  const router = Router()
  // Every route below belongs to the logged-in user and only ever touches their rows.
  router.use(requireAuth(jwtSecret))

  router.get('/', wrap(async (req, res) => {
    const { rows } = await pool.query(
      'SELECT id, name, colors, tags, created_at AS "createdAt" FROM palettes WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId],
    )
    res.json(rows)
  }))

  router.post('/', wrap(async (req, res) => {
    const input = validatePalette(req.body)
    const { rows: counted } = await pool.query(
      'SELECT count(*)::int AS n FROM palettes WHERE user_id = $1',
      [req.userId],
    )
    if (counted[0].n >= MAX_PER_USER) {
      throw new HttpError(409, `You can keep up to ${MAX_PER_USER} palettes. Delete one first`)
    }
    const { rows } = await pool.query(
      `INSERT INTO palettes (user_id, name, colors, tags)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, colors, tags, created_at AS "createdAt"`,
      [req.userId, input.name, input.colors, input.tags],
    )
    res.status(201).json(rows[0])
  }))

  router.put('/:id', wrap(async (req, res) => {
    const id = validateId(req.params.id)
    const input = validatePalette(req.body, { partial: true })
    const { rows } = await pool.query(
      `UPDATE palettes
          SET name   = COALESCE($3, name),
              colors = COALESCE($4, colors),
              tags   = COALESCE($5, tags)
        WHERE id = $1 AND user_id = $2
        RETURNING id, name, colors, tags, created_at AS "createdAt"`,
      [id, req.userId, input.name ?? null, input.colors ?? null, input.tags ?? null],
    )
    if (!rows[0]) throw new HttpError(404, 'Not found')
    res.json(rows[0])
  }))

  router.delete('/:id', wrap(async (req, res) => {
    const id = validateId(req.params.id)
    const { rowCount } = await pool.query(
      'DELETE FROM palettes WHERE id = $1 AND user_id = $2',
      [id, req.userId],
    )
    if (!rowCount) throw new HttpError(404, 'Not found')
    res.status(204).end()
  }))

  return router
}
