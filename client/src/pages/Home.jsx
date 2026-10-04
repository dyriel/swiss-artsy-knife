import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import PaletteCard from '../components/PaletteCard.jsx'
import ToolTile from '../components/ToolTile.jsx'
import { TOOLS } from '../lib/Tools.js'

export default function Home({ saved }) {
  const navigate = useNavigate()
  const recent = saved.slice(0, 3)

  return (
    <main>
      <section className="flex flex-col items-center gap-4 px-4 py-10 text-center">
        <div
          className="aspect-video w-full max-w-[420px] border-3 border-border shadow-hard bg-[repeating-linear-gradient(45deg,var(--color-bg),var(--color-bg)_10px,var(--color-primary)_10px,var(--color-primary)_11px)]"
          aria-hidden="true"
        />
        <h1 className="max-w-[26ch] text-[clamp(1.75rem,6vw,2.25rem)] font-medium">
          Your creative toolkit, all in one place.
        </h1>
        <p className="max-w-[42ch] text-body-lg">
          Palettes, backgrounds, zines, and QR codes, no accounts, no fees.
        </p>
        <Button variant="success" onClick={() => navigate('/palette')}>
          Get started
        </Button>
      </section>

      <section
        className="mx-auto mb-10 grid max-w-[900px] grid-cols-2 gap-4 p-4 md:grid-cols-4"
        aria-label="Tools"
      >
        {TOOLS.map((tool) => (
          <ToolTile key={tool.id} {...tool} />
        ))}
      </section>

      {recent.length > 0 && (
        <section className="mx-auto mb-10 max-w-[900px] px-4" aria-labelledby="recent-heading">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="recent-heading" className="text-headline-2">Recently saved</h2>
            <Link to="/saved" className="font-semibold underline">
              See all
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {recent.map((palette) => (
              <PaletteCard
                key={palette.id}
                palette={palette}
                onOpen={(p) => navigate('/palette', { state: { colors: p.colors } })}
              />
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}