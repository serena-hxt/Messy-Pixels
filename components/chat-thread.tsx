"use client"

import { useEffect, useRef, useState } from "react"
import type { UIMessage } from "ai"
import type { SavedDrawing } from "@/app/page"
import { ArtworkCard } from "@/components/artwork-card"
import { ArtworkDetailModal } from "@/components/artwork-detail-modal"
import { useSelectedArtwork, type Artwork } from "@/contexts/selected-artwork-context"

/* -------------------------------------------------------------------------- */
/* Marker parsing                                                             */
/* -------------------------------------------------------------------------- */

// Bitsy embeds [artwork:Title|Artist] markers after her prose to attach a
// visual card. The artist segment is optional — `[artwork:Geraniums]` is also valid.
const ARTWORK_MARKER_RE = /\[artwork:\s*([^|\]]+?)\s*(?:\|\s*([^\]]+?)\s*)?\]/gi

interface ArtworkRef {
  title: string
  artist?: string
  /** Stable key for React lists, derived from title+artist+occurrence index. */
  key: string
}

interface ParsedAssistantMessage {
  /** Visible prose with all structural markers stripped. */
  visible: string
  /** Artwork references extracted from `[artwork:...]` markers, in order. */
  artworks: ArtworkRef[]
}

function parseAssistantMessage(text: string): ParsedAssistantMessage {
  // Strip the canvas marker first (handled elsewhere as a side-effect trigger)
  const withoutDraw = text.replace(/\[draw_now\]/gi, "")

  const artworks: ArtworkRef[] = []
  let occurrence = 0
  const visible = withoutDraw
    .replace(ARTWORK_MARKER_RE, (_full, rawTitle: string, rawArtist?: string) => {
      const title = rawTitle.trim()
      const artist = rawArtist?.trim() || undefined
      if (title) {
        artworks.push({ title, artist, key: `${title}|${artist ?? ""}#${occurrence++}` })
      }
      return ""
    })
    .trim()

  return { visible, artworks }
}

/** Plain-text version used by the follow-up question API and other consumers. */
function getMessageText(msg: UIMessage): string {
  if (!msg.parts || !Array.isArray(msg.parts)) return ""
  const raw = msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
    .replace(/\[draw_now\]/gi, "")
    .replace(ARTWORK_MARKER_RE, "")
    .trim()
  return raw
}

/* -------------------------------------------------------------------------- */
/* Bold renderer                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Render a string with **bold** markdown converted to <strong> spans, while
 * preserving newlines and any unmatched asterisks. Lightweight on purpose —
 * we only need bold so we don't pull in a full markdown parser.
 */
function renderRichText(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const parts = text.split(/(\*\*[^*\n]+?\*\*)/g)
  parts.forEach((part, i) => {
    if (!part) return
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      out.push(
        <strong key={i} className="font-medium text-foreground">
          {part.slice(2, -2)}
        </strong>,
      )
    } else {
      out.push(<span key={i}>{part}</span>)
    }
  })
  return out
}

/* -------------------------------------------------------------------------- */
/* Streaming text — typewriter effect for synthetic (default-answer) messages */
/* -------------------------------------------------------------------------- */

interface StreamingTextProps {
  text: string
  /** Approximate characters per second to reveal. */
  charsPerTick?: number
  /** Tick interval in ms. */
  tickMs?: number
  /** Called whenever a new chunk is rendered (for scroll syncing). */
  onTick?: () => void
  /** Called once when streaming completes. */
  onDone?: () => void
}

function StreamingText({
  text,
  charsPerTick = 3,
  tickMs = 18,
  onTick,
  onDone,
}: StreamingTextProps) {
  const [shown, setShown] = useState(0)
  const doneRef = useRef(false)

  useEffect(() => {
    // Reset when target text changes.
    setShown(0)
    doneRef.current = false
  }, [text])

  useEffect(() => {
    if (doneRef.current) return
    if (shown >= text.length) {
      if (!doneRef.current) {
        doneRef.current = true
        onDone?.()
      }
      return
    }
    const id = window.setTimeout(() => {
      setShown((s) => Math.min(text.length, s + charsPerTick))
      onTick?.()
    }, tickMs)
    return () => window.clearTimeout(id)
  }, [shown, text, charsPerTick, tickMs, onTick, onDone])

  const visibleText = text.slice(0, shown)
  const isStreaming = shown < text.length

  return (
    <>
      {renderRichText(visibleText)}
      {isStreaming && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-foreground/60 align-middle"
          style={{ animation: "caret-blink 900ms steps(2, end) infinite" }}
        />
      )}
    </>
  )
}

