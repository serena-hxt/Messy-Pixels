/**
 * Overlay system for the canvas view: movable text labels and stickers.
 *
 * Overlays are stored as React state and rendered as absolutely-positioned
 * DOM elements over the drawing canvases. At save time, they are composited
 * into the final image via the helpers in this file.
 */

export type StickerKind =
  | "star"
  | "heart"
  | "speech-bubble"
  | "ufo"
  | "sparkle"
  | "question"

export type RemixMode =
  | "movie-poster"
  | "meme"
  | "futuristic"
  | "dreamy"
  | null

export interface TextOverlay {
  id: string
  kind: "text"
  /** Center X in CSS pixels relative to the canvas container. */
  x: number
  /** Center Y in CSS pixels relative to the canvas container. */
  y: number
  text: string
  color: string
  /** Font size in CSS pixels. */
  fontSize: number
  /** Font weight: "normal" | "bold". */
  weight?: "normal" | "bold"
  /** Optional preset family — "sans" (default), "serif" (poster), "impact" (meme). */
  family?: "sans" | "serif" | "impact"
  /** Optional rotation in degrees. */
  rotation?: number
}

export interface StickerOverlay {
  id: string
  kind: "sticker"
  sticker: StickerKind
  x: number
  y: number
  /** Size of the bounding square in CSS pixels. */
  size: number
  color: string
  rotation?: number
}

export type CanvasOverlay = TextOverlay | StickerOverlay

export const STICKER_LABELS: Record<StickerKind, string> = {
  star: "Star",
  heart: "Heart",
  "speech-bubble": "Speech Bubble",
  ufo: "UFO",
  sparkle: "Sparkle",
  question: "Question Mark",
}

export const STICKER_ORDER: StickerKind[] = [
  "star",
  "heart",
  "speech-bubble",
  "sparkle",
  "ufo",
  "question",
]

/* -------------------------------------------------------------------------- */
/* Sticker path drawing                                                        */
/*                                                                             */
/* Each draw fn fills a sticker centered at (cx, cy) with the bounding box     */
/* of `size` × `size` in canvas units.                                         */
/* -------------------------------------------------------------------------- */

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const outer = size / 2
  const inner = outer * 0.4
  const points = 5
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const angle = (Math.PI / points) * i - Math.PI / 2
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const s = size / 2
  // Heart sits centered vertically in the bbox.
  const top = cy - s * 0.7
  const bottom = cy + s * 0.95
  ctx.beginPath()
  ctx.moveTo(cx, bottom)
  ctx.bezierCurveTo(cx - s * 1.4, cy - s * 0.05, cx - s * 0.6, top - s * 0.4, cx, cy - s * 0.2)
  ctx.bezierCurveTo(cx + s * 0.6, top - s * 0.4, cx + s * 1.4, cy - s * 0.05, cx, bottom)
  ctx.closePath()
  ctx.fill()
}

function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  const w = size
  const h = size * 0.78
  const left = cx - w / 2
  const top = cy - h / 2
  const radius = Math.min(w, h) * 0.22
  // Rounded rectangle
  ctx.beginPath()
  ctx.moveTo(left + radius, top)
  ctx.lineTo(left + w - radius, top)
  ctx.quadraticCurveTo(left + w, top, left + w, top + radius)
  ctx.lineTo(left + w, top + h - radius)
  ctx.quadraticCurveTo(left + w, top + h, left + w - radius, top + h)
  // Tail on the bottom-left
  ctx.lineTo(left + w * 0.32, top + h)
  ctx.lineTo(left + w * 0.18, top + h + h * 0.28)
  ctx.lineTo(left + w * 0.22, top + h)
  ctx.lineTo(left + radius, top + h)
  ctx.quadraticCurveTo(left, top + h, left, top + h - radius)
  ctx.lineTo(left, top + radius)
  ctx.quadraticCurveTo(left, top, left + radius, top)
  ctx.closePath()
  ctx.fill()
}

