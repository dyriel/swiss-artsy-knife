import { Link } from 'react-router-dom'


const VARIANTS = {
  primary: { tile: 'bg-primary', icon: 'border-border' },
  accent: { tile: 'bg-accent', icon: 'border-border' },
  success: { tile: 'bg-success text-on-success', icon: 'border-on-success' },
}

const TILE =
  'flex flex-col items-center gap-2 border-3 border-border px-4 py-6 shadow-hard ' +
  'font-heading text-headline-3 font-bold transition-[transform,box-shadow] duration-75 ' +
  'active:translate-x-1.5 active:translate-y-1.5 active:shadow-none ' +
  'focus-visible:outline-3 focus-visible:outline-border focus-visible:outline-offset-3'

export default function ToolTile({ label, variant = 'primary', path }) {
  const styles = VARIANTS[variant]
  const content = (
    <>
      <span className={`size-10 border-2 ${styles.icon}`} aria-hidden="true" />
      <span>{label}</span>
    </>
  )

  if (path) {
    return (
      <Link className={`${TILE} ${styles.tile}`} to={path}>
        {content}
      </Link>
    )
  }

  return (
    <a className={`${TILE} ${styles.tile}`} href="#">
      {content}
    </a>
  )
}