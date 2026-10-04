// Simple line icons for the four tools. They use currentColor, so they follow the text colour.
const ICONS = {
  palette: (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={6 + i * 18} y="14" width="16" height="72" />
      ))}
    </>
  ),
  eraser: (
    <>
      <g transform="rotate(-35 50 50)">
        <rect x="14" y="34" width="72" height="32" />
        <line x1="46" y1="34" x2="46" y2="66" />
      </g>
      <line x1="10" y1="90" x2="90" y2="90" />
    </>
  ),
  zine: (
    <>
      <rect x="6" y="22" width="88" height="56" />
      <line x1="28" y1="22" x2="28" y2="78" />
      <line x1="50" y1="22" x2="50" y2="78" />
      <line x1="72" y1="22" x2="72" y2="78" />
      <line x1="28" y1="50" x2="72" y2="50" strokeWidth="8" />
    </>
  ),
  qr: (
    <>
      <rect x="8" y="8" width="30" height="30" />
      <rect x="62" y="8" width="30" height="30" />
      <rect x="8" y="62" width="30" height="30" />
      <rect x="18" y="18" width="10" height="10" fill="currentColor" />
      <rect x="72" y="18" width="10" height="10" fill="currentColor" />
      <rect x="18" y="72" width="10" height="10" fill="currentColor" />
      <rect x="52" y="52" width="10" height="10" fill="currentColor" />
      <rect x="72" y="52" width="10" height="10" fill="currentColor" />
      <rect x="52" y="76" width="10" height="10" fill="currentColor" />
      <rect x="78" y="78" width="14" height="14" fill="currentColor" />
    </>
  ),
}

export default function ToolIcon({ id, className = 'size-8' }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      className={className}
      aria-hidden="true"
    >
      {ICONS[id]}
    </svg>
  )
}