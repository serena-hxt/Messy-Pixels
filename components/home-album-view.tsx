"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { CURATED_ARTWORKS, type CuratedArtwork } from "@/lib/curated-artworks"
import type { Artwork } from "@/lib/ham-api"

/**
 * Shape returned by `GET /api/artwork/popular`.
 */
interface PopularEntry {
  title: string
  artist: string
  year: string
  bitsyPrompt: string
  artwork: Artwork | null
}

interface HomeAlbumViewProps {
  open: boolean
  onClose: () => void
  /**
   * Called when the user picks an artwork. Receives both the curated
   * registry entry (for objectid + bitsyPrompt) and the resolved Artwork
   * (for the image URL + commentary, which feed the chat thread's
   * ArtworkCard rendering). The Artwork is null when the HAM API was
   * unreachable AND no fallbackImageUrl was registered.
   */
  onSelect: (curated: CuratedArtwork, artwork: Artwork | null) => void
}

/**
 * The Home Album — a full-frame overlay listing the 10 curated "Popular Works".
 * Tapping a work hands the resolved Artwork back up to the home page so it
 * can set the SelectedArtworkContext and seed a Bitsy conversation about
 * that piece.
 *
 * Visual language matches the rest of the app:
 *   - backdrop-filter: blur(25px) on the panel surface
 *   - 0.5px linework on borders & icon strokes
 *   - architectural minimalist typography (font-mono labels)
 */
export function HomeAlbumView({ open, onClose, onSelect }: HomeAlbumViewProps) {
  const [entries, setEntries] = useState<PopularEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch when first opened. The popular route resolves images via HAM, so
  // we want the resolved Artwork — not just the registry stub — before the
  // user can tap.
  useEffect(() => {
    if (!open || entries) return
    let cancelled = false
    setError(null)
    fetch("/api/artwork/popular", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (cancelled) return
        const list: PopularEntry[] = data.entries ?? []
        setEntries(list)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : "Could not load album")
      })
    return () => {
      cancelled = true
    }
  }, [open, entries])

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        key="home-album"
        className="absolute inset-0 z-30 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        role="dialog"
        aria-label="Popular works album"
      >
        {/* Glass panel — fills the phone frame, backdrop-blur(25px) */}
        <div
          className="flex h-full w-full flex-col"
          style={{
            backgroundColor: "rgba(245, 246, 248, 0.78)",
            backdropFilter: "blur(25px) saturate(140%)",
            WebkitBackdropFilter: "blur(25px) saturate(140%)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 pt-6 pb-4"
            style={{ borderBottom: "0.5px solid rgba(26,26,31,0.10)" }}
          >
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-foreground/55">
                album
              </p>
              <h2 className="mt-1 font-mono text-[18px] font-light tracking-tight text-foreground">
                Popular Works
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close album"
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/65 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
              style={{ border: "0.5px solid rgba(26,26,31,0.18)" }}
            >
              <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {error ? (
              <p className="px-2 py-12 text-center font-mono text-[12px] text-foreground/55">
                {error}
              </p>
            ) : !entries ? (
              <SkeletonGrid />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {entries.map((entry) => {
                  // Find the matching curated entry for objectid + bitsyPrompt.
                  const curated = CURATED_ARTWORKS.find(
                    (c) =>
                      c.title === entry.title &&
                      c.artist === entry.artist,
                  )
                  if (!curated) return null
                  return (
                    <AlbumCard
                      key={curated.objectid}
                      title={entry.title}
                      artist={entry.artist}
                      year={entry.year}
                      imageUrl={
                        entry.artwork?.primaryimageurl ??
                        curated.fallbackImageUrl ??
                        null
                      }
                      onClick={() => onSelect(curated, entry.artwork)}
                    />
                  )
                })}
              </div>
            )}

            <p className="mt-5 px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">
              tap a work to ask Bitsy about it
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/* -------------------------------------------------------------------------- */
/* AlbumCard                                                                   */
/* -------------------------------------------------------------------------- */

function AlbumCard({
  title,
  artist,
  year,
  imageUrl,
  onClick,
}: {
  title: string
  artist: string
  year: string
  imageUrl: string | null
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-stretch gap-2 rounded-2xl p-2 text-left transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
      style={{
        backgroundColor: "rgba(255,255,255,0.55)",
        border: "0.5px solid rgba(26,26,31,0.10)",
        boxShadow: "0 8px 22px -16px rgba(60,70,90,0.22)",
      }}
      aria-label={`Ask Bitsy about ${title} by ${artist}`}
    >
      <div
        className="relative aspect-[4/5] w-full overflow-hidden rounded-xl"
        style={{
          backgroundColor: "rgba(26,26,31,0.05)",
          border: "0.5px solid rgba(26,26,31,0.08)",
        }}
      >
        {imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/35">
              no image
            </span>
          </div>
        )}
      </div>
      <div className="px-1 pb-1">
        <p className="line-clamp-2 font-mono text-[11px] leading-tight text-foreground/85">
          {title}
        </p>
        <p className="mt-1 font-mono text-[10px] text-foreground/55">
          {artist}
          {year ? ` · ${year}` : ""}
        </p>
      </div>
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/* Skeleton                                                                    */
/* -------------------------------------------------------------------------- */

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-2xl p-2"
          style={{
            backgroundColor: "rgba(255,255,255,0.55)",
            border: "0.5px solid rgba(26,26,31,0.10)",
          }}
        >
          <div
            className="aspect-[4/5] w-full animate-pulse rounded-xl"
            style={{ backgroundColor: "rgba(26,26,31,0.06)" }}
          />
          <div className="px-1 pb-1">
            <div
              className="h-3 w-3/4 animate-pulse rounded"
              style={{ backgroundColor: "rgba(26,26,31,0.08)" }}
            />
            <div
              className="mt-1.5 h-2.5 w-1/2 animate-pulse rounded"
              style={{ backgroundColor: "rgba(26,26,31,0.06)" }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
