/**
 * Remix preset definitions — produce visible canvas changes by injecting
 * pre-arranged text + sticker overlays.
 *
 * The canvas-view applies these via `applyRemixPreset(...)`, which clears any
 * remix-tagged overlays from the previous preset and adds the new ones.
 */

import type {
  CanvasOverlay,
  RemixMode,
  StickerOverlay,
  TextOverlay,
} from "@/lib/canvas-overlays"
import { newOverlayId } from "@/lib/canvas-overlays"

export interface RemixPresetInfo {
  id: NonNullable<RemixMode>
  label: string
  description: string
  /** Optional CSS frame applied to the canvas container while this remix is active. */
  frameStyle?: React.CSSProperties
}

export const REMIX_PRESETS: RemixPresetInfo[] = [
  {
    id: "movie-poster",
    label: "Movie Poster",
    description: "Title + dramatic frame.",
    frameStyle: {
      // Inset thick black border, subtle vignette via inner shadow.
      boxShadow:
        "inset 0 0 0 14px #1a1a1f, inset 0 0 90px rgba(0,0,0,0.45), 0 24px 48px -28px rgba(60,70,90,0.22)",
    },
  },
  {
    id: "meme",
    label: "Meme",
    description: "Top + bottom impact text.",
  },
  {
    id: "futuristic",
    label: "Futuristic City",
    description: "UFO, neon shapes, future vibe.",
    frameStyle: {
      boxShadow:
        "inset 0 0 0 2px rgba(94,189,255,0.55), inset 0 0 60px rgba(94,189,255,0.18), 0 24px 48px -28px rgba(60,70,90,0.22)",
    },
  },
  {
    id: "dreamy",
    label: "Dreamy",
    description: "Sparkles + soft haze.",
    frameStyle: {
      boxShadow:
        "inset 0 0 80px rgba(212,165,165,0.5), inset 0 0 0 2px rgba(255,255,255,0.6), 0 24px 48px -28px rgba(60,70,90,0.22)",
    },
  },
]

/** Build the overlay set for a given preset, sized to the supplied canvas. */
export function buildRemixOverlays(
  mode: NonNullable<RemixMode>,
  width: number,
  height: number,
): CanvasOverlay[] {
  switch (mode) {
    case "movie-poster": {
      const title: TextOverlay = {
        id: newOverlayId(),
        kind: "text",
        x: width / 2,
        y: height - 80,
        text: "AN ORIGINAL VISION",
        color: "#f5f5f4",
        fontSize: Math.min(38, width / 14),
        weight: "bold",
        family: "serif",
      }
      const subtitle: TextOverlay = {
        id: newOverlayId(),
        kind: "text",
        x: width / 2,
        y: height - 40,
        text: "Coming this season",
        color: "#e9c46a",
        fontSize: Math.min(14, width / 30),
        weight: "normal",
        family: "serif",
      }
      return [title, subtitle]
    }

    case "meme": {
      const top: TextOverlay = {
        id: newOverlayId(),
        kind: "text",
        x: width / 2,
        y: 50,
        text: "WHEN YOU SEE THE ART",
        color: "#ffffff",
        fontSize: Math.min(32, width / 16),
        weight: "bold",
        family: "impact",
      }
      const bottom: TextOverlay = {
        id: newOverlayId(),
        kind: "text",
        x: width / 2,
        y: height - 50,
        text: "AND IT SEES YOU BACK",
        color: "#ffffff",
        fontSize: Math.min(32, width / 16),
        weight: "bold",
        family: "impact",
      }
      return [top, bottom]
    }

    case "futuristic": {
      const ufo: StickerOverlay = {
        id: newOverlayId(),
        kind: "sticker",
        sticker: "ufo",
        x: width * 0.7,
        y: height * 0.18,
        size: Math.min(110, width * 0.18),
        color: "#5ebdff",
      }
      const sparkleA: StickerOverlay = {
        id: newOverlayId(),
        kind: "sticker",
        sticker: "sparkle",
        x: width * 0.18,
        y: height * 0.28,
        size: 42,
        color: "#5ebdff",
      }
      const sparkleB: StickerOverlay = {
        id: newOverlayId(),
        kind: "sticker",
        sticker: "sparkle",
        x: width * 0.85,
        y: height * 0.55,
        size: 28,
        color: "#5ebdff",
      }
      const caption: TextOverlay = {
        id: newOverlayId(),
        kind: "text",
        x: width / 2,
        y: height - 36,
        text: "// 2099 — beyond the gallery",
        color: "#5ebdff",
        fontSize: Math.min(16, width / 28),
        weight: "bold",
        family: "sans",
      }
      return [ufo, sparkleA, sparkleB, caption]
    }

    case "dreamy": {
      const sparkleCount = 5
      const sparkles: StickerOverlay[] = Array.from({ length: sparkleCount }, (_, i) => {
        const angle = (i / sparkleCount) * Math.PI * 2 + 0.3
        const radius = Math.min(width, height) * 0.32
        return {
          id: newOverlayId(),
          kind: "sticker" as const,
          sticker: "sparkle" as const,
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius * 0.8,
          size: 18 + (i % 3) * 14,
          color: i % 2 === 0 ? "#f5e6d3" : "#d4a5a5",
        }
      })
      const caption: TextOverlay = {
        id: newOverlayId(),
        kind: "text",
        x: width / 2,
        y: height - 40,
        text: "soft, slow, & half-remembered",
        color: "#5a4a52",
        fontSize: Math.min(18, width / 26),
        weight: "normal",
        family: "serif",
      }
      return [...sparkles, caption]
    }
  }
}
