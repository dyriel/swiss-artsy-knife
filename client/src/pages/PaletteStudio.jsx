import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Button from '../components/Button.jsx'
import ScreenTitle from '../components/ScreenTitle.jsx'
import Swatch from '../components/Swatch.jsx'
import { canvasToBlob, downloadBlob, loadImage } from '../lib/Images.js'
import {
  INITIAL_HEXES,
  PALETTE_SIZE,
  THEMES,
  drawPaletteStrip,
  extractPalette,
  generatePalette,
  makeSwatches,
  normalizeHex,
} from '../lib/Palette.js'
import { parseTags } from '../lib/Savedpalettes.js'

const MAX_FILE_MB = 25
const FIELD_LABEL = 'text-small font-semibold'
const TEXT_INPUT =
  'rounded-none border-2 border-border bg-white px-2 py-1.5 font-body text-body text-text ' +
  'focus-visible:outline-3 focus-visible:outline-border focus-visible:outline-offset-2'
const SEGMENT =
  'cursor-pointer px-4 py-1.5 font-heading text-body font-medium ' +
  'focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-border'

function startingHexes(state) {
  const colors = state?.colors
  if (Array.isArray(colors) && colors.length === PALETTE_SIZE) {
    const clean = colors.map(normalizeHex)
    if (clean.every(Boolean)) return clean
  }
  return INITIAL_HEXES
}

