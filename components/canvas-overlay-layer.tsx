"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Trash2 } from "lucide-react"
import {
  type CanvasOverlay,
  type StickerOverlay,
  type TextOverlay,
  fontFamilyFor,
} from "@/lib/canvas-overlays"

/* -------------------------------------------------------------------------- */
/* StickerSvg — inline SVG mirrors of the canvas sticker shapes                */
/* -------------------------------------------------------------------------- */

function StickerSvg({
  kind,
  color,
  size,
}: {
  kind: StickerOverlay["sticker"]
  color: string
  size: number
}) {
  // Each shape is drawn into a 100x100 viewBox so size scales cleanly.
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 100 100",
    fill: color,
    style: { display: "block" } as React.CSSProperties,
  }
  switch (kind) {
    case "star":
      // 5-point star, points at top.
      return (
        <svg {...common} aria-hidden="true">
          <polygon points="50,5 61,38 96,38 67,58 78,92 50,72 22,92 33,58 4,38 39,38" />
        </svg>
      )
    case "heart":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M50 90 C 18 65 4 48 4 30 C 4 14 16 6 30 6 C 40 6 47 12 50 22 C 53 12 60 6 70 6 C 84 6 96 14 96 30 C 96 48 82 65 50 90 Z" />
        </svg>
      )
    case "speech-bubble":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M14 10 H86 C92 10 96 14 96 20 V60 C96 66 92 70 86 70 H42 L26 92 L32 70 H14 C8 70 4 66 4 60 V20 C4 14 8 10 14 10 Z" />
        </svg>
      )
    case "ufo":
      return (
        <svg {...common} aria-hidden="true">
          <ellipse cx="50" cy="58" rx="42" ry="10" />
          <ellipse cx="50" cy="42" rx="22" ry="14" opacity="0.85" />
          <circle cx="32" cy="72" r="3" />
          <circle cx="50" cy="74" r="3" />
          <circle cx="68" cy="72" r="3" />
        </svg>
      )
    case "sparkle":
      return (
        <svg {...common} aria-hidden="true">
          <polygon points="50,2 56,46 98,50 56,54 50,98 44,54 2,50 44,46" />
        </svg>
      )
    case "question":
      return (
        <svg {...common} aria-hidden="true">
          <text
            x="50"
            y="76"
            textAnchor="middle"
            fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
            fontWeight="900"
            fontSize="92"
            fill={color}
          >
            ?
          </text>
        </svg>
      )
  }
}

/* -------------------------------------------------------------------------- */
/* CanvasOverlayLayer                                                          */
/* -------------------------------------------------------------------------- */

interface CanvasOverlayLayerProps {
  overlays: CanvasOverlay[]
  selectedId: string | null
  /** id of overlay currently being edited (text mode); null otherwise. */
  editingTextId: string | null
  /** Click on empty area inside the overlay container — clears selection. */
  onClearSelection: () => void
  onSelect: (id: string) => void
  onUpdate: (id: string, patch: Partial<CanvasOverlay>) => void
  onDelete: (id: string) => void
  /** Called when a drag begins, lets parent take a pre-drag undo snapshot. */
  onDragStart?: (id: string) => void
  /** Called when a drag ends, lets parent take an after-drag snapshot. */
  onDragEnd?: (id: string) => void
  /** Toggle a text overlay into / out of edit mode. */
  onSetEditingText: (id: string | null) => void
}

