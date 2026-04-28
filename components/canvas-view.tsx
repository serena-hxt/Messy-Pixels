"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Pencil, Type } from "lucide-react"

type Mode = "draw" | "text"

interface CanvasViewProps {
  /** Contextual prompt shown above the canvas. */
  prompt?: string
  /** Called when user closes; passes dataUrl if a drawing exists. */
  onClose: (saved?: { dataUrl: string; note?: string }) => void
  /** Optional ref the parent can use to trigger the same save-and-close behaviour. */
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

export function CanvasView({
  prompt = "Draw something that makes you feel calm",
  onClose,
  closeRef,
}: CanvasViewProps) {
  const [mode, setMode] = useState<Mode>("draw")
  const [color, setColor] = useState<string>("#e9c46a")
  const [brush, setBrush] = useState<number>(3)
  const [note, setNote] = useState<string>("")
  const [hasInk, setHasInk] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const lastPtRef = useRef<{ x: number; y: number } | null>(null)

  // ---- Setup canvas with HiDPI support + ResizeObserver ----
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const setup = () => {
      const rect = canvas.getBoundingClientRect()
      // Skip until the flex layout has settled and the canvas has real dimensions
      if (rect.width === 0 || rect.height === 0) return
      const dpr = window.devicePixelRatio || 1

      // Preserve existing strokes when resizing
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
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      if (prev.width > 0 && prev.height > 0) {
        ctx.drawImage(prev, 0, 0, rect.width, rect.height)
      }
    }

    setup()
    const ro = new ResizeObserver(() => setup())
    ro.observe(canvas)
    return () => ro.disconnect()
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
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || mode !== "draw") return
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    const pt = getPoint(e)
    const last = lastPtRef.current ?? pt
    ctx.strokeStyle = color
    ctx.lineWidth = brush
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

  // Expose the close behaviour so parent components (e.g. the back button) can trigger it.
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

      {/* Drawing surface — fills available space, pure white card lifted above the aura */}
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
            style={{
              touchAction: "none",
              cursor: mode === "draw" ? "crosshair" : "default",
            }}
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

/* ---------------- Sub-components ---------------- */

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
  return (
    <div
      className="flex items-center gap-3 rounded-[28px] px-3 py-3"
      style={{
        backgroundColor: "#f0f2f5",
        boxShadow:
          "inset 6px 6px 12px #d1d9e6, inset -6px -6px 12px #ffffff, 0 12px 30px -12px rgba(60,70,90,0.1)",
      }}
    >
      <button
        type="button"
        onClick={onSwitchToText}
        aria-label="Switch to text input"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{
          background: "linear-gradient(145deg, #ffffff, #eef0f4)",
          boxShadow: "4px 4px 10px rgba(209,217,230,0.9), -4px -4px 10px rgba(255,255,255,0.95)",
        }}
      >
        <Type className="h-4 w-4 text-foreground/80" strokeWidth={1.5} aria-hidden="true" />
      </button>

      <div
        className="flex flex-1 items-center gap-2 overflow-x-auto rounded-full px-3 py-2"
        style={{
          background: "linear-gradient(145deg, #eef0f4, #ffffff)",
          boxShadow: "inset 4px 4px 8px rgba(209,217,230,0.9), inset -4px -4px 8px rgba(255,255,255,0.95)",
          scrollbarWidth: "none",
        }}
      >
        <div className="flex shrink-0 items-center gap-1.5 pr-2" aria-label="Brush size">
          {BRUSH_SIZES.map((b) => {
            const active = brush === b
            return (
              <button
                key={b}
                type="button"
                onClick={() => onBrushChange(b)}
                aria-label={`Brush size ${b}`}
                aria-pressed={active}
                className="flex h-6 w-6 items-center justify-center rounded-full transition-colors"
                style={{
                  border: active ? "0.75px solid rgba(26,26,31,0.55)" : "0.5px solid rgba(26,26,31,0.12)",
                  backgroundColor: active ? "rgba(26,26,31,0.04)" : "transparent",
                }}
              >
                <span
                  className="block rounded-full bg-foreground"
                  style={{ width: Math.max(2, b), height: Math.max(2, b) }}
                />
              </button>
            )
          })}
        </div>

        <span className="h-5 w-px shrink-0 bg-foreground/10" aria-hidden="true" />

        <div className="flex shrink-0 items-center gap-1.5" aria-label="Color">
          {COLORS.map((c) => {
            const active = color === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => onColorChange(c)}
                aria-label={`Color ${c}`}
                aria-pressed={active}
                className="h-6 w-6 rounded-full transition-transform"
                style={{
                  backgroundColor: c,
                  border: active ? "1.5px solid rgba(26,26,31,0.7)" : "0.5px solid rgba(26,26,31,0.18)",
                  transform: active ? "scale(1.08)" : "scale(1)",
                  boxShadow: active ? "0 2px 6px -2px rgba(0,0,0,0.25)" : undefined,
                }}
              />
            )
          })}
        </div>
      </div>

      {hasInk ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear canvas"
          className="flex h-11 shrink-0 items-center justify-center rounded-full px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/65"
          style={{
            background: "linear-gradient(145deg, #ffffff, #eef0f4)",
            boxShadow: "4px 4px 10px rgba(209,217,230,0.9), -4px -4px 10px rgba(255,255,255,0.95)",
          }}
        >
          clear
        </button>
      ) : (
        <div
          aria-label={`Active color ${color}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(145deg, #ffffff, #eef0f4)",
            boxShadow: "4px 4px 10px rgba(209,217,230,0.9), -4px -4px 10px rgba(255,255,255,0.95)",
          }}
        >
          <span
            className="block h-6 w-6 rounded-full"
            style={{ backgroundColor: color, border: "0.5px solid rgba(26,26,31,0.18)" }}
          />
        </div>
      )}
    </div>
  )
}

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
