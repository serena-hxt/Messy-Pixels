"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Send } from "lucide-react"

interface Comment {
  id: string
  nickname: string
  content: string
  created_at: string
}

interface ArtworkCommentsProps {
  artworkId: number
}

export function ArtworkComments({ artworkId }: ArtworkCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [content, setContent] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?artworkId=${artworkId}`)
      const data = await res.json()
      if (data.comments) setComments(data.comments)
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [artworkId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

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
        // Replace optimistic entry with the real one
        setComments((prev) =>
          prev.map((c) => (c.id === optimistic.id ? data.comment : c))
        )
      }
    } catch {
      // keep optimistic entry — network error, don't remove it
    } finally {
      setPosting(false)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const diff = Date.now() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return date.toLocaleDateString()
  }

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/45 backdrop-blur-2xl"
      style={{ boxShadow: "0 12px 32px -12px rgba(0,0,0,0.5)" }}
    >
      {/* Scrollable comments list */}
      <div
        ref={listRef}
        className="flex max-h-[160px] flex-col-reverse gap-1.5 overflow-y-auto px-3 pt-2 pb-1"
      >
        {loading && (
          <p className="py-3 text-center font-mono text-[10px] text-white/35">loading…</p>
        )}
        {!loading && comments.length === 0 && (
          <p className="py-3 text-center font-mono text-[10px] text-white/35">
            be the first to leave a thought
          </p>
        )}
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start gap-2 py-0.5">
            <span className="font-mono text-[11px] font-semibold leading-snug text-white/55 shrink-0">
              Anon
            </span>
            <span className="flex-1 font-mono text-[11.5px] leading-snug text-white/85 break-words">
              {comment.content}
            </span>
            <span className="shrink-0 font-mono text-[9.5px] text-white/30 pt-0.5">
              {formatTime(comment.created_at)}
            </span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-white/10" />

      {/* Always-visible input — no toggle required */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2">
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
  )
}