export function CanvasOverlayLayer({
  overlays,
  selectedId,
  editingTextId,
  onClearSelection,
  onSelect,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  onSetEditingText,
}: CanvasOverlayLayerProps) {
  // Drag state lives in refs to avoid re-renders mid-drag.
  const dragRef = useRef<{
    id: string
    startPointer: { x: number; y: number }
    startOverlay: { x: number; y: number }
    moved: boolean
  } | null>(null)
  const layerRef = useRef<HTMLDivElement | null>(null)

  // Track whether a drag actually moved the overlay (vs. a tap).
  const handlePointerDown = (e: React.PointerEvent, overlay: CanvasOverlay) => {
    // Don't start a drag while editing this very text overlay (let caret work).
    if (overlay.kind === "text" && editingTextId === overlay.id) return
    e.stopPropagation()
    e.preventDefault()
    onSelect(overlay.id)
    onDragStart?.(overlay.id)
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture?.(e.pointerId)
    dragRef.current = {
      id: overlay.id,
      startPointer: { x: e.clientX, y: e.clientY },
      startOverlay: { x: overlay.x, y: overlay.y },
      moved: false,
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    e.stopPropagation()
    const dx = e.clientX - drag.startPointer.x
    const dy = e.clientY - drag.startPointer.y
    if (!drag.moved && Math.hypot(dx, dy) > 2) drag.moved = true
    onUpdate(drag.id, {
      x: drag.startOverlay.x + dx,
      y: drag.startOverlay.y + dy,
    })
  }

  const handlePointerUp = (e: React.PointerEvent, overlay: CanvasOverlay) => {
    const drag = dragRef.current
    if (!drag) return
    e.stopPropagation()
    const target = e.currentTarget as HTMLElement
    target.releasePointerCapture?.(e.pointerId)
    const wasTap = !drag.moved
    dragRef.current = null
    onDragEnd?.(overlay.id)
    // Tap on a text overlay enters edit mode.
    if (wasTap && overlay.kind === "text") {
      onSetEditingText(overlay.id)
    }
  }

  // Click on the empty overlay layer clears selection (and exits text edit).
  const handleLayerPointerDown = (e: React.PointerEvent) => {
    if (e.target === layerRef.current) {
      onClearSelection()
    }
  }

  return (
    <div
      ref={layerRef}
      onPointerDown={handleLayerPointerDown}
      className="absolute inset-0"
      // The layer itself doesn't capture pointer events; only its overlay
      // children do. This keeps the underlying drawing canvas paintable.
      style={{ pointerEvents: "none" }}
    >
      {overlays.map((overlay) => {
        const isSelected = selectedId === overlay.id
        if (overlay.kind === "text") {
          return (
            <TextOverlayItem
              key={overlay.id}
              overlay={overlay}
              isSelected={isSelected}
              isEditing={editingTextId === overlay.id}
              onPointerDown={(e) => handlePointerDown(e, overlay)}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => handlePointerUp(e, overlay)}
              onCommitText={(text) => onUpdate(overlay.id, { text } as Partial<CanvasOverlay>)}
              onFinishEdit={() => onSetEditingText(null)}
              onDelete={() => onDelete(overlay.id)}
            />
          )
        }
        return (
          <StickerOverlayItem
            key={overlay.id}
            overlay={overlay}
            isSelected={isSelected}
            onPointerDown={(e) => handlePointerDown(e, overlay)}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => handlePointerUp(e, overlay)}
            onDelete={() => onDelete(overlay.id)}
          />
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* TextOverlayItem                                                             */
/* -------------------------------------------------------------------------- */

function TextOverlayItem({
  overlay,
  isSelected,
  isEditing,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onCommitText,
  onFinishEdit,
  onDelete,
}: {
  overlay: TextOverlay
  isSelected: boolean
  isEditing: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onCommitText: (text: string) => void
  onFinishEdit: () => void
  onDelete: () => void
}) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [draftText, setDraftText] = useState(overlay.text)

  // Keep draft in sync if the parent updates it (e.g. via remix preset).
  useEffect(() => {
    if (!isEditing) setDraftText(overlay.text)
  }, [overlay.text, isEditing])

  // Focus the textarea when entering edit mode.
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const commit = () => {
    const trimmed = draftText.trim()
    onCommitText(trimmed.length > 0 ? draftText : overlay.text)
    onFinishEdit()
  }

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: overlay.x,
    top: overlay.y,
    transform: `translate(-50%, -50%) rotate(${overlay.rotation ?? 0}deg)`,
    pointerEvents: "auto",
    cursor: isEditing ? "text" : "move",
    fontFamily: fontFamilyFor(overlay.family),
    fontWeight: overlay.weight === "bold" ? 700 : 400,
    fontSize: overlay.fontSize,
    color: overlay.color,
    lineHeight: 1.15,
    textAlign: "center",
    textShadow: "0 1px 4px rgba(0,0,0,0.18)",
    padding: "4px 8px",
    borderRadius: "8px",
    outline: isSelected || isEditing ? "1.5px dashed rgba(26,26,31,0.55)" : "none",
    outlineOffset: "2px",
    userSelect: isEditing ? "text" : "none",
    whiteSpace: "pre",
    minWidth: "32px",
    maxWidth: "85%",
  }

  return (
    <div
      style={containerStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={(e) => {
        e.stopPropagation()
        // Already handled by tap, but doubleClick keeps the affordance discoverable.
      }}
    >
      {isEditing ? (
        <textarea
          ref={inputRef}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault()
              setDraftText(overlay.text)
              onFinishEdit()
            }
            // Enter inserts newline, Shift+Enter still works. Ctrl/Meta+Enter commits.
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault()
              commit()
            }
            e.stopPropagation()
          }}
          rows={Math.max(1, draftText.split("\n").length)}
          style={{
            background: "transparent",
            color: "inherit",
            font: "inherit",
            border: "none",
            outline: "none",
            resize: "none",
            padding: 0,
            textAlign: "center",
            width: "auto",
            minWidth: "120px",
          }}
          aria-label="Edit text overlay"
        />
      ) : (
        <span>{overlay.text}</span>
      )}

      {isSelected && !isEditing && (
        <DeleteHandle onDelete={onDelete} />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* StickerOverlayItem                                                          */
/* -------------------------------------------------------------------------- */

function StickerOverlayItem({
  overlay,
  isSelected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDelete,
}: {
  overlay: StickerOverlay
  isSelected: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onDelete: () => void
}) {
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: overlay.x,
    top: overlay.y,
    width: overlay.size,
    height: overlay.size,
    transform: `translate(-50%, -50%) rotate(${overlay.rotation ?? 0}deg)`,
    pointerEvents: "auto",
    cursor: "move",
    borderRadius: "10px",
    outline: isSelected ? "1.5px dashed rgba(26,26,31,0.55)" : "none",
    outlineOffset: "4px",
    touchAction: "none",
    userSelect: "none",
  }

  return (
    <div
      style={containerStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="img"
      aria-label={`${overlay.sticker} sticker`}
    >
      <StickerSvg kind={overlay.sticker} color={overlay.color} size={overlay.size} />
      {isSelected && <DeleteHandle onDelete={onDelete} />}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* DeleteHandle — small floating "X" rendered at the top-right of the overlay  */
/* -------------------------------------------------------------------------- */

function DeleteHandle({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        // Stop the parent's drag handler from claiming the pointer.
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.stopPropagation()
        onDelete()
      }}
      aria-label="Delete element"
      style={{
        position: "absolute",
        top: -10,
        right: -10,
        width: 22,
        height: 22,
        borderRadius: 9999,
        background: "#1a1a1f",
        color: "#f5f5f4",
        border: "1px solid #f5f5f4",
        boxShadow: "0 4px 10px -4px rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        pointerEvents: "auto",
      }}
    >
      <Trash2 className="h-3 w-3" strokeWidth={1.8} />
    </button>
  )
}

export { StickerSvg }
