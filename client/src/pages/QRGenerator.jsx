import { useEffect, useRef, useState } from 'react'
import Button from '../components/Button.jsx'
import ScreenTitle from '../components/ScreenTitle.jsx'
import { canvasToBlob, downloadBlob, loadImage } from '../lib/Images.js'
import {
  CORNER_STYLES,
  DOT_STYLES,
  EXPORT_SIZES,
  MAX_QR_BYTES,
  QR_PRESETS,
  colorWarnings,
  drawQr,
} from '../lib/Qr.js'
import { ALERT, COLOR_INPUT, FIELD, LABEL, PANEL, PANEL_HEADING, SELECT, TEXT_INPUT } from '../lib/Ui.js'

const PREVIEW_SIZE = 600
const MAX_LOGO_MB = 2

const byteLength = (text) => new TextEncoder().encode(text).length

export default function QRGenerator() {
  const [text, setText] = useState('')
  const [fg, setFg] = useState(QR_PRESETS[0].fg)
  const [bg, setBg] = useState(QR_PRESETS[0].bg)
  const [dotStyle, setDotStyle] = useState(QR_PRESETS[0].dot)
  const [cornerStyle, setCornerStyle] = useState(QR_PRESETS[0].corner)
  const [preset, setPreset] = useState(QR_PRESETS[0].id)
  const [logo, setLogo] = useState(null) // { img, url, name }
  const [size, setSize] = useState(1024)
  const [error, setError] = useState('')
  const [logoNotice, setLogoNotice] = useState('')

  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const logoRef = useRef(null)

  const bytes = byteLength(text)
  const tooLong = bytes > MAX_QR_BYTES
  const ready = text.trim() !== '' && !tooLong
  const warnings = colorWarnings(fg, bg)

  useEffect(() => {
    return () => {
      if (logoRef.current) URL.revokeObjectURL(logoRef.current.url)
    }
  }, [])

  // Redraw the preview whenever anything that changes the picture changes.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !ready) return
    try {
      drawQr(canvas, { text, size: PREVIEW_SIZE, fg, bg, dotStyle, cornerStyle, logo: logo?.img ?? null })
      setError('')
    } catch (e) {
      console.error(e)
      setError('That text could not be turned into a QR code. Try something shorter.')
    }
  }, [text, fg, bg, dotStyle, cornerStyle, logo, ready])

  function applyPreset(id) {
    const p = QR_PRESETS.find((x) => x.id === id)
    setPreset(id)
    if (!p) return
    setFg(p.fg)
    setBg(p.bg)
    setDotStyle(p.dot)
    setCornerStyle(p.corner)
  }

  // Touching any style control means the preset no longer describes the code.
  const custom = (setter) => (value) => {
    setter(value)
    setPreset('custom')
  }

  async function chooseLogo(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLogoNotice('That is not an image file.')
      return
    }
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      setLogoNotice(`Keep the logo under ${MAX_LOGO_MB} MB.`)
      return
    }
    const url = URL.createObjectURL(file)
    try {
      const img = await loadImage(url)
      if (logoRef.current) URL.revokeObjectURL(logoRef.current.url)
      logoRef.current = { img, url, name: file.name }
      setLogo(logoRef.current)
      setLogoNotice('')
    } catch {
      URL.revokeObjectURL(url)
      setLogoNotice('That image could not be read.')
    }
  }

  function removeLogo() {
    if (logoRef.current) URL.revokeObjectURL(logoRef.current.url)
    logoRef.current = null
    setLogo(null)
  }

  async function handleExport() {
    if (!ready) return
    try {
      const canvas = document.createElement('canvas')
      drawQr(canvas, { text, size, fg, bg, dotStyle, cornerStyle, logo: logo?.img ?? null })
      const blob = await canvasToBlob(canvas)
      downloadBlob(blob, 'qr-code.png')
    } catch (e) {
      console.error(e)
      setError('The image could not be exported.')
    }
  }

  return (
    <main className="mx-auto max-w-[1000px] p-4">
      <ScreenTitle id="qr" title="QR Generator" />

      <div className={`${FIELD} mb-6`}>
        <label className={LABEL} htmlFor="qr-text">Link or text</label>
        <input
          id="qr-text"
          type="text"
          className={TEXT_INPUT}
          value={text}
          placeholder="https://example.com"
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
        />
        <p className="text-small" aria-live="polite">
          {tooLong
            ? `Too long: ${bytes} of ${MAX_QR_BYTES} bytes. Shorten it.`
            : `${bytes} of ${MAX_QR_BYTES} bytes`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_1fr]">
        <section className={PANEL} aria-label="Style">
          <h2 className={PANEL_HEADING}>Style</h2>
          <div className="flex flex-col gap-4">
            <div className={FIELD}>
              <label className={LABEL} htmlFor="qr-preset">Preset</label>
              <select
                id="qr-preset"
                className={SELECT}
                value={preset}
                onChange={(e) => applyPreset(e.target.value)}
              >
                {preset === 'custom' && <option value="custom">Custom</option>}
                {QR_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={FIELD}>
                <label className={LABEL} htmlFor="qr-fg">Dot colour</label>
                <input
                  id="qr-fg"
                  type="color"
                  className={COLOR_INPUT}
                  value={fg}
                  onChange={(e) => custom(setFg)(e.target.value)}
                />
              </div>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="qr-bg">Background</label>
                <input
                  id="qr-bg"
                  type="color"
                  className={COLOR_INPUT}
                  value={bg}
                  onChange={(e) => custom(setBg)(e.target.value)}
                />
              </div>
            </div>

            {warnings.length > 0 && (
              <ul className={ALERT} role="status">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className={FIELD}>
                <label className={LABEL} htmlFor="qr-dots">Dot style</label>
                <select
                  id="qr-dots"
                  className={SELECT}
                  value={dotStyle}
                  onChange={(e) => custom(setDotStyle)(e.target.value)}
                >
                  {DOT_STYLES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="qr-corners">Corner style</label>
                <select
                  id="qr-corners"
                  className={SELECT}
                  value={cornerStyle}
                  onChange={(e) => custom(setCornerStyle)(e.target.value)}
                >
                  {CORNER_STYLES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={FIELD}>
              <span className={LABEL}>Logo in the middle (optional)</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => fileRef.current.click()}>
                  {logo ? 'Change logo' : 'Add logo'}
                </Button>
                {logo && (
                  <Button size="sm" variant="accent" onClick={removeLogo}>Remove</Button>
                )}
                {logo && <span className="min-w-0 truncate text-small">{logo.name}</span>}
              </div>
              <p className="text-small">{logoNotice || 'Always test-scan a code that has a logo.'}</p>
            </div>

            <div className={FIELD}>
              <label className={LABEL} htmlFor="qr-size">Export size</label>
              <select
                id="qr-size"
                className={SELECT}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              >
                {EXPORT_SIZES.map((s) => (
                  <option key={s} value={s}>{s} × {s} px</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div className="flex flex-col items-center gap-4">
          <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden border-3 border-border bg-white shadow-hard">
            {ready ? (
              <canvas
                ref={canvasRef}
                className="size-full"
                role="img"
                aria-label="QR code preview"
              />
            ) : (
              <p className="max-w-[24ch] p-4 text-center text-body">
                {tooLong ? 'The text is too long for a QR code.' : 'Type a link or text to see your QR code.'}
              </p>
            )}
          </div>
          <Button variant="success" onClick={handleExport} disabled={!ready || Boolean(error)}>
            Export Image
          </Button>
          <p role="status" aria-live="polite" className="min-h-6 text-small">{error}</p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          chooseLogo(e.target.files[0])
          e.target.value = ''
        }}
      />
    </main>
  )
}