"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Heart, Plus, Share2, X } from "lucide-react"
import { AuraBackground } from "@/components/aura-background"
import {
  addToGallery,
  loadGallery,
  loadProfile,
  saveGallery,
  type GalleryItem,
} from "@/lib/storage"
import type { SavedDrawing } from "@/app/page"

interface GalleryViewProps {
  onClose: () => void
  drawings: SavedDrawing[]
}

type Tab = "mine" | "community"

/** Seed community works (gradient placeholders, lightweight). */
const COMMUNITY_SEED: Omit<GalleryItem, "id" | "createdAt" | "isMine">[] = [
  {
    dataUrl: gradientDataUrl(["#aac4b0", "#f8f9fa", "#d4a69c"]),
    title: "Quiet pond",
    caption: "An afternoon at Giverny.",
    author: "Maya",
    likes: 24,
  },
  {
    dataUrl: gradientDataUrl(["#d4a69c", "#f5e6d3", "#aac4b0"]),
    title: "Geranium study",
    caption: "After Matisse.",
    author: "Lin",
    likes: 41,
  },
  {
    dataUrl: gradientDataUrl(["#1a1a1f", "#5a4a52", "#d4a69c"]),
    title: "Late light",
    caption: "Sketched in the gallery.",
    author: "Theo",
    likes: 17,
  },
  {
    dataUrl: gradientDataUrl(["#aac4b0", "#5a8a6a", "#1a1a1f"]),
    title: "Leaves, twice",
    caption: "Two passes over the same leaf.",
    author: "Anya",
    likes: 12,
  },
  {
    dataUrl: gradientDataUrl(["#f5e6d3", "#d4a69c", "#5a4a52"]),
    title: "Studio dust",
    caption: "Light through the back window.",
    author: "Joon",
    likes: 33,
  },
  {
    dataUrl: gradientDataUrl(["#3a4d6a", "#aac4b0", "#f8f9fa"]),
    title: "Blue hour, room 3",
    caption: "The Vermeer corner.",
    author: "Ela",
    likes: 28,
  },
]

