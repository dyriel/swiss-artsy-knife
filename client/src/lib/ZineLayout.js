/*
 * Zine imposition engine. Pure layout data plus one canvas renderer that the
 * live preview and the export both use, so what you see is what you print.
 *
 * Units: all geometry is in millimetres. The renderer scales to pixels.
 */

export const PAPER_SIZES = {
  a4: { label: 'A4', w: 297, h: 210 },
  letter: { label: 'US Letter', w: 279.4, h: 215.9 },
}

export const DPI_OPTIONS = [
  { value: 72, label: '72 DPI (screen)' },
  { value: 150, label: '150 DPI (draft print)' },
  { value: 300, label: '300 DPI (print)' },
]

export const BLEED_MM = 3

/*
 * Fold types. Each one says how many columns and rows the sheet is divided
 * into, where each page (1 = front cover) sits, which pages are printed
 * upside down, and where the cut goes.
 *
 * "mini8" is the standard one-sheet, 8-page, no-glue zine, on a landscape
 * sheet of 4 columns x 2 rows. Once folded:
 *
 *   | 5  4  3  2 |   <- top row, printed upside down (pages 2 to 5)
 *   | 6  7  8  1 |   <- bottom row, right side up
 *
 * Fold the sheet in half (long way), cut along the middle fold across the two
 * centre columns only (cut.x1 to cut.x2, in column units), open it up, then
 * fold it into a book.
 * Source: https://rowan.fyi/posts/printable-zine
 *
 * To add another fold type, add an entry here. Nothing else needs to change.
 */
export const FOLD_TYPES = {
  mini8: {
    label: '8-page mini zine (1 sheet, 1 cut)',
    cols: 4,
    rows: 2,
    cells: {
      1: { row: 1, col: 3 },
      2: { row: 0, col: 3 },
      3: { row: 0, col: 2 },
      4: { row: 0, col: 1 },
      5: { row: 0, col: 0 },
      6: { row: 1, col: 0 },
      7: { row: 1, col: 1 },
      8: { row: 1, col: 2 },
    },
    rotated: [2, 3, 4, 5],
    // Horizontal cut on row boundary `y`, from column boundary x1 to x2.
    cut: { y: 1, x1: 1, x2: 3 },
  },
}

export const MAX_PAGES = Math.max(...Object.values(FOLD_TYPES).map((f) => Object.keys(f.cells).length))

export const DEFAULT_SETTINGS = {
  fold: 'mini8',
  paper: 'a4',
  dpi: 300,
  bleed: false,
  guides: true,
}

export function pageCount(foldId) {
  return Object.keys(FOLD_TYPES[foldId].cells).length
}

/** Size of one finished page in mm (the trimmed cell). */
export function pageSizeMm(settings) {
  const paper = PAPER_SIZES[settings.paper]
  const fold = FOLD_TYPES[settings.fold]
  return { w: paper.w / fold.cols, h: paper.h / fold.rows }
}

/** Size of the output sheet in pixels at a given scale, including any bleed. */
export function sheetPixels(settings, pxPerMm) {
  const paper = PAPER_SIZES[settings.paper]
  const bleed = settings.bleed ? BLEED_MM : 0
  return {
    width: Math.round((paper.w + 2 * bleed) * pxPerMm),
    height: Math.round((paper.h + 2 * bleed) * pxPerMm),
  }
}

export function dpiToPxPerMm(dpi) {
  return dpi / 25.4
}

/*
 * Draw `img` into the rectangle (x, y, w, h), clipped to it.
 * fit "fill" crops to cover the page, "fit" shows the whole image.
 */
function drawFitted(ctx, img, x, y, w, h, fit) {
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  if (!iw || !ih) return
  const scale = fit === 'fit' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  ctx.restore()
}

/**
 * Render the imposed sheet onto `canvas`.
 *
 * opts.settings      the current settings
 * opts.slots         array indexed by page - 1: null or { img, fit }
 * opts.pxPerMm       output scale
 * opts.placeholders  draw page numbers in empty cells (preview only)
 */
export function drawSheet(canvas, { settings, slots, pxPerMm, placeholders = false }) {
  const paper = PAPER_SIZES[settings.paper]
  const fold = FOLD_TYPES[settings.fold]
  const bleed = settings.bleed ? BLEED_MM : 0
  const cw = paper.w / fold.cols
  const ch = paper.h / fold.rows

  const { width, height } = sheetPixels(settings, pxPerMm)
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // From here on, units are mm and (0, 0) is the top-left corner of the
  // trimmed sheet. The bleed area sits at negative coordinates.
  ctx.scale(width / (paper.w + 2 * bleed), height / (paper.h + 2 * bleed))
  ctx.translate(bleed, bleed)

  for (const [pageKey, cell] of Object.entries(fold.cells)) {
    const page = Number(pageKey)
    const rotated = fold.rotated.includes(page)

    // Cells on the outer edge of the sheet grow into the bleed area.
    const left = cell.col === 0 ? bleed : 0
    const right = cell.col === fold.cols - 1 ? bleed : 0
    const top = cell.row === 0 ? bleed : 0
    const bottom = cell.row === fold.rows - 1 ? bleed : 0

    const x = cell.col * cw - left
    const y = cell.row * ch - top
    const w = cw + left + right
    const h = ch + top + bottom

    const slot = slots[page - 1]

    ctx.save()
    if (rotated) {
      ctx.translate(x + w / 2, y + h / 2)
      ctx.rotate(Math.PI)
      ctx.translate(-(x + w / 2), -(y + h / 2))
    }

    if (slot) {
      drawFitted(ctx, slot.img, x, y, w, h, slot.fit)
    } else if (placeholders) {
      ctx.fillStyle = '#f3f1d6'
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = 'rgba(52, 56, 39, 0.35)'
      ctx.font = `700 ${Math.min(cw, ch) * 0.35}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(page), x + w / 2, y + h / 2)
    }
    ctx.restore()
  }

  if (settings.guides) {
    const line = 0.25 // mm

    // Fold lines: every cell boundary, dashed grey.
    ctx.save()
    ctx.strokeStyle = 'rgba(80, 80, 80, 0.8)'
    ctx.lineWidth = line
    ctx.setLineDash([2, 1.5])
    ctx.beginPath()
    for (let c = 1; c < fold.cols; c++) {
      ctx.moveTo(c * cw, 0)
      ctx.lineTo(c * cw, paper.h)
    }
    for (let r = 1; r < fold.rows; r++) {
      ctx.moveTo(0, r * ch)
      ctx.lineTo(paper.w, r * ch)
    }
    ctx.stroke()
    ctx.restore()

    // Cut line: solid red, drawn on top of the fold line.
    ctx.save()
    ctx.strokeStyle = '#c0392b'
    ctx.lineWidth = line * 2
    ctx.beginPath()
    ctx.moveTo(fold.cut.x1 * cw, fold.cut.y * ch)
    ctx.lineTo(fold.cut.x2 * cw, fold.cut.y * ch)
    ctx.stroke()
    ctx.restore()
  }
}