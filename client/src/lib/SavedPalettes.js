import { useCallback, useEffect, useState } from 'react'
import * as api from '../api/index.js'
import { normalizeHex, PALETTE_SIZE } from './Palette.js'

/*
 * Saved palettes belong to a registered user and live in the database, through
 * src/api. Logged out, there is nothing to show and nothing can be saved.
 */

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/g

/** Trim, drop control characters, and cap the length. */
export function cleanText(value, max) {
  return String(value ?? '').replace(CONTROL, ' ').trim().slice(0, max)
}

/** Split "cute, pastel  ,  spring" into clean unique tags. */
export function parseTags(text) {
  const tags = text
    .split(',')
    .map((t) => cleanText(t, 24).toLowerCase())
    .filter(Boolean)
  return [...new Set(tags)].slice(0, 8)
}

// Anything arriving over the network is checked before it is used, so a damaged
// or tampered record can never reach the page (its colours end up in styles).
function isValid(item) {
  return (
    item &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    Array.isArray(item.tags) &&
    item.tags.every((t) => typeof t === 'string') &&
    Array.isArray(item.colors) &&
    item.colors.length === PALETTE_SIZE &&
    item.colors.every((c) => typeof c === 'string' && normalizeHex(c))
  )
}

const tidy = (item) => ({ ...item, colors: item.colors.map((c) => normalizeHex(c)) })

function toInput({ name, tags, colors }) {
  return {
    name: cleanText(name, 60) || 'Untitled palette',
    tags: tags.map((t) => cleanText(t, 24).toLowerCase()).filter(Boolean).slice(0, 8),
    colors: colors.map((c) => normalizeHex(c)),
  }
}

/**
 * @param user   the logged-in user, or null
 * @param ready  false while the login is still being checked
 * @returns { saved, status: 'loading' | 'ready' | 'error', error, add, remove }
 */
export function useSavedPalettes(user, ready = true) {
  const [saved, setSaved] = useState([])
  const [status, setStatus] = useState('ready')
  const [error, setError] = useState('')
  const userId = user?.id ?? null

  useEffect(() => {
    setSaved([])
    setError('')
    if (!userId) {
      setStatus('ready')
      return undefined
    }
    let cancelled = false
    setStatus('loading')
    api
      .listPalettes()
      .then((list) => {
        if (cancelled) return
        setSaved(list.filter(isValid).map(tidy))
        setStatus('ready')
      })
      .catch((e) => {
        if (cancelled) return
        setError(e.message)
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const add = useCallback(
    async (fields) => {
      if (!userId) throw new Error('Log in to save palettes')
      const created = tidy(await api.createPalette(toInput(fields)))
      setSaved((prev) => [created, ...prev])
      return created
    },
    [userId],
  )

  const remove = useCallback(
    async (id) => {
      await api.deletePalette(id)
      setSaved((prev) => prev.filter((p) => p.id !== id))
    },
    [],
  )

  return { saved, status: ready ? status : 'loading', error, add, remove }
}
