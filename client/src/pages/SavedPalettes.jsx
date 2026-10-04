import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PaletteCard from '../components/PaletteCard.jsx'
import ScreenTitle from '../components/ScreenTitle.jsx'

export default function SavedPalettes({ saved, onDelete }) {
  const navigate = useNavigate()
  const [tag, setTag] = useState('all')

  const tags = [...new Set(saved.flatMap((p) => p.tags))].sort()
  const activeTag = tags.includes(tag) ? tag : 'all'
  const shown = activeTag === 'all' ? saved : saved.filter((p) => p.tags.includes(activeTag))

  function confirmDelete(palette) {
    if (window.confirm(`Delete "${palette.name}"? This cannot be undone.`)) onDelete(palette.id)
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

      {saved.length === 0 ? (
        <p className="text-body">
          Nothing saved yet. Make a palette in{' '}
          <Link to="/palette" className="font-semibold underline">Palette Studio</Link> and press
          Save. Palettes are kept in this browser only.
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