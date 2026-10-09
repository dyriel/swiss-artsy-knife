import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PaletteCard from '../components/PaletteCard.jsx'
import ScreenTitle from '../components/ScreenTitle.jsx'
import { ALERT_BOX } from '../lib/Ui.js'

export default function SavedPalettes({ palettes }) {
  const { saved, status, error, remove } = palettes
  const navigate = useNavigate()
  const [tag, setTag] = useState('all')
  const [problem, setProblem] = useState('')

  const tags = [...new Set(saved.flatMap((p) => p.tags))].sort()
  const activeTag = tags.includes(tag) ? tag : 'all'
  const shown = activeTag === 'all' ? saved : saved.filter((p) => p.tags.includes(activeTag))

  async function confirmDelete(palette) {
    if (!window.confirm(`Delete "${palette.name}"? This cannot be undone.`)) return
    setProblem('')
    try {
      await remove(palette.id)
    } catch (e) {
      setProblem(`Could not delete: ${e.message}`)
    }
  }

  return (
    <main className="mx-auto max-w-[900px] p-4">
      <ScreenTitle id="palette" title="Saved palettes">
        {tags.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="tag-filter" className="text-small font-semibold">Tag</label>
            <select
              id="tag-filter"
              className="rounded-none border-2 border-border bg-white px-2 py-1.5 font-body text-body text-text focus-visible:outline-3 focus-visible:outline-border focus-visible:outline-offset-2"
              value={activeTag}
              onChange={(e) => setTag(e.target.value)}
            >
              <option value="all">All</option>
              {tags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}
      </ScreenTitle>

      {problem && <p className={`${ALERT_BOX} mb-4`} role="alert">{problem}</p>}

      {status === 'loading' ? (
        <p className="text-body" role="status">Loading your palettes…</p>
      ) : status === 'error' ? (
        <p className={ALERT_BOX} role="alert">Could not load your palettes: {error}</p>
      ) : saved.length === 0 ? (
        <p className="text-body">
          Nothing saved yet. Make a palette in{' '}
          <Link to="/palette" className="font-semibold underline">Palette Studio</Link> and press
          Save. Saved palettes are kept on your account.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {shown.map((palette) => (
            <PaletteCard
              key={palette.id}
              palette={palette}
              onOpen={(p) => navigate('/palette', { state: { colors: p.colors } })}
              onDelete={confirmDelete}
            />
          ))}
        </ul>
      )}
    </main>
  )
}
