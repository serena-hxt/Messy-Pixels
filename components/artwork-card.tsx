"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import type { Artwork } from "@/lib/ham-api"

/* -------------------------------------------------------------------------- */
/* In-memory dedupe cache                                                     */
/* -------------------------------------------------------------------------- */

// Multiple cards in a long conversation may reference the same work — keep a
// session-level cache so we only resolve each `title|artist` against HAM once.
const artworkCache = new Map<string, Promise<Artwork | null>>()

function cacheKey(title: string, artist?: string) {
  return `${title.trim().toLowerCase()}|${(artist ?? "").trim().toLowerCase()}`
}

async function fetchArtworkByTitle(title: string, artist?: string): Promise<Artwork | null> {
  const key = cacheKey(title, artist)
  const existing = artworkCache.get(key)
  if (existing) return existing

  const promise = (async () => {
    try {
      const params = new URLSearchParams({ title })
      if (artist) params.set("artist", artist)
      const res = await fetch(`/api/artwork?${params.toString()}`)
      if (!res.ok) return null
      const data = (await res.json()) as { artwork?: Artwork }
      return data.artwork ?? null
    } catch {
      return null
    }
  })()

  artworkCache.set(key, promise)
  return promise
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

interface ArtworkCardProps {
  title: string
  artist?: string
  /** Called with the resolved Artwork when the card body is tapped (opens detail modal). */
  onSelect: (artwork: Artwork) => void
  /** Called when the "edit on artwork" button is tapped — jumps to the canvas with this work as a reference layer. */
  onEditOnArtwork?: (artwork: Artwork) => void
}

/** Compact card that resolves a HAM artwork by title and lets the user expand it. */
export function ArtworkCard({ title, artist, onSelect, onEditOnArtwork }: ArtworkCardProps) {
  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading")

  useEffect(() => {
    let cancelled = false
    setStatus("loading")
    fetchArtworkByTitle(title, artist).then((found) => {
      if (cancelled) return
      if (found) {
        setArtwork(found)
        setStatus("ready")
      } else {
        setStatus("missing")
      }
    })
    return () => {
      cancelled = true
    }
  }, [title, artist])

  // If HAM has no record, render nothing — Bitsy's prose already mentions
  // the work, so a broken card would be noise rather than helpful.
  if (status === "missing") return null

  if (status === "loading" || !artwork) {
    return (
      <div
        className="flex max-w-[88%] items-center gap-3 rounded-[20px] rounded-bl-[6px] bg-background/65 p-2.5 backdrop-blur-xl"
        style={{
          border: "0.75px solid rgba(26,26,31,0.14)",
          boxShadow: "0 8px 20px -14px rgba(60, 70, 90, 0.18)",
        }}
        aria-busy="true"
        aria-label={`Loading ${title}`}
      >
        <div className="h-[68px] w-[68px] shrink-0 animate-pulse rounded-[12px] bg-foreground/8" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1">
          <div className="h-3 w-3/5 animate-pulse rounded-full bg-foreground/10" />
          <div className="h-2.5 w-2/5 animate-pulse rounded-full bg-foreground/8" />
          <div className="mt-1 h-2 w-11/12 animate-pulse rounded-full bg-foreground/8" />
        </div>
      </div>
    )
  }

  // Snippet from full commentary — keep it short so the card stays compact.
  const snippet = makeSnippet(artwork.commentary, 110)

  return (
    <div
      className="flex max-w-[88%] flex-col gap-1.5 self-start"
      style={{
        opacity: 0,
        transform: "translateY(8px)",
        animation: "meta-rise 480ms ease-out 80ms both",
      }}
    >
      {/* Card body — clicking opens the detail modal. */}
      <button
        type="button"
        onClick={() => onSelect(artwork)}
        className="group flex items-stretch gap-3 rounded-[20px] rounded-bl-[6px] bg-background/75 p-2.5 text-left backdrop-blur-xl transition-colors hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{
          border: "0.75px solid rgba(26,26,31,0.16)",
          boxShadow: "0 10px 24px -16px rgba(60, 70, 90, 0.22)",
        }}
        aria-label={`Open details for ${artwork.title} by ${artwork.artist}`}
      >
        {/* Thumbnail */}
        <div
          className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-[12px] bg-foreground/5"
          style={{ border: "0.5px solid rgba(26,26,31,0.1)" }}
        >
          {artwork.primaryimageurl ? (
            <Image
              src={artwork.primaryimageurl || "/placeholder.svg"}
              alt=""
              fill
              sizes="68px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              unoptimized
            />
          ) : null}
        </div>

        {/* Body */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-0.5 pr-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">
            harvard art museums
          </p>
          <p className="truncate font-mono text-[13.5px] font-normal leading-snug text-foreground">
            {artwork.title}
          </p>
          <p className="truncate font-mono text-[11px] font-light text-foreground/60">
            {artwork.artist}
          </p>
          {snippet ? (
            <p className="mt-1 line-clamp-2 font-mono text-[11.5px] font-light leading-relaxed text-foreground/70">
              {snippet}
            </p>
          ) : null}
        </div>
      </button>

      {/* "Edit on artwork" affordance — opens the canvas with this piece as a reference layer. */}
      {onEditOnArtwork && (
        <button
          type="button"
          onClick={() => onEditOnArtwork(artwork)}
          className="group ml-1 inline-flex items-center gap-2 self-start rounded-full bg-background/70 px-3.5 py-1.5 backdrop-blur-md transition-colors hover:bg-background/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{
            border: "0.75px solid rgba(26,26,31,0.18)",
            boxShadow: "0 6px 16px -12px rgba(60, 70, 90, 0.22)",
          }}
          aria-label={`Edit on ${artwork.title}`}
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/70 group-hover:text-foreground">
            edit on artwork
          </span>
          <span
            aria-hidden="true"
            className="font-mono text-[12px] text-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/70"
          >
            →
          </span>
        </button>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Trim long commentary to a clean sentence or word boundary near `max` chars. */
function makeSnippet(text: string, max: number): string {
  if (!text) return ""
  const collapsed = text.replace(/\s+/g, " ").trim()
  if (collapsed.length <= max) return collapsed
  // Prefer cutting at the next sentence end before max
  const sliceEnd = collapsed.slice(0, max + 30)
  const sentence = sliceEnd.search(/[.!?]\s/)
  if (sentence > 40 && sentence <= max) {
    return collapsed.slice(0, sentence + 1)
  }
  // Otherwise cut at the last space before max and add an ellipsis
  const cut = collapsed.lastIndexOf(" ", max)
  return `${collapsed.slice(0, cut > 0 ? cut : max)}…`
}
