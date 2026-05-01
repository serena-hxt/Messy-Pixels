"use client"

import { useRef, useState } from "react"
import { Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type Recognition = {
  recognized: boolean
  title: string | null
  artist: string | null
  year: string | null
  confidence: number
}

export type RecognizedHistoryItem = Recognition & { id: string; capturedAt: number }

const POPULAR_WORKS: Array<{
  title: string
  artist: string
  year: string
  palette: string[]
}> = [
  { title: "Mona Lisa", artist: "Leonardo da Vinci", year: "1503", palette: ["#5a4a32", "#8b6f47", "#c9a66b"] },
  { title: "Starry Night", artist: "Vincent van Gogh", year: "1889", palette: ["#1a3a5e", "#4a6fa5", "#ffd966"] },
  { title: "The Scream", artist: "Edvard Munch", year: "1893", palette: ["#d65a3a", "#f5b94a", "#3a4d6a"] },
  {
    title: "Girl with a Pearl Earring",
    artist: "Johannes Vermeer",
    year: "1665",
    palette: ["#1a1a2a", "#c9b072", "#5a7088"],
  },
  {
    title: "The Persistence of Memory",
    artist: "Salvador Dalí",
    year: "1931",
    palette: ["#c9a87a", "#3a4a3a", "#5a3a2a"],
  },
  {
    title: "Les Demoiselles d'Avignon",
    artist: "Pablo Picasso",
    year: "1907",
    palette: ["#d4b09a", "#5a4a52", "#3a2a32"],
  },
  {
    title: "The Birth of Venus",
    artist: "Sandro Botticelli",
    year: "1486",
    palette: ["#a0b89a", "#d4c8a8", "#7a5a4a"],
  },
  { title: "Geraniums", artist: "Henri Matisse", year: "1910", palette: ["#d65a3a", "#3a8a4a", "#e8a072"] },
]

interface AlbumSheetProps {
  open: boolean
  onClose: () => void
  recognizedHistory: RecognizedHistoryItem[]
  onSelectArtwork: (rec: Recognition) => void
  onPickLocalImage: (dataUrl: string) => void
}

type Tab = "recognized" | "popular" | "local"

export function AlbumSheet({
  open,
  onClose,
  recognizedHistory,
  onSelectArtwork,
  onPickLocalImage,
}: AlbumSheetProps) {
  const [tab, setTab] = useState<Tab>("recognized")
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
            {(["recognized", "popular", "local"] as Tab[]).map((t) => (
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

function PopularGrid({ onPick }: { onPick: (rec: Recognition) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {POPULAR_WORKS.map((w) => (
        <button
          key={w.title}
          type="button"
          onClick={() =>
            onPick({
              recognized: true,
              title: w.title,
              artist: w.artist,
              year: w.year,
              confidence: 1,
            })
          }
          className="group flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/5 p-3 text-left transition-colors hover:border-white/20 hover:bg-white/10"
        >
          <div
            className="aspect-[3/4] w-full rounded-xl"
            style={{ background: `linear-gradient(135deg, ${w.palette.join(", ")})` }}
            aria-hidden="true"
          />
          <div>
            <p className="font-mono text-[12px] leading-tight text-white">{w.title}</p>
            <p className="mt-0.5 font-mono text-[10px] text-white/55">
              {w.artist}, {w.year}
            </p>
          </div>
        </button>
      ))}
    </div>
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
