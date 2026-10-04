import { useState } from 'react'
import { normalizeHex } from '../lib/Palette.js'

/*
 * A text box for a hex colour. You can type freely; a valid value (#abc,
 * abc, #aabbcc) is applied as you type, and while it is invalid the box
 * shows it but keeps the last good colour. Leaving the box restores the
 * current colour.
 */
export default function HexInput({ value, onCommit, label, className = '' }) {
  const [draft, setDraft] = useState(null)
  const invalid = draft !== null && !normalizeHex(draft)

  return (
    <input
      type="text"
      aria-label={label}
      aria-invalid={invalid}
      spellCheck={false}
      autoComplete="off"
      maxLength={7}
      className={`${className} ${invalid ? 'text-[#b00020]' : ''}`}
      value={draft ?? value}
      onChange={(event) => {
        const text = event.target.value
        setDraft(text)
        const hex = normalizeHex(text)
        if (hex) onCommit(hex)
      }}
      onBlur={() => setDraft(null)}
    />
  )
}