/*
 * Background removal, two ways.
 *
 * removeSolidBackground: canvas-only, instant, works offline. Good for flat
 * or near-flat backgrounds (sticker designs, scans, product shots).
 *
 * removeBackgroundSmart: an AI segmentation model that runs in the browser
 * (@imgly/background-removal). Handles photos and busy backgrounds. The model
 * files (tens of MB) download from a CDN the first time and are then cached by
 * the browser, so it is not usable fully offline on the very first run.
 */

export const MAX_SIDE = 4096

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/** The most likely background colour: the per-channel median of the border pixels. */
export function estimateBackground(data, width, height) {
  const r = []
  const g = []
  const b = []
  const add = (i) => {
    const o = i * 4
    if (data[o + 3] < 128) return
    r.push(data[o])
    g.push(data[o + 1])
    b.push(data[o + 2])
  }
  for (let x = 0; x < width; x++) {
    add(x)
    add((height - 1) * width + x)
  }
  for (let y = 1; y < height - 1; y++) {
    add(y * width)
    add(y * width + width - 1)
  }
  if (r.length === 0) return [255, 255, 255]
  return [median(r), median(g), median(b)]
}

/**
 * Makes pixels transparent when they match the background colour AND connect
 * to the image edge, so a same-coloured area inside the subject survives.
 * Edits `data` (RGBA, from getImageData) in place.
 *
 * tolerancePct is 0 to 100: how far a colour may differ from the background
 * and still count as background.
 */
export function removeSolidBackground(data, width, height, tolerancePct) {
  const tol = Math.max(0, tolerancePct) * 1.5
  const bg = estimateBackground(data, width, height)
  const total = width * height

  const dist = (i) => {
    const o = i * 4
    const dr = data[o] - bg[0]
    const dg = data[o + 1] - bg[1]
    const db = data[o + 2] - bg[2]
    return Math.sqrt(dr * dr + dg * dg + db * db)
  }

  const state = new Uint8Array(total) // 1 = background
  const queue = new Int32Array(total)
  let head = 0
  let tail = 0
  const tryPush = (i) => {
    if (state[i] || dist(i) > tol) return
    state[i] = 1
    queue[tail++] = i
  }

  for (let x = 0; x < width; x++) {
    tryPush(x)
    tryPush((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    tryPush(y * width)
    tryPush(y * width + width - 1)
  }
  while (head < tail) {
    const i = queue[head++]
    const x = i % width
    const y = (i - x) / width
    if (x > 0) tryPush(i - 1)
    if (x < width - 1) tryPush(i + 1)
    if (y > 0) tryPush(i - width)
    if (y < height - 1) tryPush(i + width)
  }

  for (let i = 0; i < total; i++) {
    if (state[i]) data[i * 4 + 3] = 0
  }

  // Soften the cut edge: pixels touching the removed area fade in with their
  // colour distance instead of ending in a hard jagged line.
  if (tol >= 1) {
    for (let i = 0; i < total; i++) {
      if (state[i]) continue
      const x = i % width
      const y = (i - x) / width
      const touches =
        (x > 0 && state[i - 1]) ||
        (x < width - 1 && state[i + 1]) ||
        (y > 0 && state[i - width]) ||
        (y < height - 1 && state[i + width])
      if (!touches) continue
      const d = dist(i)
      if (d < tol * 2) {
        const keep = Math.min(1, Math.max(0, (d - tol) / tol))
        data[i * 4 + 3] = Math.round(data[i * 4 + 3] * keep)
      }
    }
  }

  return { background: bg, removedFraction: tail / total }
}

/**
 * Smart removal with the in-browser model. `source` is a Blob or File.
 * Resolves to a PNG Blob with a transparent background.
 * onProgress(label, current, total) reports the model download and processing.
 */
export async function removeBackgroundSmart(source, onProgress) {
  const { removeBackground } = await import('@imgly/background-removal')
  return removeBackground(source, {
    output: { format: 'image/png' },
    progress: (key, current, total) => onProgress?.(key, current, total),
  })
}