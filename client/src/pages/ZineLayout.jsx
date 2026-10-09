import { useEffect, useRef, useState } from 'react'
import Button from '../components/Button.jsx'
import ScreenTitle from '../components/ScreenTitle.jsx'
import {
  BLEED_MM,
  DEFAULT_SETTINGS,
  DPI_OPTIONS,
  FOLD_TYPES,
  MAX_PAGES,
  PAPER_SIZES,
  dpiToPxPerMm,
  drawSheet,
  pageCount,
  pageSizeMm,
  sheetPixels,
} from '../lib/zineLayout.js'

const SETTINGS_KEY = 'swiss-artsy-knife.zine-settings'
const MAX_FILE_MB = 25
const PREVIEW_PX_PER_MM = 6

// Shared Tailwind class strings for the settings form.
const FIELD = 'flex min-w-0 flex-col gap-1'
const LABEL = 'text-small font-semibold'
const SELECT =
  'rounded-none border-2 border-border bg-white px-2 py-1.5 font-body text-body text-text ' +
  'focus-visible:outline-3 focus-visible:outline-border focus-visible:outline-offset-2'
const CHECK = 'flex items-center gap-2 text-body font-semibold'
const CHECKBOX =
  'size-[18px] accent-success focus-visible:outline-3 focus-visible:outline-border focus-visible:outline-offset-2'
const SUBHEADING = 'mb-2 mt-6 text-headline-2'

