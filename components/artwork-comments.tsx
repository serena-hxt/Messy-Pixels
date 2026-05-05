"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Send } from "lucide-react"

interface Comment {
  id: string
  nickname: string
  content: string
  created_at: string
}

interface DanmakuItem {
  id: string
  content: string
  lane: number      // 0-based vertical lane index
  duration: number  // seconds to cross the screen
  delay: number     // seconds before starting
  fontSize: number  // slight size variation for depth
  opacity: number   // slight opacity variation
}

interface ArtworkCommentsProps {
  artworkId: number
  /** Render only the input bar (for top placement) */
  inputOnly?: boolean
  /** Render only the floating danmaku layer */
  floatingOnly?: boolean
}

const LANE_COUNT = 7       // vertical slots across the overlay
const MAX_ACTIVE = 18      // max items flying at once

// Custom event for cross-instance communication
const DANMAKU_EVENT = "bitsy:danmaku:new"

function emitNewDanmaku(content: string, artworkId: number) {
  window.dispatchEvent(new CustomEvent(DANMAKU_EVENT, { detail: { content, artworkId } }))
}

function buildDanmakuQueue(comments: Comment[]): DanmakuItem[] {
  // Shuffle so every reload feels fresh
  const shuffled = [...comments].sort(() => Math.random() - 0.5)
  return shuffled.map((c, i) => ({
    id: c.id,
    content: c.content,
    lane: i % LANE_COUNT,
    duration: 9 + Math.random() * 7,          // 9 – 16 s
    delay: (i / MAX_ACTIVE) * 12 * Math.random(), // stagger start times
    fontSize: 11 + Math.floor(Math.random() * 3), // 11–13 px
    opacity: 0.55 + Math.random() * 0.35,     // 0.55 – 0.9
  }))
}

export function ArtworkComments({ artworkId, inputOnly, floatingOnly }: ArtworkCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [danmakuItems, setDanmakuItems] = useState<DanmakuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [content, setContent] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchComments = useCallback(async () => {
    // Skip fetching for input-only mode
    if (inputOnly) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/comments?artworkId=${artworkId}`)
      const data = await res.json()
      if (data.comments) {
        setComments(data.comments)
        setDanmakuItems(buildDanmakuQueue(data.comments))
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [artworkId, inputOnly])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Listen for new danmaku events (from other instances)
  useEffect(() => {
    if (!floatingOnly) return

    const handler = (e: Event) => {
      const { content: newContent, artworkId: eventArtworkId } = (e as CustomEvent).detail
      if (eventArtworkId !== artworkId) return

      const item: DanmakuItem = {
        id: `live-${Date.now()}`,
        content: newContent,
        lane: Math.floor(Math.random() * LANE_COUNT),
        duration: 10 + Math.random() * 4,
        delay: 0,
        fontSize: 13,
        opacity: 1,
      }
      setDanmakuItems((prev) => [...prev, item])
    }

    window.addEventListener(DANMAKU_EVENT, handler)
    return () => window.removeEventListener(DANMAKU_EVENT, handler)
  }, [floatingOnly, artworkId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || posting) return

    const text = content.trim()
    setPosting(true)
    setContent("")

    // Emit event so floating layer picks it up
    emitNewDanmaku(text, artworkId)

    try {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artworkId,
          nickname: "Anonymous",
          content: text,
        }),
      })
    } catch {
      // silently ignore
    } finally {
      setPosting(false)
    }
  }

  // Percentage height per lane
  const laneHeight = 100 / LANE_COUNT

  // Input-only mode: just the glassmorphic input bar (for top placement)
  if (inputOnly) {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex flex-1 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2"
        style={{
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 8px 24px -8px rgba(0,0,0,0.4)",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder="leave a thought…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={300}
          className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-white placeholder:text-white/40 focus:outline-none"
          aria-label="Comment"
        />
        <button
          type="submit"
          disabled={!content.trim() || posting}
          aria-label="Post comment"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white/80 transition-colors hover:bg-white/25 disabled:opacity-30"
        >
          <Send className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </form>
    )
  }

  // Floating-only mode: just the danmaku layer (for center placement)
  if (floatingOnly) {
    return (
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        {!loading && danmakuItems.map((item) => (
          <span
            key={item.id}
            className="absolute whitespace-nowrap font-mono"
            style={{
              top: `${item.lane * laneHeight + laneHeight * 0.2}%`,
              left: "100%",
              fontSize: `${item.fontSize}px`,
              color: `rgba(255,255,255,${item.opacity})`,
              textShadow: "0 1px 6px rgba(0,0,0,0.7)",
              animation: `danmaku-fly ${item.duration}s ${item.delay}s linear infinite`,
            }}
          >
            {item.content}
          </span>
        ))}
        {!loading && comments.length === 0 && (
          <span
            className="absolute font-mono text-[11px] text-white/35"
            style={{ top: "45%", left: "50%", transform: "translateX(-50%)" }}
          >
            be the first to leave a thought
          </span>
        )}
      </div>
    )
  }

  // Default: full component with both floating layer and input bar
  return (
    <div className="relative flex flex-col" style={{ height: "100%", minHeight: 0 }}>
      {/* Danmaku floating layer — fills the overlay area, pointer-events off */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        {!loading && danmakuItems.map((item) => (
          <span
            key={item.id}
            className="absolute whitespace-nowrap font-mono"
            style={{
              top: `${item.lane * laneHeight + laneHeight * 0.2}%`,
              left: "100%",
              fontSize: `${item.fontSize}px`,
              color: `rgba(255,255,255,${item.opacity})`,
              textShadow: "0 1px 6px rgba(0,0,0,0.7)",
              animation: `danmaku-fly ${item.duration}s ${item.delay}s linear infinite`,
            }}
          >
            {item.content}
          </span>
        ))}
        {!loading && comments.length === 0 && (
          <span
            className="absolute font-mono text-[11px] text-white/35"
            style={{ top: "45%", left: "50%", transform: "translateX(-50%)" }}
          >
            be the first to leave a thought
          </span>
        )}
      </div>

      {/* Input bar — pinned to bottom, always on top */}
      <div className="relative z-10 mt-auto">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/45 px-3 py-2 backdrop-blur-2xl"
          style={{ boxShadow: "0 8px 24px -8px rgba(0,0,0,0.5)" }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="leave a thought…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={300}
            className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-white placeholder:text-white/30 focus:outline-none"
            aria-label="Comment"
          />
          <button
            type="submit"
            disabled={!content.trim() || posting}
            aria-label="Post comment"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/70 transition-colors hover:bg-white/20 disabled:opacity-30"
          >
            <Send className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  )
}
