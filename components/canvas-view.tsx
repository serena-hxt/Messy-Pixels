"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  BookOpen,
  Brush,
  ChevronDown,
  Eye,
  EyeOff,
  ImageIcon,
  Layers,
  Pencil,
  PenLine,
  RefreshCw,
  Shuffle,
  Trash2,
  Type,
  Sparkles,
  Droplets,
  X,
} from "lucide-react"
import { useSelectedArtwork } from "@/contexts/selected-artwork-context"
import { loadMakerProfile, MAKER_PROFILE_INFO, type MakerProfileType } from "@/lib/storage"
import { getPromptForProfile, shufflePrompt, FREE_CREATE_PROMPT, type CreativePrompt } from "@/lib/prompts"
import { CURATED_ARTWORKS, type CuratedArtwork } from "@/lib/curated-artworks"

/* -------------------------------------------------------------------------- */
/* Types & Constants                                                           */
/* -------------------------------------------------------------------------- */

type Mode = "draw" | "text"
type BrushType = "pencil" | "pen" | "oil" | "watercolor" | "wax"

interface BrushPreset {
  id: BrushType
  label: string
  /** Multiplier applied to the user-selected size for this medium. */
  sizeScale: number
  /** Base alpha — watercolor is sheer, pen is opaque. */
  alpha: number
  /** Soft-edge blur (px in canvas space) — gives watercolor its bloom. */
  blur: number
  /** Per-segment scatter dots that build up texture along the stroke. */
  textureDensity: number
  /** Random scatter radius around the stroke centerline. */
  textureSpread: number
  /** Alpha applied to texture dots — keeps pencil grain subtle. */
  textureAlpha: number
  /** Slight width jitter to make pencil & wax feel hand-pressed. */
  widthJitter: number
}

const BRUSH_PRESETS: Record<BrushType, BrushPreset> = {
  pencil: {
    id: "pencil",
    label: "Pencil",
    sizeScale: 0.85,
    alpha: 0.55,
    blur: 0,
    textureDensity: 0.7,
    textureSpread: 1.4,
    textureAlpha: 0.18,
    widthJitter: 0.25,
  },
  pen: {
    id: "pen",
    label: "Pen",
    sizeScale: 0.9,
    alpha: 1,
    blur: 0,
    textureDensity: 0,
    textureSpread: 0,
    textureAlpha: 0,
    widthJitter: 0,
  },
  oil: {
    id: "oil",
    label: "Oil",
    sizeScale: 1.6,
    alpha: 0.82,
    blur: 0,
    textureDensity: 1.4,
    textureSpread: 0.55,
    textureAlpha: 0.35,
    widthJitter: 0.18,
  },
  watercolor: {
    id: "watercolor",
    label: "Watercolor",
    sizeScale: 1.7,
    alpha: 0.16,
    blur: 8,
    textureDensity: 0,
    textureSpread: 0,
    textureAlpha: 0,
    widthJitter: 0,
  },
  wax: {
    id: "wax",
    label: "Wax Pen",
    sizeScale: 1.25,
    alpha: 0.92,
    blur: 0,
    textureDensity: 1.1,
    textureSpread: 0.9,
    textureAlpha: 0.4,
    widthJitter: 0.15,
  },
}

const BRUSH_ORDER: BrushType[] = ["pencil", "pen", "oil", "watercolor", "wax"]

const BRUSH_ICONS: Record<BrushType, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  pencil: Pencil,
  pen: PenLine,
  oil: Brush,
  watercolor: Droplets,
  wax: Sparkles,
}

const DEFAULT_PALETTE = [
  "#1a1a1f",
  "#e76f51",
  "#f4a261",
  "#e9c46a",
  "#2a9d8f",
  "#7c8aa0",
  "#d4a5a5",
  "#a8b89c",
] as const

const BRUSH_SIZES = [2, 4, 8, 14] as const

const MAX_LAYERS = 5

interface LayerState {
  id: string
  visible: boolean
}

const INITIAL_LAYERS = (): LayerState[] =>
  Array.from({ length: MAX_LAYERS }, (_, i) => ({
    id: `layer-${i + 1}`,
    visible: true,
  }))

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Pick the medium-appropriate default brush for the current artwork. */
function defaultBrushForMedium(medium: string | undefined): BrushType {
  if (!medium) return "pen"
  const m = medium.toLowerCase()
  if (m.includes("watercolor") || m.includes("wash")) return "watercolor"
  if (m.includes("oil")) return "oil"
  if (m.includes("crayon") || m.includes("wax") || m.includes("pastel")) return "wax"
  if (m.includes("pencil") || m.includes("graphite") || m.includes("charcoal")) return "pencil"
  if (m.includes("ink") || m.includes("pen")) return "pen"
  return "pen"
}

/** Merge artwork colors with the default palette, deduped and capped. */
function buildPalette(artworkColors: string[] | undefined): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const push = (hex: string) => {
    const normalized = hex.toLowerCase()
    if (!seen.has(normalized)) {
      seen.add(normalized)
      out.push(normalized)
    }
  }
  if (artworkColors && artworkColors.length > 0) {
    artworkColors.slice(0, 8).forEach(push)
  }
  DEFAULT_PALETTE.forEach(push)
  return out.slice(0, 12)
}

/** Apply the current brush preset to a canvas context. */
function applyBrushSettings(
  ctx: CanvasRenderingContext2D,
  preset: BrushPreset,
  color: string,
  size: number,
  transparency: number = 100,
) {
  const transparencyMultiplier = transparency / 100
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = size * preset.sizeScale
  ctx.globalAlpha = preset.alpha * transparencyMultiplier
  ctx.shadowBlur = preset.blur
  ctx.shadowColor = preset.blur > 0 ? color : "transparent"
}