function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY))
    return {
      fold: raw.fold in FOLD_TYPES ? raw.fold : DEFAULT_SETTINGS.fold,
      paper: raw.paper in PAPER_SIZES ? raw.paper : DEFAULT_SETTINGS.paper,
      dpi: DPI_OPTIONS.some((o) => o.value === raw.dpi) ? raw.dpi : DEFAULT_SETTINGS.dpi,
      bleed: raw.bleed === true,
      guides: raw.guides !== false,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function release(slot) {
  if (slot) URL.revokeObjectURL(slot.url)
}

export default function ZineLayout() {
  const [settings, setSettings] = useState(loadSettings)
  const [slots, setSlots] = useState(() => Array(MAX_PAGES).fill(null))
  const [problems, setProblems] = useState([])

  const slotsRef = useRef(slots)
  const idRef = useRef(0)
  const previewRef = useRef(null)
  const bulkInputRef = useRef(null)
  const slotInputRef = useRef(null)
  const targetRef = useRef(null)

  const pages = pageCount(settings.fold)
  const visibleSlots = slots.slice(0, pages)
  const filledCount = visibleSlots.filter(Boolean).length
  const page = pageSizeMm(settings)
  const exportSize = sheetPixels(settings, dpiToPxPerMm(settings.dpi))

  function commitSlots(next) {
    slotsRef.current = next
    setSlots(next)
  }

  // Remember the settings (not the images) between visits.
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // Storage can be unavailable (private mode); the page works without it.
    }
  }, [settings])

  // Free the image memory when leaving the page.
  useEffect(() => {
    return () => slotsRef.current.forEach(release)
  }, [])

  // Live preview: the same renderer the export uses, at a fixed screen scale.
  useEffect(() => {
    if (!previewRef.current) return
    drawSheet(previewRef.current, {
      settings,
      slots,
      pxPerMm: PREVIEW_PX_PER_MM,
      placeholders: true,
    })
  }, [settings, slots])

  function updateSetting(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  async function addFiles(fileList, target) {
    const files = Array.from(fileList)
    const notes = []
    const loaded = []

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        notes.push(`${file.name} is not an image file.`)
        continue
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        notes.push(`${file.name} is larger than ${MAX_FILE_MB} MB.`)
        continue
      }
      const url = URL.createObjectURL(file)
      try {
        const img = await loadImage(url)
        idRef.current += 1
        loaded.push({ id: idRef.current, name: file.name, url, img, fit: 'fill' })
      } catch {
        URL.revokeObjectURL(url)
        notes.push(`${file.name} could not be read as an image.`)
      }
    }

    const next = [...slotsRef.current]
    if (target !== null) {
      if (loaded[0]) {
        release(next[target])
        next[target] = loaded[0]
      }
    } else {
      let i = 0
      for (const item of loaded) {
        while (i < pages && next[i]) i++
        if (i >= pages) {
          URL.revokeObjectURL(item.url)
          notes.push(`No empty page left for ${item.name}.`)
          continue
        }
        next[i] = item
        i++
      }
    }
    commitSlots(next)
    setProblems(notes)
  }

  function handleBulkChange(event) {
    addFiles(event.target.files, null)
    event.target.value = ''
  }

  function handleSlotChange(event) {
    if (targetRef.current !== null) addFiles(event.target.files, targetRef.current)
    event.target.value = ''
  }

  function pickForSlot(index) {
    targetRef.current = index
    slotInputRef.current.click()
  }

  function removeSlot(index) {
    const next = [...slotsRef.current]
    release(next[index])
    next[index] = null
    commitSlots(next)
  }

  function moveSlot(index, direction) {
    const other = index + direction
    if (other < 0 || other >= pages) return
    const next = [...slotsRef.current]
    ;[next[index], next[other]] = [next[other], next[index]]
    commitSlots(next)
  }

  function toggleFit(index) {
    const next = [...slotsRef.current]
    next[index] = { ...next[index], fit: next[index].fit === 'fill' ? 'fit' : 'fill' }
    commitSlots(next)
  }

  function clearAll() {
    slotsRef.current.forEach(release)
    commitSlots(Array(MAX_PAGES).fill(null))
    setProblems([])
  }

  function handleExport() {
    const canvas = document.createElement('canvas')
    drawSheet(canvas, {
      settings,
      slots: slotsRef.current,
      pxPerMm: dpiToPxPerMm(settings.dpi),
      placeholders: false,
    })
    canvas.toBlob((blob) => {
      if (!blob) {
        setProblems(['The sheet could not be exported. Try a lower DPI.'])
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `zine-${settings.paper}-${settings.dpi}dpi${settings.bleed ? '-bleed' : ''}.png`
      link.href = url
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, 'image/png')
  }

  return (
    <main className="mx-auto max-w-[900px] p-4">
      <ScreenTitle id="zine" title="Zine Layout" />

      <p className="mb-4 max-w-[60ch] text-body">
        Add your page artwork in reading order: page 1 is the front cover and the last page is the
        back cover. The sheet below shows where each page lands and which are printed upside
        down so the zine reads correctly once folded.
      </p>

      <section
        className="mb-6 border-3 border-border bg-surface p-4 shadow-hard"
        aria-labelledby="settings-heading"
      >
        <h2 id="settings-heading" className="mb-4 text-headline-3">Sheet settings</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className={FIELD}>
            <label className={LABEL} htmlFor="fold">Fold type</label>
            <select
              id="fold"
              className={SELECT}
              value={settings.fold}
              onChange={(e) => updateSetting('fold', e.target.value)}
            >
              {Object.entries(FOLD_TYPES).map(([id, fold]) => (
                <option key={id} value={id}>{fold.label}</option>
              ))}
            </select>
          </div>

          <div className={FIELD}>
            <label className={LABEL} htmlFor="paper">Paper size</label>
            <select
              id="paper"
              className={SELECT}
              value={settings.paper}
              onChange={(e) => updateSetting('paper', e.target.value)}
            >
              {Object.entries(PAPER_SIZES).map(([id, paper]) => (
                <option key={id} value={id}>{paper.label}</option>
              ))}
            </select>
          </div>

          <div className={FIELD}>
            <label className={LABEL} htmlFor="dpi">Export resolution</label>
            <select
              id="dpi"
              className={SELECT}
              value={settings.dpi}
              onChange={(e) => updateSetting('dpi', Number(e.target.value))}
            >
              {DPI_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className={`${FIELD} justify-center gap-2`}>
            <label className={CHECK}>
              <input
                type="checkbox"
                className={CHECKBOX}
                checked={settings.bleed}
                onChange={(e) => updateSetting('bleed', e.target.checked)}
              />
              {BLEED_MM} mm bleed
            </label>
            <label className={CHECK}>
              <input
                type="checkbox"
                className={CHECKBOX}
                checked={settings.guides}
                onChange={(e) => updateSetting('guides', e.target.checked)}
              />
              Fold and cut guides
            </label>
          </div>
        </div>
        <p className="mt-2 text-small">
          Each page is {page.w.toFixed(1)} x {page.h.toFixed(1)} mm. Export is {exportSize.width} x{' '}
          {exportSize.height} px.
          {settings.bleed && ' Bleed extends the outer pages past the trim edge of the sheet.'}
        </p>
      </section>

      <h2 className={SUBHEADING}>Pages</h2>
      <ol className="mb-4 grid grid-cols-2 items-start gap-x-2 gap-y-4 md:grid-cols-4">
        {visibleSlots.map((slot, i) => (
          <li className="flex min-w-0 flex-col gap-1.5" key={i}>
            <div
              className="relative overflow-hidden border-3 border-dashed border-border bg-surface"
              style={{ aspectRatio: `${page.w} / ${page.h}` }}
            >
              <span className="absolute left-1 top-1 z-10 border border-border bg-bg px-1 font-heading text-[0.7rem] font-bold">
                {i + 1}
              </span>
              {slot ? (
                <img
                  src={slot.url}
                  alt={`Page ${i + 1}: ${slot.name}`}
                  className="block size-full"
                  style={{ objectFit: slot.fit === 'fit' ? 'contain' : 'cover' }}
                />
              ) : (
                <button
                  type="button"
                  className="absolute inset-0 w-full cursor-pointer font-heading text-body font-bold text-text hover:bg-primary focus-visible:outline-3 focus-visible:-outline-offset-6 focus-visible:outline-border"
                  onClick={() => pickForSlot(i)}
                  aria-label={`Add an image to page ${i + 1}`}
                >
                  + Add
                </button>
              )}
            </div>
            {slot && (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Page ${i + 1} controls`}>
                <Button
                  size="xs"
                  onClick={() => moveSlot(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move page ${i + 1} earlier`}
                >
                  &larr;
                </Button>
                <Button
                  size="xs"
                  onClick={() => moveSlot(i, 1)}
                  disabled={i === pages - 1}
                  aria-label={`Move page ${i + 1} later`}
                >
                  &rarr;
                </Button>
                <Button
                  size="xs"
                  onClick={() => toggleFit(i)}
                  aria-label={`Page ${i + 1} image mode: ${slot.fit === 'fill' ? 'fill, crops to cover' : 'fit, shows whole image'}. Press to change.`}
                >
                  {slot.fit === 'fill' ? 'Fill' : 'Fit'}
                </Button>
                <Button
                  size="xs"
                  onClick={() => pickForSlot(i)}
                  aria-label={`Replace image on page ${i + 1}`}
                >
                  Swap
                </Button>
                <Button
                  variant="accent"
                  size="xs"
                  onClick={() => removeSlot(i)}
                  aria-label={`Remove image from page ${i + 1}`}
                >
                  &times;
                </Button>
              </div>
            )}
          </li>
        ))}
      </ol>

      <input
        ref={bulkInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleBulkChange}
        hidden
      />
      <input ref={slotInputRef} type="file" accept="image/*" onChange={handleSlotChange} hidden />

      <div className="mb-2 mt-4 flex flex-wrap gap-4">
        <Button onClick={() => bulkInputRef.current.click()}>Import images</Button>
        <Button variant="accent" onClick={clearAll} disabled={filledCount === 0}>
          Clear all
        </Button>
      </div>
      <p className="mt-2 text-small">
        Import fills the empty pages in order. Images up to {MAX_FILE_MB} MB each.
      </p>

      {problems.length > 0 && (
        <ul
          className="my-4 list-disc border-3 border-border bg-accent py-2 pl-10 pr-4 text-small"
          role="alert"
        >
          {problems.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      <h2 className={SUBHEADING}>Imposed sheet preview</h2>
      <canvas
        ref={previewRef}
        className="block h-auto w-full border-3 border-border bg-white shadow-hard"
        role="img"
        aria-label={`Imposed ${PAPER_SIZES[settings.paper].label} sheet with ${filledCount} of ${pages} pages filled`}
      />

      <div className="mb-2 mt-4 flex flex-wrap gap-4">
        <Button variant="success" onClick={handleExport} disabled={filledCount === 0}>
          Export PNG
        </Button>
      </div>
    </main>
  )
}
