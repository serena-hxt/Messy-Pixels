"use client"

import { useEffect, useRef, useState } from "react"
import { Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Artwork } from "@/lib/ham-api"

export type Recognition = {
  recognized: boolean
  title: string | null
  artist: string | null
  year: string | null
  confidence: number
}

export type RecognizedHistoryItem = Recognition & { id: string; capturedAt: number }

interface AlbumSheetProps {
  open: boolean
  onClose: () => void
  recognizedHistory: RecognizedHistoryItem[]
  onSelectArtwork: (rec: Recognition) => void
  onPickLocalImage: (dataUrl: string) => void
}

type Tab = "recognized" | "popular" | "local"

/**
 * Shape returned by `GET /api/artwork/popular`. Each entry preserves the
 * curated title/artist/year we want to label, plus the resolved HAM record
 * (or null if no match was found, in which case we fall back to a gradient
 * tile so the layout never breaks).
 */
interface PopularEntry {
  title: string
  artist: string
  year: string
  artwork: Artwork | null
}

const POPULAR_CACHE_KEY = "bitsy_popular_v2"

export function AlbumSheet({
  open,
  onClose,
  recognizedHistory,
  onSelectArtwork,
  onPickLocalImage,
}: AlbumSheetProps) {
  const [tab, setTab] = useState<Tab>("popular")
  const [localImages, setLocalImages] = useState<string[]>([])
  const [animatingOut, setAnimatingOut] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const handleClose = () => {
    setAnimatingOut(true)
    window.setTimeout(() => {
      setAnimatingOut(false)
      onClose()
    }, 220)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result as string
      setLocalImages((prev) => [url, ...prev].slice(0, 12))
      onPickLocalImage(url)
    }
    reader.readAsDataURL(file)
    // Reset so picking the same file twice still fires onChange
    e.target.value = ""
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col" role="dialog" aria-label="Album">
      {/* Backdrop */}
      <button
        type="button"
        onClick={handleClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        aria-label="Close album"
      />

      {/* Sheet */}
      <div
        className={cn(
          "relative mt-auto h-[78%] rounded-t-[32px] border-t border-white/10 bg-foreground/95 backdrop-blur-2xl",
          animatingOut ? "animate-album-exit" : "animate-album-enter",
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3">
          <span className="h-1 w-10 rounded-full bg-white/25" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-3">
          <h2 className="font-mono text-[15px] tracking-tight text-white">Album</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close album"
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            {(["popular", "recognized", "local"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={cn(
                  "flex-1 rounded-full px-3 py-1.5 font-mono text-[11px] tracking-wider transition-colors",
                  tab === t ? "bg-white text-foreground" : "text-white/65 hover:text-white",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-148px)] overflow-y-auto px-6 pb-6 pt-5">
          {tab === "recognized" && (
            <RecognizedList
              items={recognizedHistory}
              onPick={(rec) => {
                onSelectArtwork(rec)
                handleClose()
              }}
            />
          )}
          {tab === "popular" && (
            <PopularGrid
              onPick={(rec) => {
                onSelectArtwork(rec)
                handleClose()
              }}
            />
          )}
          {tab === "local" && (
            <LocalAlbum
              images={localImages}
              onPickFromDevice={() => fileRef.current?.click()}
              onSelectImage={(url) => {
                onPickLocalImage(url)
                handleClose()
              }}
            />
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

function RecognizedList({
  items,
  onPick,
}: {
  items: RecognizedHistoryItem[]
  onPick: (rec: Recognition) => void
}) {
  if (items.length === 0) {
    return (
      <p className="mt-12 whitespace-pre-line text-center font-mono text-xs leading-relaxed text-white/45">
        {"No artworks recognized yet.\nPoint Bitsy at a painting to begin."}
      </p>
    )
  }
  return (
    <ul className="flex flex-col divide-y divide-white/5">
      {items.map((it) => (
        <li key={it.id}>
          <button
            type="button"
            onClick={() => onPick(it)}
            className="flex w-full items-center justify-between gap-3 py-3.5 text-left transition-colors hover:bg-white/5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[13px] text-white">{it.title}</p>
              <p className="truncate font-mono text-[11px] text-white/55">
                {it.artist}
                {it.year ? ` · ${it.year}` : ""}
              </p>
            </div>
            <span className="shrink-0 font-mono text-[10px] tracking-wider text-white/35">
              {new Date(it.capturedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/**
 * Curated popular works pulled live from the Harvard Art Museums API. The
 * server route resolves each title/artist pair and returns the high-resolution
 * `primaryimageurl`, which we render directly. Results are cached in
 * localStorage so the album opens instantly on repeat visits.
 */
function PopularGrid({ onPick }: { onPick: (rec: Recognition) => void }) {
  const [entries, setEntries] = useState<PopularEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Try cache first for an instant render
    try {
      const cached = localStorage.getItem(POPULAR_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as { entries: PopularEntry[]; ts: number }
        if (parsed.entries && Date.now() - parsed.ts < 24 * 60 * 60 * 1000) {
          setEntries(parsed.entries)
        }
      }
    } catch {
      /* ignore */
    }

    let cancelled = false
    fetch("/api/artwork/popular")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.statusText)))
      .then((data: { entries: PopularEntry[] }) => {
        if (cancelled) return
        setEntries(data.entries)
        try {
          localStorage.setItem(
            POPULAR_CACHE_KEY,
            JSON.stringify({ entries: data.entries, ts: Date.now() }),
          )
        } catch {
          /* ignore */
        }
      })
      .catch((e) => {
        if (cancelled) return
        setError(typeof e === "string" ? e : "Failed to load popular works")
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (error && !entries) {
    return (
      <p className="mt-12 text-center font-mono text-xs leading-relaxed text-white/45">{error}</p>
    )
  }

  if (!entries) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/5 p-3"
          >
            <div className="aspect-[3/4] w-full animate-pulse rounded-xl bg-white/10" />
            <div className="space-y-1.5">
              <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {entries.map((entry) => (
        <PopularTile key={`${entry.title}-${entry.artist}`} entry={entry} onPick={onPick} />
      ))}
    </div>
  )
}

function PopularTile({
  entry,
  onPick,
}: {
  entry: PopularEntry
  onPick: (rec: Recognition) => void
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const imageUrl = entry.artwork?.primaryimageurl

  return (
    <button
      type="button"
      onClick={() =>
        onPick({
          recognized: true,
          title: entry.title,
          artist: entry.artist,
          year: entry.year,
          confidence: 1,
        })
      }
      className="group flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/5 p-3 text-left transition-colors hover:border-white/20 hover:bg-white/10"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-foreground/40">
        {imageUrl && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`${entry.title} by ${entry.artist}`}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          // Fallback gradient — uses the artwork's HAM-extracted palette when
          // possible, otherwise a neutral wash. Keeps the grid tidy if a
          // particular work has no usable image.
          <div
            className="h-full w-full"
            style={{
              background:
                entry.artwork?.colors && entry.artwork.colors.length > 0
                  ? `linear-gradient(135deg, ${entry.artwork.colors.slice(0, 3).join(", ")})`
                  : "linear-gradient(135deg, #3a3a42, #1f1f25)",
            }}
            aria-hidden="true"
          />
        )}
      </div>
      <div>
        <p className="line-clamp-2 font-mono text-[12px] leading-tight text-white">
          {entry.title}
        </p>
        <p className="mt-0.5 line-clamp-1 font-mono text-[10px] text-white/55">
          {entry.artist}
          {entry.year ? `, ${entry.year}` : ""}
        </p>
      </div>
    </button>
  )
}

function LocalAlbum({
  images,
  onPickFromDevice,
  onSelectImage,
}: {
  images: string[]
  onPickFromDevice: () => void
  onSelectImage: (url: string) => void
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onPickFromDevice}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/25 bg-white/5 px-4 py-5 font-mono text-[12px] text-white/80 transition-colors hover:bg-white/10"
      >
        <Upload className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        choose photo from device
      </button>
      {images.length > 0 ? (
        <div className="mt-5 grid grid-cols-3 gap-2">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelectImage(src)}
              className="aspect-square overflow-hidden rounded-xl border border-white/8 transition-transform hover:scale-[1.02]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src || "/placeholder.svg"} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-center font-mono text-[11px] leading-relaxed text-white/40">
          Recently picked images appear here.
        </p>
      )}
    </div>
  )
}
