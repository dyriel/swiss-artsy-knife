import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from './Button.jsx'
import { TOOLS } from '../lib/Tools.js'

export default function Header() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const closeDrawer = () => setOpen(false)

  return (
    <header className="border-b-3 border-border bg-bg">
      <div className="flex items-center gap-4 p-4">
        <button
          className="md:hidden cursor-pointer border-3 border-border bg-bg px-2.5 py-1 text-[1.3rem] shadow-hard-sm focus-visible:outline-3 focus-visible:outline-border focus-visible:outline-offset-3"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          &#9776;
        </button>

        <Link to="/" className="flex-1 font-heading text-headline-2 font-bold">
          Swiss Artsy Knife
        </Link>

        <nav className="hidden gap-6 font-semibold md:flex" aria-label="Main">
          {TOOLS.map((tool) => (
            <Link key={tool.id} to={tool.path}>
              {tool.label}
            </Link>
          ))}
        </nav>

        <Button variant="accent" size="sm" onClick={() => navigate('/saved')}>
          Saved
        </Button>
      </div>

      {open && (
        <nav
          className="flex flex-col border-t-3 border-border md:hidden [&_a]:border-b [&_a]:border-border [&_a]:p-4 [&_a]:font-semibold"
          aria-label="Mobile"
        >
          <Link to="/" onClick={closeDrawer}>
            Home
          </Link>
          {TOOLS.map((tool) => (
            <Link key={tool.id} to={tool.path} onClick={closeDrawer}>
              {tool.label}
            </Link>
          ))}
          <Link to="/saved" onClick={closeDrawer}>
            Saved
          </Link>
        </nav>
      )}
    </header>
  )
}