/** Heuristic: synthetic assistant messages from the default-answer registry
 *  use IDs starting with `synth_assistant_`. */
function isSyntheticAssistantId(id: string): boolean {
  return id.startsWith("synth_assistant_")
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

interface ChatThreadProps {
  messages: UIMessage[]
  status: "submitted" | "streaming" | "ready" | "error"
  drawings?: SavedDrawing[]
  error?: Error | null
  /** Pre-defined follow-up questions from default artwork answers (no API call) */
  followUpQuestions?: [string, string] | null
  onAsk?: (question: string) => void
  /**
   * Called when the user taps "edit on artwork" inside an ArtworkCard.
   * Lets the host page jump to the canvas with this artwork as the reference layer.
   */
  onEditOnArtwork?: (artwork: Artwork) => void
}

type Item =
  | { kind: "msg"; key: string; t: number; node: UIMessage }
  | { kind: "drawing"; key: string; t: number; node: SavedDrawing }

export function ChatThread({
  messages,
  status,
  drawings = [],
  error,
  followUpQuestions,
  onAsk,
  onEditOnArtwork,
}: ChatThreadProps) {
  const scrollRef = useRef<HTMLElement | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const userScrolledUpRef = useRef(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [detailArtwork, setDetailArtwork] = useState<Artwork | null>(null)
  const [completedSynthetic, setCompletedSynthetic] = useState<Set<string>>(() => new Set())

  const { setSelectedArtwork, selectedArtwork } = useSelectedArtwork()

  // Detect when the user manually scrolls up so we don't override their position.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      // Treat anything >120px from bottom as "user has scrolled up".
      userScrolledUpRef.current = distanceFromBottom > 120
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  // Auto-scroll to bottom only when the user is already near the bottom.
  // This prevents the view from yanking back while the reader is scrolling up.
  useEffect(() => {
    if (userScrolledUpRef.current) return
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, status, drawings, error, suggestedQuestions])

  // Stable callback for StreamingText to nudge scroll while typing.
  const handleStreamTick = () => {
    if (userScrolledUpRef.current) return
    endRef.current?.scrollIntoView({ behavior: "auto", block: "end" })
  }

  const handleStreamDone = (messageId: string) => {
    setCompletedSynthetic((prev) => {
      if (prev.has(messageId)) return prev
      const next = new Set(prev)
      next.add(messageId)
      return next
    })
  }

  const isWaiting = status === "submitted"

  const lastAssistantId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].id
    }
    return null
  })()

  // Clear stale follow-up suggestions while a new turn is in flight.
  useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      setSuggestedQuestions([])
    }
  }, [status])

  // Generate contextual follow-up questions for the latest assistant message.
  useEffect(() => {
    if (status !== "ready" || !onAsk) return
    // If pre-defined followUpQuestions exist (from default-answer registry),
    // skip the API call entirely — they take precedence in render.
    if (followUpQuestions && followUpQuestions.length > 0) {
      setSuggestedQuestions([])
      return
    }
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== "assistant") {
      setSuggestedQuestions([])
      return
    }
    const text = getMessageText(lastMsg)
    if (!text) {
      setSuggestedQuestions([])
      return
    }

    let cancelled = false
    fetch("/api/suggest-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: text }),
    })
      .then((res) => res.json())
      .catch(() => ({ questions: [] }))
      .then((data) => {
        if (cancelled) return
        setSuggestedQuestions((data.questions as string[]) || [])
      })

    return () => {
      cancelled = true
    }
  }, [messages, status, onAsk, followUpQuestions])

  // When an artwork card is tapped, store it globally and open the modal.
  const handleArtworkSelect = (artwork: Artwork) => {
    setSelectedArtwork(artwork)
    setDetailArtwork(artwork)
  }

  // Interleave messages and drawings chronologically.
  const items: Item[] = []
  messages.forEach((m, i) => {
    items.push({ kind: "msg", key: m.id, t: i, node: m })
  })
  drawings.forEach((d) => {
    items.push({ kind: "drawing", key: d.id, t: messages.length + d.createdAt / 1e10, node: d })
  })
  items.sort((a, b) => a.t - b.t)

  return (
    <>
      <section
        ref={scrollRef}
        className="flex flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-8 md:px-12"
        style={{ overscrollBehavior: "contain", touchAction: "pan-y" }}
        aria-live="polite"
        aria-label="Conversation with Bitsy"
      >
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 md:max-w-lg lg:max-w-2xl">
          {/* Display selected artwork at the top of chat if available */}
          {selectedArtwork?.primaryimageurl && (
            <figure
              className="mb-2 overflow-hidden rounded-[24px] bg-background/70 p-3 backdrop-blur-xl"
              style={{
                border: "0.75px solid rgba(26,26,31,0.15)",
                boxShadow: "0 12px 30px -16px rgba(60, 70, 90, 0.15)",
              }}
            >
              <div
                className="overflow-hidden rounded-[16px] bg-white"
                style={{ border: "0.5px solid rgba(26,26,31,0.1)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedArtwork.primaryimageurl}
                  alt={`${selectedArtwork.title} by ${selectedArtwork.artist || "unknown artist"}`}
                  className="h-auto w-full"
                />
              </div>
              <figcaption className="mt-3 px-1 font-mono text-[12px] text-foreground/65">
                <div className="font-medium">{selectedArtwork.title}</div>
                <div className="text-foreground/50">{selectedArtwork.artist}</div>
              </figcaption>
            </figure>
          )}
          {items.map((item) => {
            if (item.kind === "drawing") {
              return (
                <div key={item.key} className="flex justify-end">
                  <figure
                    className="max-w-[82%] overflow-hidden rounded-[20px] rounded-br-[6px] bg-background/80 p-2 backdrop-blur-xl"
                    style={{
                      border: "0.75px solid rgba(26,26,31,0.14)",
                      boxShadow: "0 14px 28px -18px rgba(60, 70, 90, 0.22)",
                    }}
                  >
                    <div
                      className="overflow-hidden rounded-[14px] bg-white"
                      style={{ border: "0.5px solid rgba(26,26,31,0.08)" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.node.dataUrl || "/placeholder.svg"}
                        alt={item.node.note ?? "User sketch"}
                        className="block h-auto w-full"
                      />
                    </div>
                    <figcaption className="mt-2 px-1 pb-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">
                      sketch ·{" "}
                      {new Date(item.node.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </figcaption>
                  </figure>
                </div>
              )
            }

            const m = item.node
            const isUser = m.role === "user"

            // Parse assistant messages for artwork markers; user messages are plain text.
            const rawText = (m.parts ?? [])
              .filter((p): p is { type: "text"; text: string } => p.type === "text")
              .map((p) => p.text)
              .join("")
            const parsed = isUser
              ? { visible: rawText.replace(/\[draw_now\]/gi, "").trim(), artworks: [] as ArtworkRef[] }
              : parseAssistantMessage(rawText)

            // Skip empty bubbles, but keep the row if there are artwork cards to show.
            if (!parsed.visible && parsed.artworks.length === 0) return null

            const isSynthetic = !isUser && isSyntheticAssistantId(m.id)
            const isStreaming = isSynthetic && !completedSynthetic.has(m.id)

            const isLatestAssistant =
              !isUser &&
              m.id === lastAssistantId &&
              status === "ready" &&
              !isStreaming &&
              ((followUpQuestions && followUpQuestions.length > 0) || suggestedQuestions.length > 0)

            return (
              <div key={item.key} className="flex flex-col gap-2">
                {/* Speech bubble — only render if there's visible prose */}
                {parsed.visible ? (
                  <div className={isUser ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={
                        isUser
                          ? "max-w-[82%] rounded-[20px] rounded-br-[6px] bg-foreground px-4 py-2.5 font-mono text-[13px] font-light leading-relaxed text-background"
                          : "max-w-[88%] rounded-[20px] rounded-bl-[6px] bg-background/75 px-4 py-2.5 font-mono text-[13px] font-light leading-relaxed text-foreground backdrop-blur-xl"
                      }
                      style={
                        isUser
                          ? undefined
                          : {
                              border: "0.75px solid rgba(26,26,31,0.14)",
                              boxShadow: "0 8px 20px -14px rgba(60, 70, 90, 0.18)",
                            }
                      }
                    >
                      {!isUser && (
                        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">
                          bitsy
                        </p>
                      )}
                      <p className="whitespace-pre-wrap text-pretty">
                        {isUser ? (
                          parsed.visible
                        ) : isSynthetic ? (
                          <StreamingText
                            text={parsed.visible}
                            onTick={handleStreamTick}
                            onDone={() => handleStreamDone(m.id)}
                          />
                        ) : (
                          renderRichText(parsed.visible)
                        )}
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Artwork cards — appear under the bubble for any markers Bitsy attached. */}
                {parsed.artworks.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {parsed.artworks.map((ref) => (
                      <ArtworkCard
                        key={`${m.id}-${ref.key}`}
                        title={ref.title}
                        artist={ref.artist}
                        onSelect={handleArtworkSelect}
                        onEditOnArtwork={onEditOnArtwork}
                      />
                    ))}
                  </div>
                )}

                {/* Follow-up question chips — prioritize pre-defined followUpQuestions over API-generated suggestedQuestions */}
                {isLatestAssistant && onAsk && (
                  <div className="ml-1 flex flex-col gap-2 pt-1">
                    {(followUpQuestions ?? suggestedQuestions).map((q, i) => (
                      <button
                        key={`${m.id}-q-${i}`}
                        type="button"
                        onClick={() => onAsk(q)}
                        className="group flex w-full max-w-[88%] items-center justify-between gap-3 self-start rounded-full bg-background/70 px-4 py-2.5 text-left backdrop-blur-md transition-colors hover:bg-background/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{
                          border: "0.75px solid rgba(26,26,31,0.15)",
                          boxShadow: "0 8px 22px -16px rgba(60, 70, 90, 0.18)",
                          opacity: 0,
                          transform: "translateY(8px)",
                          animation: `meta-rise 420ms ease-out ${80 + i * 110}ms both`,
                        }}
                      >
                        <span className="font-mono text-[12.5px] font-light text-foreground/85 group-hover:text-foreground">
                          {q}
                        </span>
                        <span
                          aria-hidden="true"
                          className="font-mono text-[14px] text-foreground/35 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/70"
                        >
                          →
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {isWaiting && (
            <div className="flex justify-start">
              <div
                className="rounded-[20px] rounded-bl-[6px] bg-background/75 px-4 py-3 backdrop-blur-xl"
                style={{
                  border: "0.75px solid rgba(26,26,31,0.14)",
                  boxShadow: "0 8px 20px -14px rgba(60, 70, 90, 0.18)",
                }}
                aria-label="Bitsy is thinking"
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/50 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/50 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/50 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-start">
              <div
                className="max-w-[88%] rounded-[20px] rounded-bl-[6px] px-4 py-2.5 font-mono text-[13px] font-light leading-relaxed backdrop-blur-xl"
                style={{
                  backgroundColor: "rgba(212, 165, 165, 0.18)",
                  border: "0.75px solid rgba(180, 100, 100, 0.35)",
                  color: "rgba(120, 60, 60, 0.95)",
                  boxShadow: "0 8px 20px -14px rgba(60, 70, 90, 0.18)",
                }}
                role="alert"
              >
                <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.22em] opacity-70">
                  connection
                </p>
                <p className="whitespace-pre-wrap text-pretty">
                  {error.message || "Something went wrong reaching Bitsy. Please try again."}
                </p>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </section>

      {/* Detail modal — opens when an artwork card is tapped. */}
      <ArtworkDetailModal artwork={detailArtwork} onClose={() => setDetailArtwork(null)} />
    </>
  )
}
