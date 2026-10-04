import { useEffect, useRef, useState } from 'react'
import Button from '../components/Button.jsx'
import ScreenTitle from '../components/ScreenTitle.jsx'
import {
  MAX_SIDE,
  removeBackgroundSmart,
  removeSolidBackground,
} from '../lib/Bgremove.js'
import { baseName, canvasToBlob, downloadBlob, loadImage } from '../lib/Images.js'
import { FIELD, LABEL, PANEL, RANGE, SELECT } from '../lib/Ui.js'

const MAX_FILE_MB = 25
const CHECKERBOARD = {
  backgroundImage: 'repeating-conic-gradient(#e5e5e5 0% 25%, #ffffff 0% 50%)',
  backgroundSize: '20px 20px',
}
const SQUARE =
  'relative flex aspect-square w-full items-center justify-center overflow-hidden border-3 border-border bg-white shadow-hard'

// Quick mode: canvas only, no model. Resolves to { blob, removedFraction }.
async function quickRemove(img, tolerance) {
  const longest = Math.max(img.naturalWidth, img.naturalHeight)
  const scale = Math.min(1, MAX_SIDE / longest)
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, w, h)
  const pixels = ctx.getImageData(0, 0, w, h)
  const { removedFraction } = removeSolidBackground(pixels.data, w, h, tolerance)
  ctx.putImageData(pixels, 0, 0)
  const blob = await canvasToBlob(canvas)
  return { blob, removedFraction }
}

export default function BackgroundEraser() {
  const [method, setMethod] = useState('smart')
  const [tolerance, setTolerance] = useState(30)
  const [source, setSource] = useState(null) // { url, name, file, img }
  const [result, setResult] = useState(null) // { url, blob }
  const [status, setStatus] = useState('idle') // idle | working | done | error
  const [progress, setProgress] = useState(null) // { label, pct }
  const [notice, setNotice] = useState('')

  const fileRef = useRef(null)
  const sourceRef = useRef(null)
  const resultRef = useRef(null)
  const runRef = useRef(0)

  // Free both pictures when leaving the page.
  useEffect(() => {
    return () => {
      runRef.current += 1
      if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url)
      if (resultRef.current) URL.revokeObjectURL(resultRef.current.url)
    }
  }, [])

  function showResult(blob) {
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url)
    resultRef.current = blob ? { url: URL.createObjectURL(blob), blob } : null
    setResult(resultRef.current)
  }

  async function run(src, which, tol) {
    const id = ++runRef.current
    setStatus('working')
    setNotice('')
    setProgress(null)
    try {
      let blob
      let note = ''
      if (which === 'quick') {
        const out = await quickRemove(src.img, tol)
        blob = out.blob
        if (out.removedFraction < 0.02) {
          note = 'Almost nothing was removed. Raise the sensitivity, or use Smart mode for busy backgrounds.'
        } else if (out.removedFraction > 0.97) {
          note = 'Almost everything was removed. Lower the sensitivity.'
        }
      } else {
        blob = await removeBackgroundSmart(src.file, (key, current, total) => {
          if (id !== runRef.current) return
          setProgress({
            label: String(key).startsWith('fetch')
              ? 'Downloading the model (first time only)'
              : 'Removing the background',
            pct: total > 0 ? Math.min(100, Math.round((current / total) * 100)) : null,
          })
        })
      }
      if (id !== runRef.current) return
      showResult(blob)
      setStatus('done')
      setProgress(null)
      setNotice(note)
    } catch (error) {
      if (id !== runRef.current) return
      console.error(error)
      setStatus('error')
      setProgress(null)
      setNotice(
        which === 'smart'
          ? 'The AI model could not run. It needs an internet connection the first time. You can still use Quick mode for a plain background.'
          : 'That image could not be processed.',
      )
    }
  }

  async function chooseFile(file) {
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
    let img
    try {
      img = await loadImage(url)
    } catch {
      URL.revokeObjectURL(url)
      setNotice('That image could not be read.')
      return
    }
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url)
    sourceRef.current = { url, name: file.name, file, img }
    setSource(sourceRef.current)
    showResult(null)
    run(sourceRef.current, method, tolerance)
  }

  function handleFileChange(event) {
    chooseFile(event.target.files[0])
    event.target.value = ''
  }

  function handleDrop(event) {
    event.preventDefault()
    chooseFile(event.dataTransfer.files[0])
  }

  // Quick mode is instant, so moving the slider or switching to it re-runs it.
  // Smart mode downloads a model, so it only runs when you ask.
  useEffect(() => {
    if (method !== 'quick' || !sourceRef.current) return undefined
    const timer = setTimeout(() => run(sourceRef.current, 'quick', tolerance), 150)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, tolerance])

  function handleExport() {
    if (result && source) downloadBlob(result.blob, `${baseName(source.name)}-no-background.png`)
  }

  const working = status === 'working'

  return (
    <main className="mx-auto max-w-[1000px] p-4">
      <ScreenTitle id="eraser" title="Background Eraser" />

      <section className={`${PANEL} mb-6`} aria-label="Removal settings">
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_1fr_auto]">
          <div className={FIELD}>
            <label className={LABEL} htmlFor="method">Method</label>
            <select
              id="method"
              className={SELECT}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="smart">Smart (AI model, any background)</option>
              <option value="quick">Quick (one plain colour, works offline)</option>
            </select>
          </div>

          {method === 'quick' ? (
            <div className={FIELD}>
              <label className={LABEL} htmlFor="tolerance">Sensitivity: {tolerance}</label>
              <input
                id="tolerance"
                type="range"
                min="0"
                max="100"
                value={tolerance}
                className={RANGE}
                onChange={(e) => setTolerance(Number(e.target.value))}
              />
            </div>
          ) : (
            <p className="text-small">
              The model downloads once (tens of MB), then is cached by your browser. Your image never
              leaves your device.
            </p>
          )}

          <Button
            variant="success"
            onClick={() => run(source, method, tolerance)}
            disabled={!source || working}
          >
            Remove background
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col items-center gap-4">
          <div
            className={SQUARE}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {source ? (
              <img
                src={source.url}
                alt={`Original: ${source.name}`}
                className="size-full object-contain"
              />
            ) : (
              <p className="max-w-[24ch] p-4 text-center text-body">
                Drop an image here, or press Import Image.
              </p>
            )}
          </div>
          <Button onClick={() => fileRef.current.click()}>Import Image</Button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className={SQUARE} style={result ? CHECKERBOARD : undefined}>
            {result ? (
              <img
                src={result.url}
                alt={`Background removed from ${source?.name ?? 'the image'}`}
                className="size-full object-contain"
              />
            ) : (
              <p className="max-w-[24ch] p-4 text-center text-body">
                {working ? 'Working…' : 'The result appears here.'}
              </p>
            )}
            {working && progress && (
              <div className="absolute inset-x-0 bottom-0 border-t-3 border-border bg-bg p-3">
                <label className="block text-small font-semibold" htmlFor="eraser-progress">
                  {progress.label}
                  {progress.pct !== null && ` ${progress.pct}%`}
                </label>
                <progress
                  id="eraser-progress"
                  className="h-3 w-full accent-success"
                  max="100"
                  value={progress.pct ?? undefined}
                />
              </div>
            )}
          </div>
          <Button variant="success" onClick={handleExport} disabled={!result}>
            Export Image
          </Button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} hidden />

      <p role="status" aria-live="polite" className="mt-4 min-h-6 text-small">
        {notice}
      </p>
    </main>
  )
}