function gradientDataUrl(colors: string[]): string {
  // Encoded as a tiny SVG so we don't need external image hosting
  const stops = colors
    .map((c, i) => `<stop offset="${(i / (colors.length - 1)) * 100}%" stop-color="${c}"/>`)
    .join("")
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 500'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>${stops}</linearGradient></defs><rect width='400' height='500' fill='url(%23g)'/></svg>`
    .replace(/#/g, "%23")
    .replace(/"/g, "'")
  return `data:image/svg+xml;utf8,${svg}`
}

export function GalleryView({ onClose, drawings }: GalleryViewProps) {
  const [tab, setTab] = useState<Tab>("mine")
  const [items, setItems] = useState<GalleryItem[]>([])
  const [opened, setOpened] = useState<GalleryItem | null>(null)
  const [showShareSheet, setShowShareSheet] = useState<SavedDrawing | null>(null)

  // Load gallery + seed community on first mount
  useEffect(() => {
    let existing = loadGallery()
    const hasCommunity = existing.some((g) => !g.isMine)
    if (!hasCommunity) {
      const seeded: GalleryItem[] = COMMUNITY_SEED.map((s, i) => ({
        ...s,
        id: `seed_${i}`,
        createdAt: Date.now() - i * 86400000,
        isMine: false,
      }))
      existing = [...existing, ...seeded]
      saveGallery(existing)
    }
    setItems(existing)
  }, [])

  const myItems = useMemo(() => items.filter((g) => g.isMine), [items])
  const communityItems = useMemo(() => items.filter((g) => !g.isMine), [items])

  const handlePublish = (drawing: SavedDrawing, title: string) => {
    const author = loadProfile().displayName
    const item: GalleryItem = {
      id: `gal_${Date.now()}`,
      dataUrl: drawing.dataUrl,
      title: title.trim() || "Untitled",
      caption: drawing.note,
      author,
      likes: 0,
      createdAt: Date.now(),
      isMine: true,
    }
    setItems(addToGallery(item))
    setShowShareSheet(null)
    setTab("mine")
  }

  const handleLike = (id: string) => {
    const next = items.map((g) => {
      if (g.id !== id) return g
      const liked = !g.liked
      return { ...g, liked, likes: g.likes + (liked ? 1 : -1) }
    })
    setItems(next)
    saveGallery(next)
  }

  const handleRemove = (id: string) => {
    const next = items.filter((g) => g.id !== id)
    setItems(next)
    saveGallery(next)
    setOpened(null)
  }

  const visible = tab === "mine" ? myItems : communityItems
  const unpublishedDrawings = drawings.filter(
    (d) => !items.some((g) => g.isMine && g.dataUrl === d.dataUrl),
  )

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-background">
      <AuraBackground />

      <header className="relative flex items-center justify-between px-4 pt-6 sm:px-8 md:px-12">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.25} aria-hidden="true" />
        </button>
        <h1 className="font-mono text-[12px] uppercase tracking-[0.28em] text-foreground/55">Gallery</h1>
        <span className="h-10 w-10" aria-hidden="true" />
      </header>

      {/* Tabs */}
      <div className="relative px-4 pt-4 sm:px-8 md:px-12">
        <div
          className="mx-auto flex max-w-xs items-center gap-1 rounded-full p-1"
          style={{
            backgroundColor: "rgba(255,255,255,0.55)",
            backdropFilter: "blur(20px) saturate(140%)",
            WebkitBackdropFilter: "blur(20px) saturate(140%)",
            border: "0.5px solid rgba(26,26,31,0.1)",
          }}
        >
          <TabBtn active={tab === "mine"} onClick={() => setTab("mine")}>My works</TabBtn>
          <TabBtn active={tab === "community"} onClick={() => setTab("community")}>Community</TabBtn>
        </div>
      </div>

      {/* Grid */}
      <main className="relative flex-1 overflow-y-auto px-4 pb-12 pt-5 sm:px-8 md:px-12">
        <div className="mx-auto w-full max-w-md md:max-w-lg lg:max-w-2xl">
          {tab === "mine" && unpublishedDrawings.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">
                Sketches ready to share
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {unpublishedDrawings.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setShowShareSheet(d)}
                    className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-white text-left transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ border: "0.5px solid rgba(26,26,31,0.1)" }}
                  >
                    <Image
                      src={d.dataUrl || "/placeholder.svg"}
                      alt={`Sketch from ${new Date(d.createdAt).toLocaleDateString()}`}
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-contain p-2"
                      unoptimized
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-foreground/60 px-2 py-1.5 font-mono text-[10px] text-background backdrop-blur-md">
                      <span>publish</span>
                      <Share2 className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {visible.length === 0 ? (
            <EmptyGallery tab={tab} />
          ) : (
            <>
              {tab === "mine" && unpublishedDrawings.length > 0 && (
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">
                  Published
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {visible.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setOpened(g)}
                    className="group relative aspect-[3/4] overflow-hidden rounded-2xl text-left transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ border: "0.5px solid rgba(26,26,31,0.1)" }}
                  >
                    <Image
                      src={g.dataUrl || "/placeholder.svg"}
                      alt={`${g.title} by ${g.author}`}
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className={g.isMine ? "bg-white object-contain p-2" : "object-cover"}
                      unoptimized
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-foreground/70 to-transparent px-2.5 py-2 text-background">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[11px] font-normal">{g.title}</p>
                        <p className="truncate font-mono text-[9px] font-light opacity-75">{g.author}</p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] tabular-nums">
                        <Heart className={`h-3 w-3 ${g.liked ? "fill-current" : ""}`} strokeWidth={1.5} aria-hidden="true" />
                        {g.likes}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Detail sheet */}
      {opened && (
        <DetailOverlay
          item={opened}
          onClose={() => setOpened(null)}
          onLike={() => handleLike(opened.id)}
          onRemove={opened.isMine ? () => handleRemove(opened.id) : undefined}
        />
      )}

      {/* Share sheet */}
      {showShareSheet && (
        <ShareSheet
          drawing={showShareSheet}
          onClose={() => setShowShareSheet(null)}
          onPublish={(title) => handlePublish(showShareSheet, title)}
        />
      )}
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
        active ? "bg-foreground text-background" : "text-foreground/65 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}

function EmptyGallery({ tab }: { tab: Tab }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 pt-20 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full text-foreground/55"
        style={{ border: "0.75px solid rgba(26,26,31,0.14)" }}
        aria-hidden="true"
      >
        <Plus className="h-5 w-5" strokeWidth={1.25} />
      </span>
      <p className="font-mono text-[14px] font-normal text-foreground">
        {tab === "mine" ? "Nothing published yet" : "No community works yet"}
      </p>
      <p className="font-mono text-[11px] font-light leading-relaxed text-foreground/55">
        {tab === "mine"
          ? "Sketch on the canvas, then publish it here for others to see."
          : "Check back soon — new pieces from visitors arrive every day."}
      </p>
    </div>
  )
}

function DetailOverlay({
  item,
  onClose,
  onLike,
  onRemove,
}: {
  item: GalleryItem
  onClose: () => void
  onLike: () => void
  onRemove?: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/85 backdrop-blur-md">
      <header className="flex items-center justify-between px-4 pt-6 sm:px-8 md:px-12">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground/55 transition-colors hover:text-foreground"
          >
            remove
          </button>
        )}
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto px-4 py-6 sm:px-8 md:px-12">
        <div
          className="relative aspect-[3/4] w-full max-w-md overflow-hidden rounded-3xl"
          style={{ border: "0.5px solid rgba(26,26,31,0.1)", boxShadow: "0 20px 40px -24px rgba(60,70,90,0.25)" }}
        >
          <Image
            src={item.dataUrl || "/placeholder.svg"}
            alt={`${item.title} by ${item.author}`}
            fill
            sizes="(max-width: 768px) 100vw, 448px"
            className={item.isMine ? "bg-white object-contain p-4" : "object-cover"}
            unoptimized
          />
        </div>

        <div className="w-full max-w-md text-center">
          <h2 className="font-mono text-xl font-normal text-foreground">{item.title}</h2>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground/45">
            by {item.author}
          </p>
          {item.caption && (
            <p className="mt-3 font-mono text-[13px] font-light leading-relaxed text-foreground/75">
              {item.caption}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onLike}
          aria-pressed={item.liked}
          className="flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.22em] text-foreground/80 transition-colors hover:text-foreground"
          style={{ border: "0.5px solid rgba(26,26,31,0.18)" }}
        >
          <Heart className={`h-4 w-4 ${item.liked ? "fill-current" : ""}`} strokeWidth={1.5} aria-hidden="true" />
          {item.likes} {item.likes === 1 ? "like" : "likes"}
        </button>
      </main>
    </div>
  )
}

function ShareSheet({
  drawing,
  onClose,
  onPublish,
}: {
  drawing: SavedDrawing
  onClose: () => void
  onPublish: (title: string) => void
}) {
  const [title, setTitle] = useState("")
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm sm:items-center">
      <div
        className="mx-4 mb-4 w-full max-w-md rounded-3xl p-6 sm:mb-0"
        style={{
          backgroundColor: "rgba(248,249,250,0.95)",
          backdropFilter: "blur(40px) saturate(140%)",
          WebkitBackdropFilter: "blur(40px) saturate(140%)",
          border: "0.75px solid rgba(26,26,31,0.18)",
          boxShadow: "0 30px 60px -20px rgba(60,70,90,0.25)",
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-[12px] uppercase tracking-[0.22em] text-foreground/55">Publish to gallery</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/55 transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex gap-4">
          <div
            className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-white"
            style={{ border: "0.5px solid rgba(26,26,31,0.1)" }}
          >
            <Image
              src={drawing.dataUrl || "/placeholder.svg"}
              alt="Preview of your sketch"
              fill
              sizes="80px"
              className="object-contain p-1.5"
              unoptimized
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={48}
              placeholder="Give it a name"
              className="rounded-xl border border-foreground/15 bg-background/60 px-3 py-2 font-mono text-[13px] text-foreground outline-none focus:border-foreground/40"
              autoFocus
            />
            {drawing.note && (
              <p className="font-mono text-[11px] font-light leading-relaxed text-foreground/60">{drawing.note}</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground/70 transition-colors hover:text-foreground"
            style={{ border: "0.5px solid rgba(26,26,31,0.18)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onPublish(title)}
            className="flex-1 rounded-full bg-foreground px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-background transition-opacity hover:opacity-90"
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  )
}
