import qrcode from 'qrcode-generator'
import { contrastRatio, luminance } from './Palette.js'

// Encode text as UTF-8 so accents and emoji survive.
qrcode.stringToBytes = (text) => Array.from(new TextEncoder().encode(text))

export const DOT_STYLES = [
  { id: 'square', label: 'Square' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'dots', label: 'Round dots' },
]

export const CORNER_STYLES = [
  { id: 'square', label: 'Square' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'circle', label: 'Circle' },
]

// Every preset keeps a contrast ratio of at least 4.5 : 1 so the code stays scannable.
export const QR_PRESETS = [
  { id: 'classic', label: 'Classic', fg: '#000000', bg: '#FFFFFF', dot: 'square', corner: 'square' },
  { id: 'ink', label: 'Ink', fg: '#343827', bg: '#FBF8CD', dot: 'rounded', corner: 'rounded' },
  { id: 'grape', label: 'Grape', fg: '#5B2A5B', bg: '#FBF8CD', dot: 'dots', corner: 'circle' },
  { id: 'blush', label: 'Blush', fg: '#343827', bg: '#EA9EB6', dot: 'dots', corner: 'rounded' },
]

export const EXPORT_SIZES = [512, 1024, 2048]

// Roughly the most text a level-H code can hold (version 40, byte mode).
export const MAX_QR_BYTES = 1273

/** Builds the module matrix. Throws if the text is too long to encode. */
export function buildQr(text, level = 'H') {
  const qr = qrcode(0, level)
  qr.addData(text, 'Byte')
  qr.make()
  return qr
}

/**
 * Warnings about colour choices that make a code hard to scan. Returns a list
 * of short messages, empty if the colours are fine.
 */
export function colorWarnings(fg, bg) {
  const warnings = []
  if (contrastRatio(fg, bg) < 3) {
    warnings.push('Low contrast: this code may not scan. Make the two colours more different.')
  } else if (luminance(fg) > luminance(bg)) {
    warnings.push('Light dots on a dark background (inverted) do not scan on some readers.')
  }
  return warnings
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

// One of the three 7x7 finder "eyes": outer ring, inner gap, centre block.
function drawEye(ctx, x, y, cell, style, fg, bg) {
  const layers = [
    { inset: 0, size: 7, color: fg },
    { inset: 1, size: 5, color: bg },
    { inset: 2, size: 3, color: fg },
  ]
  for (const { inset, size, color } of layers) {
    const px = x + inset * cell
    const py = y + inset * cell
    const s = size * cell
    ctx.fillStyle = color
    if (style === 'circle') {
      ctx.beginPath()
      ctx.arc(px + s / 2, py + s / 2, s / 2, 0, Math.PI * 2)
      ctx.fill()
    } else if (style === 'rounded') {
      roundedRect(ctx, px, py, s, s, s * 0.28)
      ctx.fill()
    } else {
      const left = Math.round(px)
      const top = Math.round(py)
      ctx.fillRect(left, top, Math.round(px + s) - left, Math.round(py + s) - top)
    }
  }
}

/**
 * Draw a styled QR code onto `canvas` (which is resized to size x size).
 * Throws if `text` cannot be encoded. A logo forces error level H so the
 * covered middle can be recovered by the scanner.
 */
export function drawQr(
  canvas,
  { text, size = 512, fg, bg, dotStyle = 'square', cornerStyle = 'square', logo = null },
) {
  const qr = buildQr(text, 'H')
  const count = qr.getModuleCount()
  const quiet = 4
  const total = count + quiet * 2
  const cell = size / total

  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = fg

  const inEye = (r, c) =>
    (r < 7 && c < 7) || (r < 7 && c >= count - 7) || (r >= count - 7 && c < 7)

  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (!qr.isDark(r, c) || inEye(r, c)) continue
      const x = (quiet + c) * cell
      const y = (quiet + r) * cell
      if (dotStyle === 'dots') {
        ctx.beginPath()
        // Slightly oversize so neighbouring dots touch: isolated small dots fail to scan.
        ctx.arc(x + cell / 2, y + cell / 2, cell * 0.56, 0, Math.PI * 2)
        ctx.fill()
      } else if (dotStyle === 'rounded') {
        roundedRect(ctx, x, y, cell, cell, cell * 0.38)
        ctx.fill()
      } else {
        // Snap edges to whole pixels so neighbouring squares leave no hairline gaps.
        const left = Math.floor(x)
        const top = Math.floor(y)
        ctx.fillRect(left, top, Math.ceil(x + cell) - left, Math.ceil(y + cell) - top)
      }
    }
  }

  drawEye(ctx, quiet * cell, quiet * cell, cell, cornerStyle, fg, bg)
  drawEye(ctx, (quiet + count - 7) * cell, quiet * cell, cell, cornerStyle, fg, bg)
  drawEye(ctx, quiet * cell, (quiet + count - 7) * cell, cell, cornerStyle, fg, bg)

  if (logo) {
    const box = size * 0.2
    const pad = box * 0.12
    const cx = size / 2
    const cy = size / 2
    ctx.fillStyle = bg
    roundedRect(ctx, cx - box / 2 - pad, cy - box / 2 - pad, box + pad * 2, box + pad * 2, box * 0.2)
    ctx.fill()
    const iw = logo.naturalWidth || logo.width
    const ih = logo.naturalHeight || logo.height
    const scale = Math.min(box / iw, box / ih)
    ctx.drawImage(logo, cx - (iw * scale) / 2, cy - (ih * scale) / 2, iw * scale, ih * scale)
  }
}