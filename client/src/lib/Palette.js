/*
 * Colour maths and palette generation. Pure functions, no DOM except
 * drawPaletteStrip, which takes a canvas.
 *
 * A palette in the UI is an array of 5 swatches: { id, hex, locked }.
 */

export const PALETTE_SIZE = 5

// The app's own five colours, used as the starting palette.
export const INITIAL_HEXES = ['#343827', '#FBF8CD', '#CB91CB', '#EA9EB6', '#5A895E']

export function makeSwatches(hexes, locked = false) {
  return hexes.map((hex, id) => ({ id, hex, locked }))
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
const lerp = (range, t) => range[0] + (range[1] - range[0]) * t

/** Accepts "#abc", "abc", "#AABBCC", "aabbcc". Returns "#AABBCC" or null. */
export function normalizeHex(input) {
  if (typeof input !== 'string') return null
  let s = input.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(s)) s = s.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null
  return `#${s.toUpperCase()}`
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  )
}

export function hslToHex(h, s, l) {
  const hue = ((h % 360) + 360) % 360
  const sat = s / 100
  const lig = l / 100
  const k = (n) => (n + hue / 30) % 12
  const a = sat * Math.min(lig, 1 - lig)
  const f = (n) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255)
}

export function hexToHsl(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l * 100]
  const s = d / (1 - Math.abs(2 * l - 1))
  let h
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [(h * 60 + 360) % 360, s * 100, l * 100]
}

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Dark or light text, whichever reads better on `hex`. */
export function readableText(hex) {
  return contrastRatio(hex, '#343827') >= contrastRatio(hex, '#FBF8CD') ? '#343827' : '#FBF8CD'
}

/*
 * Theme rules. hue is a list of [from, to] degree ranges (or `hues` for fixed
 * values with a little jitter); sat and light are [min, max] percentages.
 * Randomize picks inside these ranges, so a theme always feels consistent.
 */
export const THEMES = {
  random: { label: 'Random', hue: [[0, 360]], sat: [30, 90], light: [25, 85] },
  cool: { label: 'Cool', hue: [[170, 260]], sat: [40, 75], light: [30, 80] },
  warm: {
    label: 'Warm',
    hue: [
      [0, 50],
      [335, 360],
    ],
    sat: [55, 90],
    light: [35, 75],
  },
  pastel: { label: 'Pastel', hue: [[0, 360]], sat: [55, 85], light: [78, 92] },
  retro: { label: 'Retro', hues: [8, 28, 45, 170, 195, 340], sat: [45, 70], light: [38, 62] },
}

function pickHue(rule, rng) {
  if (rule.hues) {
    return rule.hues[Math.floor(rng() * rule.hues.length)] + (rng() - 0.5) * 12
  }
  const total = rule.hue.reduce((sum, [a, b]) => sum + (b - a), 0)
  let pick = rng() * total
  for (const [a, b] of rule.hue) {
    if (pick <= b - a) return a + pick
    pick -= b - a
  }
  return rule.hue[0][0]
}

function shuffle(list, rng) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function randomColor(theme, rng = Math.random, lightT = rng()) {
  const rule = THEMES[theme] || THEMES.random
  return hslToHex(pickHue(rule, rng), lerp(rule.sat, rng()), lerp(rule.light, lightT))
}

/**
 * New palette for `theme`. Locked swatches keep their colour. Lightness is
 * spread across the palette so a roll is never five near-identical colours.
 */
export function generatePalette(theme, current, rng = Math.random) {
  const order = shuffle([...Array(current.length).keys()], rng)
  return current.map((swatch, i) =>
    swatch.locked
      ? swatch
      : { ...swatch, hex: randomColor(theme, rng, (order[i] + rng()) / current.length) },
  )
}

const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2

/**
 * Dominant colours of an image. `rgba` is a Uint8ClampedArray from getImageData.
 * Seeds from a coarse colour histogram (so the centres are distinct, popular
 * colours), then refines with a few k-means passes. Returns hex strings,
 * most common first.
 */
export function extractPalette(rgba, count = PALETTE_SIZE) {
  const pixels = rgba.length / 4
  const step = Math.max(1, Math.floor(pixels / 20000))
  const samples = []
  for (let i = 0; i < pixels; i += step) {
    const o = i * 4
    if (rgba[o + 3] < 128) continue
    samples.push([rgba[o], rgba[o + 1], rgba[o + 2]])
  }
  if (samples.length === 0) return []

  const buckets = new Map()
  for (const [r, g, b] of samples) {
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    let entry = buckets.get(key)
    if (!entry) {
      entry = [0, 0, 0, 0]
      buckets.set(key, entry)
    }
    entry[0] += 1
    entry[1] += r
    entry[2] += g
    entry[3] += b
  }
  const ranked = [...buckets.values()]
    .sort((a, b) => b[0] - a[0])
    .map((e) => [e[1] / e[0], e[2] / e[0], e[3] / e[0]])

  let minDist = 48
  let centers = []
  for (;;) {
    centers = []
    for (const candidate of ranked) {
      if (centers.every((c) => dist2(c, candidate) >= minDist * minDist)) {
        centers.push(candidate)
        if (centers.length === count) break
      }
    }
    if (centers.length === count || minDist <= 4) break
    minDist = Math.floor(minDist / 2)
  }

  let sizes = centers.map(() => 0)
  for (let iter = 0; iter < 8; iter++) {
    const sums = centers.map(() => [0, 0, 0])
    sizes = centers.map(() => 0)
    for (const px of samples) {
      let best = 0
      let bestD = Infinity
      for (let c = 0; c < centers.length; c++) {
        const d = dist2(centers[c], px)
        if (d < bestD) {
          bestD = d
          best = c
        }
      }
      sums[best][0] += px[0]
      sums[best][1] += px[1]
      sums[best][2] += px[2]
      sizes[best] += 1
    }
    centers = centers.map((c, i) =>
      sizes[i] ? sums[i].map((v) => v / sizes[i]) : c,
    )
  }

  const ordered = centers
    .map((c, i) => ({ hex: rgbToHex(c[0], c[1], c[2]), size: sizes[i] }))
    .sort((a, b) => b.size - a.size)
    .map((e) => e.hex)

  // A flat image has fewer distinct colours than swatches: pad with tints and shades.
  let k = 1
  while (ordered.length < count && ordered.length > 0) {
    const [r, g, b] = hexToRgb(ordered[0])
    const mix = Math.ceil(k / 2) * 0.22
    const target = k % 2 === 1 ? 255 : 0
    ordered.push(
      rgbToHex(r + (target - r) * mix, g + (target - g) * mix, b + (target - b) * mix),
    )
    k += 1
  }
  return ordered
}

/** Draw the palette as a row of swatches with hex labels. */
export function drawPaletteStrip(canvas, hexes, { cell = 300, height = 420 } = {}) {
  canvas.width = cell * hexes.length
  canvas.height = height
  const ctx = canvas.getContext('2d')
  hexes.forEach((hex, i) => {
    ctx.fillStyle = hex
    ctx.fillRect(i * cell, 0, cell, height)
    ctx.fillStyle = readableText(hex)
    ctx.font = '700 36px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(hex, i * cell + cell / 2, height - 36)
  })
}