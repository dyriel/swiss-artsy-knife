import { readableText } from '../lib/Palette.js'
import HexInput from './HexInput.jsx'

const ACTION =
  'cursor-pointer py-1.5 font-heading text-small font-medium text-text ' +
  'hover:bg-primary focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-border'

// One column of Palette Studio: colour block, editable hex, Lock and Copy.
export default function Swatch({ swatch, index, onChangeHex, onToggleLock, onCopy }) {
  return (
    <li className="flex min-w-0 flex-col border-3 border-border bg-white">
      <div
        role="img"
        aria-label={`Swatch ${index + 1}: ${swatch.hex}${swatch.locked ? ', locked' : ''}`}
        className="h-32 border-b-3 border-border p-2 font-heading text-small font-bold md:h-56"
        style={{ background: swatch.hex, color: readableText(swatch.hex) }}
      >
        {swatch.locked && 'Locked'}
      </div>

      <HexInput
        value={swatch.hex}
        onCommit={onChangeHex}
        label={`Hex colour of swatch ${index + 1}`}
        className="w-full border-b-3 border-border bg-white px-2 py-1.5 text-center font-heading text-body font-bold uppercase focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-border"
      />

      <div className="grid grid-cols-2">
        <button
          type="button"
          aria-pressed={swatch.locked}
          onClick={onToggleLock}
          className={`${ACTION} border-r-3 border-border ${swatch.locked ? 'bg-accent' : ''}`}
        >
          {swatch.locked ? 'Unlock' : 'Lock'}
        </button>
        <button type="button" onClick={onCopy} className={ACTION}>
          Copy
        </button>
      </div>
    </li>
  )
}