/** Sprinkle texture dots along a segment for oil / wax / pencil feel. */
function scatterTexture(
  ctx: CanvasRenderingContext2D,
  preset: BrushPreset,
  color: string,
  size: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  if (preset.textureDensity === 0) return
  const dx = x1 - x0
  const dy = y1 - y0
  const dist = Math.hypot(dx, dy)
  if (dist < 0.5) return
  // Number of texture dabs proportional to distance and density.
  const count = Math.max(1, Math.round(dist * preset.textureDensity * 0.6))
  const baseRadius = (size * preset.sizeScale) / 2
  const spread = baseRadius * preset.textureSpread
  ctx.save()
  ctx.fillStyle = color
  ctx.globalAlpha = preset.textureAlpha
  for (let i = 0; i < count; i++) {
    const t = (i + Math.random()) / count
    const ox = (Math.random() - 0.5) * spread * 2
    const oy = (Math.random() - 0.5) * spread * 2
    const r = baseRadius * (0.35 + Math.random() * 0.55)
    ctx.beginPath()
    ctx.arc(x0 + dx * t + ox, y0 + dy * t + oy, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

interface CanvasViewProps {
  prompt?: string
  onClose: (saved?: { dataUrl: string; note?: string }) => void
  closeRef?: React.MutableRefObject<(() => void) | null>
  /** When true, automatically enables the reference overlay on mount. */
  startWithReference?: boolean
}

export function CanvasView({
  prompt = "Draw something that makes you feel calm",
  onClose,
  closeRef,
  startWithReference = false,
}: CanvasViewProps) {
  const { selectedArtwork } = useSelectedArtwork()

  // Palette + medium-aware defaults, derived from the selected artwork.
  const palette = useMemo(() => buildPalette(selectedArtwork?.colors), [selectedArtwork])
  const initialBrush = useMemo(() => defaultBrushForMedium(selectedArtwork?.medium), [selectedArtwork])

  const [mode, setMode] = useState<Mode>("draw")
  const [brushType, setBrushType] = useState<BrushType>(initialBrush)
  const [color, setColor] = useState<string>(palette[0] ?? "#1a1a1f")
  const [brushSize, setBrushSize] = useState<number>(4)
  const [brushTransparency, setBrushTransparency] = useState<number>(100)
  const [note, setNote] = useState<string>("")
  const [hasInk, setHasInk] = useState(false)

  // Prompt state — personalized based on maker profile
  const [makerProfile, setMakerProfile] = useState<MakerProfileType | null>(null)
  const [currentPrompt, setCurrentPrompt] = useState<CreativePrompt | null>(null)
  const [promptVisible, setPromptVisible] = useState(true)
  const [showProfilePicker, setShowProfilePicker] = useState(false)

  // Initialize prompt from maker profile on mount
  useEffect(() => {
    const profile = loadMakerProfile()
    if (profile) {
      setMakerProfile(profile.type)
      setCurrentPrompt(getPromptForProfile(profile.type))
    }
  }, [])

  // Layer state — five user layers, plus a reference overlay flag.
  const [layers, setLayers] = useState<LayerState[]>(INITIAL_LAYERS)
  const [activeLayer, setActiveLayer] = useState<number>(0)
  const [referenceEnabled, setReferenceEnabled] = useState<boolean>(
    startWithReference && Boolean(selectedArtwork?.primaryimageurl),
  )
  const [referenceOpacity, setReferenceOpacity] = useState<number>(0.35)

  // Per-layer "has content" tracking — used by the album to find the next
  // empty layer to drop a popular work onto. Strokes also flip the bit on
  // pointer-down so a hand-drawn layer is treated as occupied.
  const [layerHasContent, setLayerHasContent] = useState<boolean[]>(() =>
    Array(MAX_LAYERS).fill(false),
  )

  // Album picker — floating popup at bottom-left of the canvas.

  // Sync brush + palette when a new artwork is selected mid-session.
  const lastArtworkIdRef = useRef<number | null>(null)
  useEffect(() => {
    if (!selectedArtwork) return
    if (lastArtworkIdRef.current === selectedArtwork.id) return
    lastArtworkIdRef.current = selectedArtwork.id
    setBrushType(defaultBrushForMedium(selectedArtwork.medium))
    if (palette.length > 0) setColor(palette[0])
    if (startWithReference && selectedArtwork.primaryimageurl) {
      setReferenceEnabled(true)
    }
  }, [selectedArtwork, palette, startWithReference])

  // Refs for each layer canvas + the reference image canvas.
  const layerRefs = useRef<(HTMLCanvasElement | null)[]>(Array(MAX_LAYERS).fill(null))
  const refCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Pointer state.
  const drawingRef = useRef(false)
  const lastPtRef = useRef<{ x: number; y: number } | null>(null)

  // Refs that track current settings without forcing handler re-creation.
  const colorRef = useRef(color)
  const brushSizeRef = useRef(brushSize)
  const brushTypeRef = useRef(brushType)
  const brushTransparencyRef = useRef(brushTransparency)
  const activeLayerRef = useRef(activeLayer)
  useEffect(() => { colorRef.current = color }, [color])
  useEffect(() => { brushSizeRef.current = brushSize }, [brushSize])
  useEffect(() => { brushTypeRef.current = brushType }, [brushType])
  useEffect(() => { brushTransparencyRef.current = brushTransparency }, [brushTransparency])
  useEffect(() => { activeLayerRef.current = activeLayer }, [activeLayer])

  /* ---------------- Setup all canvases with HiDPI + ResizeObserver ---------------- */

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let pendingSetup: ReturnType<typeof requestAnimationFrame> | null = null

    const setup = () => {
      const rect = container.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const dpr = window.devicePixelRatio || 1

      // Resize each user layer, preserving its existing strokes.
      layerRefs.current.forEach((canvas) => {
        if (!canvas) return
        const prev = document.createElement("canvas")
        prev.width = canvas.width
        prev.height = canvas.height
        const prevCtx = prev.getContext("2d")
        if (prevCtx && canvas.width > 0 && canvas.height > 0) {
          prevCtx.drawImage(canvas, 0, 0)
        }
        canvas.width = Math.floor(rect.width * dpr)
        canvas.height = Math.floor(rect.height * dpr)
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.scale(dpr, dpr)
        if (prev.width > 0 && prev.height > 0) {
          ctx.drawImage(prev, 0, 0, rect.width, rect.height)
        }
      })

      // Resize the reference canvas too (it just needs the same coords).
      const ref = refCanvasRef.current
      if (ref) {
        ref.width = Math.floor(rect.width * dpr)
        ref.height = Math.floor(rect.height * dpr)
      }
    }

    pendingSetup = requestAnimationFrame(() => {
      setup()
      pendingSetup = null
    })

    const ro = new ResizeObserver(() => {
      if (pendingSetup !== null) return
      pendingSetup = requestAnimationFrame(() => {
        setup()
        pendingSetup = null
      })
    })
    ro.observe(container)

    return () => {
      if (pendingSetup !== null) cancelAnimationFrame(pendingSetup)
      ro.disconnect()
    }
  }, [])

  /* ---------------- Reference image drawing ---------------- */

  // Draw the reference image into its dedicated canvas, fitted with `contain`.
  const drawReference = useCallback(() => {
    const canvas = refCanvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!referenceEnabled || !selectedArtwork?.primaryimageurl) return

    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const aspect = img.width / img.height
      const containerAspect = rect.width / rect.height
      let drawW: number
      let drawH: number
      if (aspect > containerAspect) {
        drawW = rect.width
        drawH = rect.width / aspect
      } else {
        drawH = rect.height
        drawW = rect.height * aspect
      }
      const x = (rect.width - drawW) / 2
      const y = (rect.height - drawH) / 2
      ctx.scale(dpr, dpr)
      ctx.drawImage(img, x, y, drawW, drawH)
    }
    img.onerror = () => {
      // Image blocked or failed — silently skip; user sees just the canvas.
    }
    img.src = selectedArtwork.primaryimageurl
  }, [referenceEnabled, selectedArtwork])

  useEffect(() => {
    drawReference()
  }, [drawReference])

  /* ---------------- Pointer handlers (operate on active layer) ---------------- */

  const getPoint = (e: React.PointerEvent) => {
    const container = containerRef.current
    if (!container) return { x: 0, y: 0 }
    const rect = container.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const drawDot = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const preset = BRUSH_PRESETS[brushTypeRef.current]
    const baseSize = brushSizeRef.current * preset.sizeScale
      applyBrushSettings(ctx, preset, colorRef.current, brushSizeRef.current, brushTransparencyRef.current)
    ctx.beginPath()
    ctx.arc(x, y, baseSize / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  const drawSegment = (
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ) => {
    const preset = BRUSH_PRESETS[brushTypeRef.current]
    const size = brushSizeRef.current
    applyBrushSettings(ctx, preset, colorRef.current, size)
    if (preset.widthJitter > 0) {
      const jitter = 1 + (Math.random() - 0.5) * preset.widthJitter
      ctx.lineWidth = size * preset.sizeScale * jitter
    }
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()

    // Scatter texture dabs for oil / wax / pencil feel.
    if (preset.textureDensity > 0) {
      scatterTexture(ctx, preset, colorRef.current, size, x0, y0, x1, y1)
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (mode !== "draw") return
    e.preventDefault()
    const idx = activeLayerRef.current
    const canvas = layerRefs.current[idx]
    if (!canvas) return
    if (!layers[idx]?.visible) return // can't draw on a hidden layer
    canvas.setPointerCapture?.(e.pointerId)
    drawingRef.current = true
    // Mark this layer as occupied so the album skips it when picking next slot.
    setLayerHasContent((prev) => {
      if (prev[idx]) return prev
      const next = [...prev]
      next[idx] = true
      return next
    })
    const pt = getPoint(e)
    lastPtRef.current = pt

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    drawDot(ctx, pt.x, pt.y)
    if (!hasInk) setHasInk(true)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || mode !== "draw") return
    const idx = activeLayerRef.current
    const canvas = layerRefs.current[idx]
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const pt = getPoint(e)
    const last = lastPtRef.current ?? pt
    drawSegment(ctx, last.x, last.y, pt.x, pt.y)
    lastPtRef.current = pt
    if (!hasInk) setHasInk(true)
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (mode !== "draw") return
    drawingRef.current = false
    lastPtRef.current = null
    const idx = activeLayerRef.current
    layerRefs.current[idx]?.releasePointerCapture?.(e.pointerId)
  }

  /* ---------------- Layer ops ---------------- */

  const clearActiveLayer = () => {
    const idx = activeLayerRef.current
    const canvas = layerRefs.current[idx]
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    setLayerHasContent((prev) => {
      if (!prev[idx]) return prev
      const next = [...prev]
      next[idx] = false
      return next
    })
    refreshHasInk()
  }

  const toggleLayerVisibility = (idx: number) => {
    setLayers((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, visible: !l.visible } : l)),
    )
  }

  /* ---------------- Album: drop a curated artwork onto a layer ---------------- */

  const addArtworkToLayer = useCallback(
    (artwork: CuratedArtwork) => {
      const container = containerRef.current
      if (!container) return
      const url = artwork.fallbackImageUrl
      if (!url) return // album shows only artworks with a usable image URL

      // Pick the first empty layer; if all are taken, fall back to the active one.
      const emptyIdx = layerHasContent.findIndex((v) => !v)
      const targetIdx = emptyIdx >= 0 ? emptyIdx : activeLayerRef.current
      const canvas = layerRefs.current[targetIdx]
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        // Clear the target layer, then draw the image with object-contain fit.
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.scale(dpr, dpr)

        // Inset slightly so the placed work feels like a sticker on the canvas.
        const padding = 24
        const availW = Math.max(1, rect.width - padding * 2)
        const availH = Math.max(1, rect.height - padding * 2)
        const aspect = img.width / img.height
        const containerAspect = availW / availH
        let drawW: number
        let drawH: number
        if (aspect > containerAspect) {
          drawW = availW
          drawH = availW / aspect
        } else {
          drawH = availH
          drawW = availH * aspect
        }
        const x = (rect.width - drawW) / 2
        const y = (rect.height - drawH) / 2
        ctx.drawImage(img, x, y, drawW, drawH)
        ctx.restore()

        // Mark layer as occupied, make it active, and ensure it's visible.
        setLayerHasContent((prev) => {
          if (prev[targetIdx]) return prev
          const next = [...prev]
          next[targetIdx] = true
          return next
        })
        setLayers((prev) =>
          prev.map((l, i) => (i === targetIdx && !l.visible ? { ...l, visible: true } : l)),
        )
        setActiveLayer(targetIdx)
        setHasInk(true)
      }
      img.onerror = () => {
        // Image blocked or failed — fail silently, no crash.
      }
      img.src = url
    },
    [layerHasContent],
  )

  const refreshHasInk = () => {
    // Quick check: any layer canvas has non-empty pixels? Cheap heuristic — assume cleared.
    setHasInk(false)
  }

  /* ---------------- Compose final image on close ---------------- */

  const composeFinalImage = (): string | null => {
    const container = containerRef.current
    if (!container) return null
    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    const out = document.createElement("canvas")
    out.width = Math.floor(rect.width * dpr)
    out.height = Math.floor(rect.height * dpr)
    const ctx = out.getContext("2d")
    if (!ctx) return null

    // White background so exported PNGs aren't transparent.
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, out.width, out.height)

    // Reference layer (semi-transparent if enabled).
    if (referenceEnabled && refCanvasRef.current) {
      ctx.globalAlpha = referenceOpacity
      ctx.drawImage(refCanvasRef.current, 0, 0)
      ctx.globalAlpha = 1
    }

    // User layers, bottom (1) → top (5), respecting visibility.
    layers.forEach((layer, i) => {
      if (!layer.visible) return
      const c = layerRefs.current[i]
      if (c) ctx.drawImage(c, 0, 0)
    })

    return out.toDataURL("image/png")
  }

  const handleClose = () => {
    const dataUrl = composeFinalImage()
    if (dataUrl && hasInk) {
      onClose({ dataUrl, note: note.trim() || undefined })
    } else {
      onClose()
    }
  }

  useEffect(() => {
    if (!closeRef) return
    closeRef.current = handleClose
    return () => {
      if (closeRef.current === handleClose) closeRef.current = null
    }
  })

  /* ---------------- Render ---------------- */

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Contextual prompt with controls */}
      <div className="px-4 pt-2 sm:px-8 md:px-12">
        {promptVisible && currentPrompt ? (
          <div
            className="relative rounded-2xl px-4 py-3"
            style={{
              backgroundColor: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(20px) saturate(140%)",
              WebkitBackdropFilter: "blur(20px) saturate(140%)",
              border: "0.5px solid rgba(26,26,31,0.1)",
            }}
          >
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-foreground/50" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[12px] font-light leading-relaxed text-foreground/80">
                  {currentPrompt.text}
                </p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/40">
                  {MAKER_PROFILE_INFO[currentPrompt.profile].name} prompt
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPromptVisible(false)}
                className="shrink-0 rounded-full p-1 text-foreground/40 hover:text-foreground/70 transition-colors"
                aria-label="Hide prompt"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Prompt controls */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (makerProfile) {
                    setCurrentPrompt(shufflePrompt(makerProfile, currentPrompt.text))
                  }
                }}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/60 hover:text-foreground transition-colors"
                style={{ border: "0.5px solid rgba(26,26,31,0.15)" }}
              >
                <Shuffle className="h-3 w-3" strokeWidth={1.5} />
                Shuffle
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProfilePicker(!showProfilePicker)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/60 hover:text-foreground transition-colors"
                  style={{ border: "0.5px solid rgba(26,26,31,0.15)" }}
                >
                  <RefreshCw className="h-3 w-3" strokeWidth={1.5} />
                  Try Another
                  <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
                </button>

                {showProfilePicker && (
                  <div
                    className="absolute left-0 top-full mt-1 z-20 rounded-xl py-1 min-w-[140px]"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.95)",
                      backdropFilter: "blur(20px)",
                      border: "0.5px solid rgba(26,26,31,0.12)",
                      boxShadow: "0 8px 24px -8px rgba(60,70,90,0.2)",
                    }}
                  >
                    {(["visualizer", "storyteller", "inhabitant", "remixer"] as MakerProfileType[]).map((profile) => (
                      <button
                        key={profile}
                        type="button"
                        onClick={() => {
                          setCurrentPrompt(getPromptForProfile(profile))
                          setShowProfilePicker(false)
                        }}
                        className={`w-full px-3 py-2 text-left font-mono text-[11px] hover:bg-foreground/5 transition-colors ${
                          currentPrompt.profile === profile ? "text-foreground font-medium" : "text-foreground/70"
                        }`}
                      >
                        {MAKER_PROFILE_INFO[profile].name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPrompt(FREE_CREATE_PROMPT)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/60 hover:text-foreground transition-colors"
                style={{ border: "0.5px solid rgba(26,26,31,0.15)" }}
              >
                Free Create
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPromptVisible(true)}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/50 hover:text-foreground/70 transition-colors"
            style={{ border: "0.5px dashed rgba(26,26,31,0.2)" }}
          >
            <Sparkles className="h-3 w-3" strokeWidth={1.5} />
            Show Prompt
          </button>
        )}

        {selectedArtwork && (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">
            referencing · {selectedArtwork.title}
          </p>
        )}
      </div>

      {/* Drawing surface — stacked canvases */}
      <div className="min-h-0 flex-1 px-4 pb-3 pt-3 sm:px-8 md:px-12">
        <div
          ref={containerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative h-full w-full overflow-hidden rounded-[28px]"
          style={{
            backgroundColor: "#ffffff",
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.9) inset, 0 24px 48px -28px rgba(60,70,90,0.22), 0 4px 14px -8px rgba(60,70,90,0.12)",
            border: "0.5px solid rgba(26,26,31,0.08)",
            touchAction: "none",
            cursor: mode === "draw" ? "crosshair" : "default",
          }}
          aria-label="Drawing canvas"
        >
          {/* Reference image canvas — sits at the bottom of the stack. */}
          <canvas
            ref={refCanvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ opacity: referenceEnabled ? referenceOpacity : 0, transition: "opacity 200ms" }}
            aria-hidden="true"
          />

          {/* Five user layers, painted bottom (1) → top (5). */}
          {layers.map((layer, i) => (
            <canvas
              key={layer.id}
              ref={(el) => {
                layerRefs.current[i] = el
              }}
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ opacity: layer.visible ? 1 : 0, transition: "opacity 150ms" }}
              aria-label={`Layer ${i + 1}`}
            />
          ))}

          {!hasInk && mode === "draw" && (
            <p className="pointer-events-none absolute bottom-5 right-5 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/30">
              tap & drag to sketch
            </p>
          )}

        </div>
      </div>

      {/* Toolbar */}
      <div className="sticky bottom-0 z-10 px-4 pb-6 sm:px-8 md:px-12">
        {mode === "draw" ? (
          <DrawToolbar
            color={color}
            brushSize={brushSize}
            brushType={brushType}
            brushTransparency={brushTransparency}
            palette={palette}
            layers={layers}
            activeLayer={activeLayer}
            referenceEnabled={referenceEnabled}
            referenceOpacity={referenceOpacity}
            hasReference={Boolean(selectedArtwork?.primaryimageurl)}
            onColorChange={setColor}
            onBrushSizeChange={setBrushSize}
            onBrushTypeChange={setBrushType}
            onBrushTransparencyChange={setBrushTransparency}
            onLayerSelect={setActiveLayer}
            onLayerToggle={toggleLayerVisibility}
            onReferenceToggle={() => setReferenceEnabled((v) => !v)}
            onReferenceOpacityChange={setReferenceOpacity}
            onSwitchToText={() => setMode("text")}
            onAddArtwork={addArtworkToLayer}
            onClear={clearActiveLayer}
            hasInk={hasInk}
          />
        ) : (
          <TextToolbar
            note={note}
            onNoteChange={setNote}
            onSwitchToDraw={() => setMode("draw")}
            onSubmit={handleClose}
          />
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* DrawToolbar                                                                 */
/* -------------------------------------------------------------------------- */

type Panel =
  | "none"
  | "size"
  | "color"
  | "brush"
  | "layers"
  | "reference"
  | "transparency"
  | "album"

function DrawToolbar({
  color,
  brushSize,
  brushType,
  brushTransparency,
  palette,
  layers,
  activeLayer,
  referenceEnabled,
  referenceOpacity,
  hasReference,
  onColorChange,
  onBrushSizeChange,
  onBrushTypeChange,
  onBrushTransparencyChange,
  onLayerSelect,
  onLayerToggle,
  onReferenceToggle,
  onReferenceOpacityChange,
  onSwitchToText,
  onAddArtwork,
  onClear,
  hasInk,
}: {
  color: string
  brushSize: number
  brushType: BrushType
  brushTransparency: number
  palette: string[]
  layers: LayerState[]
  activeLayer: number
  referenceEnabled: boolean
  referenceOpacity: number
  hasReference: boolean
  onColorChange: (c: string) => void
  onBrushSizeChange: (b: number) => void
  onBrushTypeChange: (b: BrushType) => void
  onBrushTransparencyChange: (v: number) => void
  onLayerSelect: (i: number) => void
  onLayerToggle: (i: number) => void
  onReferenceToggle: () => void
  onReferenceOpacityChange: (v: number) => void
  onSwitchToText: () => void
  onAddArtwork: (artwork: CuratedArtwork) => void
  onClear: () => void
  hasInk: boolean
}) {
  const [panel, setPanel] = useState<Panel>("none")
  /* ---------------- Adaptive pagination ---------------- */
  /*
    The toolbar splits into two functional pages — Page 1 holds the
    creation tools (text, brush, size, color, transparency) and Page 2
    holds the management tools (album on the far left, layers, reference,
    clear). On wide containers we collapse both pages back into a single
    unified row so nothing is hidden when there's room. We measure the
    container with a ResizeObserver and switch based on whether the inner
    "if this were single-row" width would exceed the available space.
  */
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [paginated, setPaginated] = useState(true)
  const [currentPage, setCurrentPage] = useState<0 | 1>(0)
  // Touch-swipe tracking — start X recorded on touchstart, distance on touchend.
  const touchStartXRef = useRef<number | null>(null)

  // Approximate single-row width: 9 buttons + gaps + padding. We keep this
  // in sync with the actual button widths used below (h-11 w-11 = 44px,
  // gap-2 = 8px, px-3 wrapper = 24px total padding).
  const SINGLE_ROW_THRESHOLD = 9 * 44 + 8 * 8 + 24 + 16 // small safety margin

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth
      const shouldPaginate = w < SINGLE_ROW_THRESHOLD
      setPaginated(shouldPaginate)
      // Snap back to page 0 whenever we collapse into a single row so we
      // never end up rendering page 1 with no dot to indicate it.
      if (!shouldPaginate) setCurrentPage(0)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
    // SINGLE_ROW_THRESHOLD is a stable constant — no need to depend on it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When the user opens a panel, jump to the page that owns it so the
  // popup doesn't appear above an icon they can't see.
  useEffect(() => {
    if (!paginated || panel === "none") return
    const PAGE_1: Panel[] = ["brush", "size", "color", "transparency"]
    const PAGE_2: Panel[] = ["album", "layers", "reference"]
    if (PAGE_1.includes(panel)) setCurrentPage(0)
    else if (PAGE_2.includes(panel)) setCurrentPage(1)
  }, [panel, paginated])

  const togglePanel = (target: Panel) =>
    setPanel((prev) => (prev === target ? "none" : target))

  const neu: React.CSSProperties = {
    background: "linear-gradient(145deg, #ffffff, #eef0f4)",
    boxShadow: "4px 4px 10px rgba(209,217,230,0.9), -4px -4px 10px rgba(255,255,255,0.95)",
  }

  const panelStyle: React.CSSProperties = {
    backgroundColor: "#f0f2f5",
    boxShadow:
      "inset 3px 3px 7px #d1d9e6, inset -3px -3px 7px #ffffff, 0 8px 20px -10px rgba(60,70,90,0.18)",
    borderRadius: "20px",
    padding: "12px 14px",
    marginBottom: "8px",
  }

  const ActiveBrushIcon = BRUSH_ICONS[brushType]

  return (
    <div className="flex flex-col">
      {/* Floating panels — appear above the toolbar */}
      {panel === "brush" && (
        <div style={panelStyle}>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/55">
            brush
          </p>
          <div className="flex items-center gap-2.5">
            {BRUSH_ORDER.map((b) => {
              const active = brushType === b
              const Icon = BRUSH_ICONS[b]
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    onBrushTypeChange(b)
                    setPanel("none")
                  }}
                  aria-label={BRUSH_PRESETS[b].label}
                  aria-pressed={active}
                  title={BRUSH_PRESETS[b].label}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full transition-all"
                    style={{
                      ...neu,
                      border: active ? "1.5px solid rgba(26,26,31,0.5)" : "none",
                      transform: active ? "scale(1.06)" : "scale(1)",
                    }}
                  >
                    <Icon className="h-4 w-4 text-foreground/80" strokeWidth={1.4} />
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/55">
                    {BRUSH_PRESETS[b].label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {panel === "size" && (
        <div style={panelStyle} className="flex items-center gap-3">
          {BRUSH_SIZES.map((b) => {
            const active = brushSize === b
            return (
              <button
                key={b}
                type="button"
                onClick={() => {
                  onBrushSizeChange(b)
                  setPanel("none")
                }}
                aria-label={`Brush size ${b}`}
                aria-pressed={active}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-all"
                style={{
                  ...neu,
                  border: active ? "1.5px solid rgba(26,26,31,0.5)" : "none",
                  transform: active ? "scale(1.05)" : "scale(1)",
                }}
              >
                <span
                  className="block rounded-full bg-foreground"
                  style={{ width: Math.max(2, b * 1.2), height: Math.max(2, b * 1.2) }}
                />
              </button>
            )
          })}
        </div>
      )}

      {panel === "color" && (
        <div style={panelStyle}>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/55">
            palette
          </p>
          <div className="grid grid-cols-6 gap-2.5">
            {palette.map((c) => {
              const active = color.toLowerCase() === c.toLowerCase()
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onColorChange(c)
                    setPanel("none")
                  }}
                  aria-label={`Color ${c}`}
                  aria-pressed={active}
                  className="h-9 w-9 rounded-full transition-transform"
                  style={{
                    backgroundColor: c,
                    border: active
                      ? "2px solid rgba(26,26,31,0.7)"
                      : "1px solid rgba(26,26,31,0.12)",
                    transform: active ? "scale(1.1)" : "scale(1)",
                    boxShadow: active ? "0 3px 8px -2px rgba(0,0,0,0.3)" : undefined,
                  }}
                />
              )
            })}
          </div>
        </div>
      )}

      {panel === "transparency" && (
        <div style={panelStyle}>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/55">
              brush transparency
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={brushTransparency}
              onChange={(e) => onBrushTransparencyChange(Number(e.target.value))}
              className="flex-1 accent-foreground"
              aria-label="Brush transparency"
            />
            <span className="w-10 text-right font-mono text-[11px] tabular-nums text-foreground/65">
              {brushTransparency}%
            </span>
          </div>
        </div>
      )}

      {panel === "layers" && (
        <div style={panelStyle}>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/55">
              layers
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-foreground/40">
              max {MAX_LAYERS}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            {layers.map((layer, i) => {
              const active = activeLayer === i
              return (
                <div
                  key={layer.id}
                  className="flex items-center gap-2 rounded-full px-2 py-1.5 transition-colors"
                  style={{
                    backgroundColor: active ? "rgba(26,26,31,0.06)" : "transparent",
                    border: active
                      ? "1px solid rgba(26,26,31,0.18)"
                      : "1px solid transparent",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onLayerSelect(i)}
                    aria-label={`Activate layer ${i + 1}`}
                    aria-pressed={active}
                    className="flex flex-1 items-center gap-2 rounded-full text-left"
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px]"
                      style={{
                        ...neu,
                        opacity: layer.visible ? 1 : 0.45,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="font-mono text-[12px] text-foreground/75">
                      Layer {i + 1}
                      {active && (
                        <span className="ml-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-foreground/45">
                          active
                        </span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onLayerToggle(i)}
                    aria-label={layer.visible ? `Hide layer ${i + 1}` : `Show layer ${i + 1}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={neu}
                  >
                    {layer.visible ? (
                      <Eye className="h-3.5 w-3.5 text-foreground/70" strokeWidth={1.5} />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-foreground/40" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {panel === "reference" && (
        <div style={panelStyle}>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/55">
              import original
            </p>
            <button
              type="button"
              onClick={onReferenceToggle}
              disabled={!hasReference}
              className="rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                backgroundColor: referenceEnabled ? "rgba(26,26,31,0.85)" : "rgba(255,255,255,0.65)",
                color: referenceEnabled ? "#f5f5f4" : "rgba(26,26,31,0.7)",
                border: "0.75px solid rgba(26,26,31,0.18)",
              }}
            >
              {referenceEnabled ? "on" : "off"}
            </button>
          </div>
          {!hasReference ? (
            <p className="font-mono text-[11px] font-light text-foreground/55">
              Select an artwork to enable the reference overlay.
            </p>
          ) : (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">
                opacity
              </span>
              <input
                type="range"
                min={0.1}
                max={0.9}
                step={0.05}
                value={referenceOpacity}
                onChange={(e) => onReferenceOpacityChange(Number(e.target.value))}
                disabled={!referenceEnabled}
                className="flex-1 accent-foreground disabled:opacity-40"
                aria-label="Reference image opacity"
              />
              <span className="w-9 text-right font-mono text-[11px] tabular-nums text-foreground/65">
                {Math.round(referenceOpacity * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Album panel — popup grid of curated artworks. Mirrors the other
          panels' glass surface, anchored above the album button. */}
      {panel === "album" && (
        <div style={panelStyle}>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/55">
              popular works
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-foreground/40">
              tap to add layer
            </p>
          </div>
          <div
            className="grid grid-cols-3 gap-2 overflow-y-auto pr-1"
            style={{ maxHeight: "200px" }}
          >
            {CURATED_ARTWORKS.filter((a) => Boolean(a.fallbackImageUrl)).map(
              (artwork) => (
                <button
                  key={artwork.objectid}
                  type="button"
                  onClick={() => {
                    onAddArtwork(artwork)
                    setPanel("none")
                  }}
                  className="group flex flex-col items-stretch gap-1 rounded-xl p-1 text-left transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
                  aria-label={`Add ${artwork.title} by ${artwork.artist} as a new layer`}
                >
                  <div
                    className="aspect-square w-full overflow-hidden rounded-md bg-foreground/5"
                    style={{ border: "0.5px solid rgba(26,26,31,0.1)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={artwork.fallbackImageUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                      draggable={false}
                    />
                  </div>
                  <p className="line-clamp-2 px-0.5 font-mono text-[9px] leading-tight text-foreground/65">
                    {artwork.artist}
                  </p>
                </button>
              ),
            )}
          </div>
        </div>
      )}

      {/* Main toolbar — adaptive: a single unified row when the container
          has room, otherwise a 2-page swipeable layout with pagination dots. */}
      <div
        ref={wrapperRef}
        className="flex flex-col"
        onTouchStart={(e) => {
          if (!paginated) return
          touchStartXRef.current = e.touches[0]?.clientX ?? null
        }}
        onTouchEnd={(e) => {
          if (!paginated) return
          const start = touchStartXRef.current
          touchStartXRef.current = null
          if (start == null) return
          const end = e.changedTouches[0]?.clientX ?? start
          const delta = end - start
          // Threshold tuned for thumb-sized swipes; ignore taps + tiny drags.
          if (Math.abs(delta) < 32) return
          if (delta < 0 && currentPage === 0) setCurrentPage(1)
          else if (delta > 0 && currentPage === 1) setCurrentPage(0)
        }}
      >
        {/* The toolbar surface — same neumorphic shell as before, but now
            holds either a single row or a paginated viewport. */}
        <div
          className="overflow-hidden rounded-[28px] px-3 py-3"
          style={{
            backgroundColor: "#f0f2f5",
            boxShadow:
              "inset 6px 6px 12px #d1d9e6, inset -6px -6px 12px #ffffff, 0 12px 30px -12px rgba(60,70,90,0.1)",
          }}
        >
          {paginated ? (
            <div
              className="flex"
              style={{
                width: "200%",
                transform: `translateX(${currentPage === 0 ? "0%" : "-50%"})`,
                transition: "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {/* Page 1 — Creation tools */}
              <div
                className="flex w-1/2 items-center gap-2"
                aria-hidden={currentPage !== 0}
              >
                <TextButton onSwitchToText={onSwitchToText} neu={neu} />
                <BrushTypeButton
                  panel={panel}
                  togglePanel={togglePanel}
                  ActiveBrushIcon={ActiveBrushIcon}
                  brushType={brushType}
                  neu={neu}
                />
                <BrushSizeButton
                  panel={panel}
                  togglePanel={togglePanel}
                  brushSize={brushSize}
                  neu={neu}
                />
                <ColorButton
                  panel={panel}
                  togglePanel={togglePanel}
                  color={color}
                  neu={neu}
                />
                <TransparencyButton
                  panel={panel}
                  togglePanel={togglePanel}
                  brushTransparency={brushTransparency}
                  neu={neu}
                />
                {/* push the row to the left, mirroring the spacer on Page 2 */}
                <div className="flex-1" />
              </div>

              {/* Page 2 — Management tools (Album on the far left) */}
              <div
                className="flex w-1/2 items-center gap-2"
                aria-hidden={currentPage !== 1}
              >
                <AlbumButton
                  panel={panel}
                  togglePanel={togglePanel}
                  neu={neu}
                />
                <LayersButton
                  panel={panel}
                  togglePanel={togglePanel}
                  activeLayer={activeLayer}
                  neu={neu}
                />
                <ReferenceButton
                  panel={panel}
                  togglePanel={togglePanel}
                  referenceEnabled={referenceEnabled}
                  neu={neu}
                />
                <div className="flex-1" />
                {hasInk ? <ClearButton onClear={onClear} neu={neu} /> : null}
              </div>
            </div>
          ) : (
            /* Single-row mode — every icon visible at once */
            <div className="flex items-center gap-2">
              <AlbumButton
                panel={panel}
                togglePanel={togglePanel}
                neu={neu}
              />
              <TextButton onSwitchToText={onSwitchToText} neu={neu} />
              <BrushTypeButton
                panel={panel}
                togglePanel={togglePanel}
                ActiveBrushIcon={ActiveBrushIcon}
                brushType={brushType}
                neu={neu}
              />
              <BrushSizeButton
                panel={panel}
                togglePanel={togglePanel}
                brushSize={brushSize}
                neu={neu}
              />
              <ColorButton
                panel={panel}
                togglePanel={togglePanel}
                color={color}
                neu={neu}
              />
              <TransparencyButton
                panel={panel}
                togglePanel={togglePanel}
                brushTransparency={brushTransparency}
                neu={neu}
              />
              <div className="flex-1" />
              <LayersButton
                panel={panel}
                togglePanel={togglePanel}
                activeLayer={activeLayer}
                neu={neu}
              />
              <ReferenceButton
                panel={panel}
                togglePanel={togglePanel}
                referenceEnabled={referenceEnabled}
                neu={neu}
              />
              {hasInk ? <ClearButton onClear={onClear} neu={neu} /> : null}
            </div>
          )}
        </div>

        {/* Pagination dots — only when paginated, anchored just below
            the toolbar. Click on a dot to jump pages directly. */}
        {paginated && (
          <div
            className="mt-2 flex items-center justify-center gap-1.5"
            role="tablist"
            aria-label="Toolbar pages"
          >
            {[0, 1].map((i) => {
              const active = currentPage === i
              return (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`Go to ${i === 0 ? "creation" : "management"} tools`}
                  onClick={() => setCurrentPage(i as 0 | 1)}
                  className="rounded-full transition-all"
                  style={{
                    width: active ? 18 : 6,
                    height: 6,
                    backgroundColor: active
                      ? "rgba(26,26,31,0.75)"
                      : "rgba(26,26,31,0.22)",
                  }}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Toolbar button building blocks                                              */
/* -------------------------------------------------------------------------- */
/*
  Each button is extracted into a tiny presentational component so the same
  JSX can be rendered into either the single-row layout or one of the two
  paginated pages without duplicating styles. They keep the original
  neumorphic + active-state styling intact.
*/

function TextButton({
  onSwitchToText,
  neu,
}: {
  onSwitchToText: () => void
  neu: React.CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={onSwitchToText}
      aria-label="Switch to text input"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
      style={neu}
    >
      <Type className="h-4 w-4 text-foreground/80" strokeWidth={1.5} aria-hidden="true" />
    </button>
  )
}

function BrushTypeButton({
  panel,
  togglePanel,
  ActiveBrushIcon,
  brushType,
  neu,
}: {
  panel: Panel
  togglePanel: (p: Panel) => void
  ActiveBrushIcon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  brushType: BrushType
  neu: React.CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={() => togglePanel("brush")}
      aria-label="Change brush"
      aria-expanded={panel === "brush"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all"
      style={{
        ...neu,
        border: panel === "brush" ? "1.5px solid rgba(26,26,31,0.4)" : "none",
      }}
      title={BRUSH_PRESETS[brushType].label}
    >
      <ActiveBrushIcon className="h-4 w-4 text-foreground/80" strokeWidth={1.5} />
    </button>
  )
}

function BrushSizeButton({
  panel,
  togglePanel,
  brushSize,
  neu,
}: {
  panel: Panel
  togglePanel: (p: Panel) => void
  brushSize: number
  neu: React.CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={() => togglePanel("size")}
      aria-label="Change brush size"
      aria-expanded={panel === "size"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all"
      style={{
        ...neu,
        border: panel === "size" ? "1.5px solid rgba(26,26,31,0.4)" : "none",
      }}
    >
      <span
        className="block rounded-full bg-foreground"
        style={{ width: Math.max(3, brushSize * 1.2), height: Math.max(3, brushSize * 1.2) }}
      />
    </button>
  )
}

function ColorButton({
  panel,
  togglePanel,
  color,
  neu,
}: {
  panel: Panel
  togglePanel: (p: Panel) => void
  color: string
  neu: React.CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={() => togglePanel("color")}
      aria-label="Change color"
      aria-expanded={panel === "color"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all"
      style={{
        ...neu,
        border: panel === "color" ? "1.5px solid rgba(26,26,31,0.4)" : "none",
      }}
    >
      <span
        className="block h-6 w-6 rounded-full"
        style={{ backgroundColor: color, border: "0.5px solid rgba(26,26,31,0.18)" }}
      />
    </button>
  )
}

function TransparencyButton({
  panel,
  togglePanel,
  brushTransparency,
  neu,
}: {
  panel: Panel
  togglePanel: (p: Panel) => void
  brushTransparency: number
  neu: React.CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={() => togglePanel("transparency")}
      aria-label="Adjust brush transparency"
      aria-expanded={panel === "transparency"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all"
      style={{
        ...neu,
        border: panel === "transparency" ? "1.5px solid rgba(26,26,31,0.4)" : "none",
      }}
      title={`Transparency: ${brushTransparency}%`}
    >
      <span
        className="font-mono text-[10px] font-semibold text-foreground/80"
        style={{ opacity: brushTransparency / 100 }}
      >
        A
      </span>
    </button>
  )
}

function AlbumButton({
  panel,
  togglePanel,
  neu,
}: {
  panel: Panel
  togglePanel: (p: Panel) => void
  neu: React.CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={() => togglePanel("album")}
      aria-label="Open album of popular works"
      aria-expanded={panel === "album"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all"
      style={{
        ...neu,
        border: panel === "album" ? "1.5px solid rgba(26,26,31,0.4)" : "none",
      }}
      title="Album"
    >
      <BookOpen className="h-4 w-4 text-foreground/80" strokeWidth={1.5} aria-hidden="true" />
    </button>
  )
}

function LayersButton({
  panel,
  togglePanel,
  activeLayer,
  neu,
}: {
  panel: Panel
  togglePanel: (p: Panel) => void
  activeLayer: number
  neu: React.CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={() => togglePanel("layers")}
      aria-label="Manage layers"
      aria-expanded={panel === "layers"}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all"
      style={{
        ...neu,
        border: panel === "layers" ? "1.5px solid rgba(26,26,31,0.4)" : "none",
      }}
      title={`Active: layer ${activeLayer + 1}`}
    >
      <Layers className="h-4 w-4 text-foreground/80" strokeWidth={1.5} />
      <span
        className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full font-mono text-[9px]"
        style={{
          backgroundColor: "rgba(26,26,31,0.85)",
          color: "#f5f5f4",
        }}
      >
        {activeLayer + 1}
      </span>
    </button>
  )
}

function ReferenceButton({
  panel,
  togglePanel,
  referenceEnabled,
  neu,
}: {
  panel: Panel
  togglePanel: (p: Panel) => void
  referenceEnabled: boolean
  neu: React.CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={() => togglePanel("reference")}
      aria-label="Reference image overlay"
      aria-expanded={panel === "reference"}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all"
      style={{
        ...neu,
        border:
          panel === "reference" || referenceEnabled
            ? "1.5px solid rgba(26,26,31,0.4)"
            : "none",
      }}
      title="Import original"
    >
      <ImageIcon
        className="h-4 w-4"
        strokeWidth={1.5}
        style={{
          color: referenceEnabled ? "rgba(26,26,31,0.95)" : "rgba(26,26,31,0.6)",
        }}
      />
    </button>
  )
}

function ClearButton({
  onClear,
  neu,
}: {
  onClear: () => void
  neu: React.CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label="Clear active layer"
      className="flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/65"
      style={neu}
    >
      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
      clear
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/* TextToolbar                                                                 */
/* -------------------------------------------------------------------------- */

function TextToolbar({
  note,
  onNoteChange,
  onSwitchToDraw,
  onSubmit,
}: {
  note: string
  onNoteChange: (v: string) => void
  onSwitchToDraw: () => void
  onSubmit: () => void
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex items-center gap-3 rounded-[28px] px-3 py-3"
      style={{
        backgroundColor: "#f0f2f5",
        boxShadow:
          "inset 6px 6px 12px #d1d9e6, inset -6px -6px 12px #ffffff, 0 12px 30px -12px rgba(60,70,90,0.1)",
      }}
    >
      <div
        className="flex flex-1 items-center rounded-full px-4 py-2"
        style={{
          background: "linear-gradient(145deg, #eef0f4, #ffffff)",
          boxShadow:
            "inset 4px 4px 8px rgba(209,217,230,0.9), inset -4px -4px 8px rgba(255,255,255,0.95)",
        }}
      >
        <input
          type="text"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Describe your artistic thoughts..."
          aria-label="Artistic note"
          autoComplete="off"
          className="w-full bg-transparent font-mono text-[13px] font-light text-foreground placeholder:text-foreground/40 focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={onSwitchToDraw}
        aria-label="Switch to drawing"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{
          background: "linear-gradient(145deg, #ffffff, #eef0f4)",
          boxShadow: "4px 4px 10px rgba(209,217,230,0.9), -4px -4px 10px rgba(255,255,255,0.95)",
        }}
      >
        <Pencil className="h-4 w-4 text-foreground/80" strokeWidth={1.5} aria-hidden="true" />
      </button>
    </form>
  )
}
