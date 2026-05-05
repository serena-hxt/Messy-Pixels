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
}

const LANE_COUNT = 7       // vertical slots across the overlay
const MAX_ACTIVE = 18      // max items flying at once

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

export function ArtworkComments({ artworkId }: ArtworkCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [danmakuItems, setDanmakuItems] = useState<DanmakuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [content, setContent] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchComments = useCallback(async () => {
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
  }, [artworkId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // When a new comment is posted, inject it immediately into a random lane
  const injectDanmaku = (comment: Comment) => {
    const item: DanmakuItem = {
      id: `live-${comment.id}`,
      content: comment.content,
      lane: Math.floor(Math.random() * LANE_COUNT),
      duration: 10 + Math.random() * 4,
      delay: 0,
      fontSize: 13,
      opacity: 1,
    }
    setDanmakuItems((prev) => [...prev, item])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || posting) return

    setPosting(true)
    const optimistic: Comment = {
      id: `opt-${Date.now()}`,
      nickname: "Anonymous",
      content: content.trim(),
      created_at: new Date().toISOString(),
    }
    setComments((prev) => [optimistic, ...prev])
    injectDanmaku(optimistic)
    setContent("")

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artworkId,
          nickname: "Anonymous",
          content: optimistic.content,
        }),
      })
      const data = await res.json()
      if (data.comment) {
        setComments((prev) =>
          prev.map((c) => (c.id === optimistic.id ? data.comment : c))
        )
      }
    } catch {
      // keep optimistic entry
    } finally {
      setPosting(false)
    }
  }

  // Percentage height per lane
  const laneHeight = 100 / LANE_COUNT

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