export default function PaletteStudio({ onSave }) {
  const location = useLocation()
  const [swatches, setSwatches] = useState(() => makeSwatches(startingHexes(location.state)))
  const [theme, setTheme] = useState('random')
  const [mode, setMode] = useState('randomize')
  const [image, setImage] = useState(null)
  const [name, setName] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [notice, setNotice] = useState('')
  const [savedName, setSavedName] = useState('')

  const fileRef = useRef(null)
  const imageRef = useRef(null)

  // Free the picture's memory when leaving the page.
  useEffect(() => {
    return () => {
      if (imageRef.current) URL.revokeObjectURL(imageRef.current.url)
    }
  }, [])

  const hexes = swatches.map((s) => s.hex)

  function randomize(nextTheme = theme) {
    setSwatches((prev) => generatePalette(nextTheme, prev))
    setNotice('')
  }

  function changeTheme(next) {
    setTheme(next)
    randomize(next)
  }

  function setHex(index, hex) {
    setSwatches((prev) => prev.map((s, i) => (i === index ? { ...s, hex } : s)))
  }

  function toggleLock(index) {
    setSwatches((prev) => prev.map((s, i) => (i === index ? { ...s, locked: !s.locked } : s)))
  }

  async function copyHex(hex) {
    try {
      await navigator.clipboard.writeText(hex)
      setNotice(`Copied ${hex}`)
    } catch {
      setNotice(`Could not copy automatically. The colour is ${hex}.`)
    }
  }

  async function useImage(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setNotice('That is not an image file.')
      return
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setNotice(`That image is larger than ${MAX_FILE_MB} MB.`)
      return
    }
    const url = URL.createObjectURL(file)
    try {
      const img = await loadImage(url)
      // Work on a small copy: plenty to find the dominant colours, and fast.
      const longest = Math.max(img.naturalWidth, img.naturalHeight)
      const scale = Math.min(1, 200 / longest)
      const w = Math.max(1, Math.round(img.naturalWidth * scale))
      const h = Math.max(1, Math.round(img.naturalHeight * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0, w, h)
      const colors = extractPalette(ctx.getImageData(0, 0, w, h).data, PALETTE_SIZE)

      if (imageRef.current) URL.revokeObjectURL(imageRef.current.url)
      imageRef.current = { url, name: file.name }
      setImage(imageRef.current)

      setSwatches((prev) => {
        let k = 0
        return prev.map((s) => (s.locked || !colors[k] ? s : { ...s, hex: colors[k++] }))
      })
      setNotice('Colours taken from your image. Locked swatches were kept.')
    } catch {
      URL.revokeObjectURL(url)
      setNotice('That image could not be read.')
    }
  }

  function handleFileChange(event) {
    useImage(event.target.files[0])
    event.target.value = ''
  }

  function handleDrop(event) {
    event.preventDefault()
    useImage(event.dataTransfer.files[0])
  }

  function handleSave(event) {
    event.preventDefault()
    const item = onSave({ name, tags: parseTags(tagsText), colors: hexes })
    setSavedName(item.name)
    setName('')
    setTagsText('')
    setNotice('')
  }

  async function handleExport() {
    const canvas = document.createElement('canvas')
    drawPaletteStrip(canvas, hexes)
    const blob = await canvasToBlob(canvas)
    if (blob) downloadBlob(blob, 'palette.png')
  }

  return (
    <main className="mx-auto max-w-[900px] p-4">
      <ScreenTitle id="palette" title="Palette Studio">
        <div className="flex items-center gap-2">
          <label htmlFor="theme" className={FIELD_LABEL}>Theme</label>
          <select
            id="theme"
            className={`${TEXT_INPUT} border-dashed`}
            value={theme}
            onChange={(e) => changeTheme(e.target.value)}
          >
            {Object.entries(THEMES).map(([id, t]) => (
              <option key={id} value={id}>{t.label}</option>
            ))}
          </select>
        </div>
      </ScreenTitle>

      <div role="group" aria-label="Palette source" className="mb-4 inline-flex border-3 border-border bg-white">
        <button
          type="button"
          aria-pressed={mode === 'randomize'}
          onClick={() => setMode('randomize')}
          className={`${SEGMENT} border-r-3 border-border ${mode === 'randomize' ? 'bg-primary' : ''}`}
        >
          Randomize
        </button>
        <button
          type="button"
          aria-pressed={mode === 'extract'}
          onClick={() => setMode('extract')}
          className={`${SEGMENT} ${mode === 'extract' ? 'bg-primary' : ''}`}
        >
          From image
        </button>
      </div>

      {mode === 'extract' && (
        <section
          className="mb-4 flex flex-wrap items-center gap-4 border-3 border-border bg-surface p-4 shadow-hard"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          aria-label="Pick colours from an image"
        >
          {image ? (
            <img
              src={image.url}
              alt={`Source image: ${image.name}`}
              className="max-h-40 max-w-full border-2 border-border object-contain"
            />
          ) : (
            <p className="max-w-[40ch] text-body">
              Drop an image here, or import one. Its dominant colours fill the swatches.
            </p>
          )}
          <div className="flex flex-col items-start gap-2">
            <Button onClick={() => fileRef.current.click()}>
              {image ? 'Choose another' : 'Import image'}
            </Button>
            <p className="text-small">Locked swatches keep their colour.</p>
          </div>
        </section>
      )}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} hidden />

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Palette">
        {swatches.map((swatch, i) => (
          <Swatch
            key={swatch.id}
            swatch={swatch}
            index={i}
            onChangeHex={(hex) => setHex(i, hex)}
            onToggleLock={() => toggleLock(i)}
            onCopy={() => copyHex(swatch.hex)}
          />
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <Button onClick={() => randomize()}>Randomize</Button>
        <Button variant="success" onClick={handleExport}>Export palette</Button>
      </div>

      <p role="status" aria-live="polite" className="mt-2 min-h-6 text-small">
        {notice}
      </p>

      <form
        onSubmit={handleSave}
        className="mt-4 border-3 border-border bg-surface p-4 shadow-hard"
        aria-labelledby="save-heading"
      >
        <h2 id="save-heading" className="mb-4 text-headline-3">Save this palette</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="palette-name" className={FIELD_LABEL}>Name</label>
            <input
              id="palette-name"
              className={TEXT_INPUT}
              value={name}
              maxLength={60}
              placeholder="Spring zine"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="palette-tags" className={FIELD_LABEL}>Tags, separated by commas</label>
            <input
              id="palette-tags"
              className={TEXT_INPUT}
              value={tagsText}
              maxLength={120}
              placeholder="pastel, poster"
              onChange={(e) => setTagsText(e.target.value)}
            />
          </div>
          <Button type="submit" variant="accent">Save</Button>
        </div>
        {savedName && (
          <p className="mt-3 text-small" role="status">
            Saved &ldquo;{savedName}&rdquo;.{' '}
            <Link to="/saved" className="font-semibold underline">View saved palettes</Link>
          </p>
        )}
      </form>
    </main>
  )
}