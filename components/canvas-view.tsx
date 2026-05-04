"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Pencil, Type } from "lucide-react"

type Mode = "draw" | "text"

interface CanvasViewProps {
  prompt?: string
  onClose: (saved?: { dataUrl: string; note?: string }) => void
  closeRef?: React.MutableRefObject<(() => void) | null>
}

const COLORS = [
  "#1a1a1f",
  "#e76f51",
  "#f4a261",
  "#e9c46a",
  "#2a9d8f",
  "#7c8aa0",
  "#d4a5a5",
  "#a8b89c",
] as const

const BRUSH_SIZES = [1.5, 3, 6, 10] as const

// Re-apply context settings that are wiped when canvas dimensions change
function applyCtxSettings(
  ctx: CanvasRenderingContext2D,
  dpr: number,
  color: string,
  brush: number,
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.strokeStyle = color
  ctx.lineWidth = brush
}

export function CanvasView({
  prompt = "Draw something that makes you feel calm",
  onClose,
  closeRef,
}: CanvasViewProps) {
  const [mode, setMode] = useState<Mode>("draw")
  const [color, setColor] = useState<string>("#1a1a1f")
  const [brush, setBrush] = useState<number>(3)
  const [note, setNote] = useState<string>("")
  const [hasInk, setHasInk] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const lastPtRef = useRef<{ x: number; y: number } | null>(null)
  // Keep color/brush in a ref so the pointer handlers always see current values
  // without needing to be re-registered after every state change.
  const colorRef = useRef(color)
  const brushRef = useRef(brush)
  useEffect(() => { colorRef.current = color }, [color])
  useEffect(() => { brushRef.current = brush }, [brush])

  // ---- Setup canvas with HiDPI support + ResizeObserver ----
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let pendingSetup: ReturnType<typeof requestAnimationFrame> | null = null

    const setup = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const dpr = window.devicePixelRatio || 1

      // Preserve strokes
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
      applyCtxSettings(ctx, dpr, colorRef.current, brushRef.current)

      if (prev.width > 0 && prev.height > 0) {
        ctx.drawImage(prev, 0, 0, rect.width, rect.height)
      }
    }

    // Defer the initial setup one frame to guarantee the flex layout has settled
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
    ro.observe(canvas)

    return () => {
      if (pendingSetup !== null) cancelAnimationFrame(pendingSetup)
      ro.disconnect()
    }
  }, [])

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "draw") return
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    drawingRef.current = true
    lastPtRef.current = getPoint(e)

    // Start a dot for single taps
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx || !canvas) return
    const dpr = window.devicePixelRatio || 1
    applyCtxSettings(ctx, dpr, colorRef.current, brushRef.current)
    const pt = lastPtRef.current
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, brushRef.current / 2, 0, Math.PI * 2)
    ctx.fillStyle = colorRef.current
    ctx.fill()
    if (!hasInk) setHasInk(true)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || mode !== "draw") return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx || !canvas) return

    const dpr = window.devicePixelRatio || 1
    applyCtxSettings(ctx, dpr, colorRef.current, brushRef.current)

    const pt = getPoint(e)
    const last = lastPtRef.current ?? pt
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(pt.x, pt.y)
    ctx.stroke()
    lastPtRef.current = pt
    if (!hasInk) setHasInk(true)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "draw") return
    drawingRef.current = false
    lastPtRef.current = null
    canvasRef.current?.releasePointerCapture(e.pointerId)
  }

  const clearCanvas = () => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext("2d")
    if (!ctx) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.restore()
    setHasInk(false)
  }

  const handleClose = () => {
    if (hasInk && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL("image/png")
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Contextual prompt */}
      <div className="px-4 pt-2 sm:px-8 md:px-12">
        <p className="font-mono text-[12px] font-light leading-relaxed text-foreground/75">{prompt}</p>
      </div>

      {/* Drawing surface */}
      <div className="min-h-0 flex-1 px-4 pb-3 pt-3 sm:px-8 md:px-12">
        <div
          className="relative h-full w-full overflow-hidden rounded-[28px]"
          style={{
            backgroundColor: "#ffffff",
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.9) inset, 0 24px 48px -28px rgba(60,70,90,0.22), 0 4px 14px -8px rgba(60,70,90,0.12)",
            border: "0.5px solid rgba(26,26,31,0.08)",
          }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="absolute inset-0 h-full w-full"
            style={{ touchAction: "none", cursor: mode === "draw" ? "crosshair" : "default" }}
            aria-label="Drawing canvas"
          />
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
            brush={brush}
            onColorChange={setColor}
            onBrushChange={setBrush}
            onSwitchToText={() => setMode("text")}
            onClear={clearCanvas}
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

/* ---------------- DrawToolbar ---------------- */

function DrawToolbar({
  color,
  brush,
  onColorChange,
  onBrushChange,
  onSwitchToText,
  onClear,
  hasInk,
}: {
  color: string
  brush: number
  onColorChange: (c: string) => void
  onBrushChange: (b: number) => void
  onSwitchToText: () => void
  onClear: () => void
  hasInk: boolean
}) {
  const [panel, setPanel] = useState<"none" | "size" | "color">("none")

  const togglePanel = (target: "size" | "color") =>
    setPanel((prev) => (prev === target ? "none" : target))

  const neu = {
    background: "linear-gradient(145deg, #ffffff, #eef0f4)",
    boxShadow: "4px 4px 10px rgba(209,217,230,0.9), -4px -4px 10px rgba(255,255,255,0.95)",
  }

  const panelStyle: React.CSSProperties = {
    backgroundColor: "#f0f2f5",
    boxShadow:
      "inset 3px 3px 7px #d1d9e6, inset -3px -3px 7px #ffffff, 0 8px 20px -10px rgba(60,70,90,0.18)",
    borderRadius: "20px",
    padding: "10px 14px",
    marginBottom: "8px",
  }

  return (
    <div className="flex flex-col">
      {/* Floating panels — appear above the toolbar */}
      {panel === "size" && (
        <div style={panelStyle} className="flex items-center gap-3">
          {BRUSH_SIZES.map((b) => {
            const active = brush === b
            return (
              <button
                key={b}
                type="button"
                onClick={() => { onBrushChange(b); setPanel("none") }}
                aria-label={`Brush size ${b}`}
                aria-pressed={active}
                className="flex h-9 w-9 items-center justify-center rounded-full transition-all"
                style={{
                  ...neu,
                  border: active ? "1.5px solid rgba(26,26,31,0.5)" : "none",
                  transform: active ? "scale(1.05)" : "scale(1)",
                }}
              >
                <span
                  className="block rounded-full bg-foreground"
                  style={{ width: Math.max(2, b * 1.4), height: Math.max(2, b * 1.4) }}
                />
              </button>
            )
          })}
        </div>
      )}

      {panel === "color" && (
        <div style={panelStyle} className="grid grid-cols-4 gap-2.5">
          {COLORS.map((c) => {
            const active = color === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => { onColorChange(c); setPanel("none") }}
                aria-label={`Color ${c}`}
                aria-pressed={active}
                className="h-9 w-9 rounded-full transition-transform"
                style={{
                  backgroundColor: c,
                  border: active ? "2px solid rgba(26,26,31,0.7)" : "1px solid rgba(26,26,31,0.12)",
                  transform: active ? "scale(1.1)" : "scale(1)",
                  boxShadow: active ? "0 3px 8px -2px rgba(0,0,0,0.3)" : undefined,
                }}
              />
            )
          })}
        </div>
      )}

      {/* Main toolbar row */}
      <div
        className="flex items-center gap-3 rounded-[28px] px-3 py-3"
        style={{
          backgroundColor: "#f0f2f5",
          boxShadow:
            "inset 6px 6px 12px #d1d9e6, inset -6px -6px 12px #ffffff, 0 12px 30px -12px rgba(60,70,90,0.1)",
        }}
      >
        {/* Text mode toggle */}
        <button
          type="button"
          onClick={onSwitchToText}
          aria-label="Switch to text input"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={neu}
        >
          <Type className="h-4 w-4 text-foreground/80" strokeWidth={1.5} aria-hidden="true" />
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Active brush size indicator — click to open size picker */}
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
            style={{ width: Math.max(3, brush * 1.4), height: Math.max(3, brush * 1.4) }}
          />
        </button>

        {/* Active color swatch — click to open color picker */}
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

        {/* Clear / empty-state indicator */}
        {hasInk ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear canvas"
            className="flex h-11 shrink-0 items-center justify-center rounded-full px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/65"
            style={neu}
          >
            clear
          </button>
        ) : (
          <div style={{ width: 0 }} />
        )}
      </div>
    </div>
  )
}

/* ---------------- TextToolbar ---------------- */

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
      onSubmit={(e) => { e.preventDefault(); onSubmit() }}
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
          boxShadow: "inset 4px 4px 8px rgba(209,217,230,0.9), inset -4px -4px 8px rgba(255,255,255,0.95)",
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
