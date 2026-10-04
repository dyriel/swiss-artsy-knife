import { useCallback, useEffect, useState } from 'react'
import { normalizeHex, PALETTE_SIZE } from './Palette.js'

/*
 * Saved palettes, kept in this browser's localStorage.
 *
 * This is the demo-mode store. When the Express API exists, replace the body
 * of these functions with calls through src/api (the same interface the
 * template uses for sightings) and the pages will not need to change.
 */

const KEY = 'swiss-artsy-knife.saved-palettes'
const MAX_SAVED = 100

function isValid(item) {
  return (
    item &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    Array.isArray(item.tags) &&
    Array.isArray(item.colors) &&
    item.colors.length === PALETTE_SIZE &&
    item.colors.every((c) => normalizeHex(c))
  )
}

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(raw) ? raw.filter(isValid) : []
  } catch {
    return []
  }
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Split "cute, pastel  ,  spring" into clean unique tags. */
export function parseTags(text) {
  const tags = text
    .split(',')
    .map((t) => t.trim().toLowerCase().slice(0, 24))
    .filter(Boolean)
  return [...new Set(tags)].slice(0, 8)
}

export function useSavedPalettes() {
  const [saved, setSaved] = useState(read)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved))
    } catch {
      // Storage can be unavailable (private mode); saving then lasts until reload.
    }
  }, [saved])

  const add = useCallback(({ name, tags, colors }) => {
    const item = {
      id: newId(),
      name: name.trim().slice(0, 60) || 'Untitled palette',
      tags,
      colors: colors.map((c) => normalizeHex(c)),
      createdAt: new Date().toISOString(),
    }
    setSaved((prev) => [item, ...prev].slice(0, MAX_SAVED))
    return item
  }, [])

  const remove = useCallback((id) => {
    setSaved((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const update = useCallback((id, patch) => {
    setSaved((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }, [])

  return { saved, add, remove, update }
}