"use client"

import { useEffect, useState, useCallback } from "react"

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
  const [nickname, setNickname] = useState("")
  const [content, setContent] = useState("")
  const [expanded, setExpanded] = useState(false)

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?artworkId=${artworkId}`)
      const data = await res.json()
      if (data.comments) {
        setComments(data.comments)
      }
    } catch (err) {
      console.error("[v0] Failed to load comments:", err)
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
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artworkId,
          nickname: nickname.trim() || "Visitor",
          content: content.trim(),
        }),
      })
      const data = await res.json()
      if (data.comment) {
        setComments((prev) => [data.comment, ...prev])
        setContent("")
      }
    } catch (err) {
      console.error("[v0] Failed to post comment:", err)
    } finally {
      setPosting(false)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle bar */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 backdrop-blur-md transition-colors hover:bg-white/12"
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
          {loading ? "Loading comments…" : `${comments.length} comment${comments.length !== 1 ? "s" : ""}`}
        </span>
        <span
          className="font-mono text-[14px] text-white/50 transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
        >
          ▾
        </span>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div
          className="flex max-h-[280px] flex-col gap-3 overflow-hidden rounded-2xl border border-white/15 bg-black/50 p-3 backdrop-blur-xl"
          style={{ boxShadow: "0 12px 32px -12px rgba(0,0,0,0.5)" }}
        >
          {/* Input form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                className="w-24 shrink-0 rounded-lg border border-white/15 bg-white/8 px-3 py-2 font-mono text-[12px] text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Share your thoughts…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={500}
                className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/8 px-3 py-2 font-mono text-[12px] text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!content.trim() || posting}
                className="shrink-0 rounded-lg border border-white/20 bg-white/15 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-white/90 transition-colors hover:bg-white/25 disabled:opacity-40"
              >
                {posting ? "…" : "Post"}
              </button>
            </div>
          </form>

          {/* Comments list */}
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
            {comments.length === 0 && !loading && (
              <p className="py-4 text-center font-mono text-[11px] text-white/40">
                Be the first to share your thoughts on this piece.
              </p>
            )}
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-medium text-white/80">
                    {comment.nickname}
                  </span>
                  <span className="font-mono text-[10px] text-white/40">
                    {formatTime(comment.created_at)}
                  </span>
                </div>
                <p className="font-mono text-[12px] leading-relaxed text-white/70">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