function drawUFO(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const w = size
  const h = size * 0.62
  const baseY = cy + h * 0.05

  // Body — flat ellipse
  ctx.beginPath()
  ctx.ellipse(cx, baseY, w / 2, h / 4, 0, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fill()

  // Dome — top half ellipse, slightly lighter (use same color but transparent)
  ctx.save()
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  ctx.ellipse(cx, baseY - h * 0.12, w * 0.32, h * 0.34, 0, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // Lights underneath
  const lightCount = 3
  const lightSpacing = w * 0.18
  for (let i = 0; i < lightCount; i++) {
    const offset = (i - (lightCount - 1) / 2) * lightSpacing
    ctx.beginPath()
    ctx.arc(cx + offset, baseY + h * 0.18, w * 0.05, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawSparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const r = size / 2
  // 4-point sparkle: two crossed elongated diamonds
  const longSide = r
  const shortSide = r * 0.18

  ctx.beginPath()
  // Vertical axis
  ctx.moveTo(cx, cy - longSide)
  ctx.lineTo(cx + shortSide, cy)
  ctx.lineTo(cx, cy + longSide)
  ctx.lineTo(cx - shortSide, cy)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  // Horizontal axis
  ctx.moveTo(cx - longSide, cy)
  ctx.lineTo(cx, cy + shortSide)
  ctx.lineTo(cx + longSide, cy)
  ctx.lineTo(cx, cy - shortSide)
  ctx.closePath()
  ctx.fill()
}

function drawQuestion(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  // Bold "?" rendered as text so kerning + character feel right.
  ctx.save()
  ctx.font = `900 ${Math.round(size * 1.05)}px ui-sans-serif, system-ui, -apple-system, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("?", cx, cy + size * 0.04)
  ctx.restore()
}

const STICKER_DRAWERS: Record<
  StickerKind,
  (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => void
> = {
  star: drawStar,
  heart: drawHeart,
  "speech-bubble": drawSpeechBubble,
  ufo: drawUFO,
  sparkle: drawSparkle,
  question: drawQuestion,
}

/** Draw a single sticker into the supplied canvas context. */
export function drawStickerToCanvas(
  ctx: CanvasRenderingContext2D,
  sticker: StickerOverlay,
) {
  ctx.save()
  ctx.fillStyle = sticker.color
  ctx.strokeStyle = sticker.color
  if (sticker.rotation) {
    ctx.translate(sticker.x, sticker.y)
    ctx.rotate((sticker.rotation * Math.PI) / 180)
    ctx.translate(-sticker.x, -sticker.y)
  }
  STICKER_DRAWERS[sticker.sticker](ctx, sticker.x, sticker.y, sticker.size)
  ctx.restore()
}

/** Map a TextOverlay's family hint to a real CSS font-family stack. */
export function fontFamilyFor(family: TextOverlay["family"]): string {
  switch (family) {
    case "serif":
      return '"Times New Roman", Georgia, serif'
    case "impact":
      return 'Impact, "Arial Black", "Helvetica Neue", sans-serif'
    case "sans":
    default:
      return 'ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", sans-serif'
  }
}

/** Draw a text overlay onto the supplied canvas context. */
export function drawTextOverlayToCanvas(
  ctx: CanvasRenderingContext2D,
  overlay: TextOverlay,
) {
  if (!overlay.text.trim()) return
  ctx.save()
  if (overlay.rotation) {
    ctx.translate(overlay.x, overlay.y)
    ctx.rotate((overlay.rotation * Math.PI) / 180)
    ctx.translate(-overlay.x, -overlay.y)
  }
  const weight = overlay.weight === "bold" ? "700" : "400"
  ctx.font = `${weight} ${overlay.fontSize}px ${fontFamilyFor(overlay.family)}`
  ctx.fillStyle = overlay.color
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  // Soft shadow so light-colored text stays legible on white canvas.
  ctx.shadowColor = "rgba(0,0,0,0.18)"
  ctx.shadowBlur = 4
  ctx.shadowOffsetY = 1

  // Multi-line support: split on \n
  const lines = overlay.text.split("\n")
  const lineHeight = overlay.fontSize * 1.15
  const totalHeight = lines.length * lineHeight
  const startY = overlay.y - totalHeight / 2 + lineHeight / 2
  lines.forEach((line, i) => {
    ctx.fillText(line, overlay.x, startY + i * lineHeight)
  })
  ctx.restore()
}

/** Composite all overlays (in order) into the supplied canvas context. */
export function composeOverlaysToCanvas(
  ctx: CanvasRenderingContext2D,
  overlays: CanvasOverlay[],
) {
  overlays.forEach((o) => {
    if (o.kind === "sticker") drawStickerToCanvas(ctx, o)
    else drawTextOverlayToCanvas(ctx, o)
  })
}

/** Generate a fresh overlay id. */
export function newOverlayId(): string {
  return `ov_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}
