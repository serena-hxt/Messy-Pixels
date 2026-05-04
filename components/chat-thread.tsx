"use client"

import { useEffect, useRef, useState } from "react"
import type { UIMessage } from "ai"
import type { SavedDrawing } from "@/app/page"

function getMessageText(msg: UIMessage): string {
  if (!msg.parts || !Array.isArray(msg.parts)) return ""
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
    // Hide the canvas-trigger marker from the visible transcript
    .replace(/\[draw_now\]/gi, "")
    .trim()
}

/**
 * Render a string with **bold** markdown converted to <strong> spans, while
 * preserving newlines and any unmatched asterisks. Lightweight on purpose —
 * we only need bold so we don't pull in a full markdown parser.
 */
function renderRichText(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  // Split on **...** while keeping the captured group separate
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

interface ChatThreadProps {
  messages: UIMessage[]
  status: "submitted" | "streaming" | "ready" | "error"
  drawings?: SavedDrawing[]
  error?: Error | null
  onAsk?: (question: string) => void
}

type Item =
  | { kind: "msg"; key: string; t: number; node: UIMessage }
  | { kind: "drawing"; key: string; t: number; node: SavedDrawing }

export function ChatThread({ messages, status, drawings = [], error, onAsk }: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement>(null)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, status, drawings, error, suggestedQuestions])

  const isWaiting = status === "submitted"

  // The id of the most recent assistant message — follow-up question chips
  // attach to it (and only it) so they always sit under the freshest answer.
  const lastAssistantId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].id
    }
    return null
  })()

  // The moment the user submits a new message (or a new answer starts streaming),
  // clear any stale suggestions so they don't briefly cling to the old answer.
  useEffect(() => {
    if (status === "submitted" || status === "streaming") {
      setSuggestedQuestions([])
    }
  }, [status])

  // When the last message is from the assistant and we're done streaming,
  // generate contextual follow-up questions for it.
  useEffect(() => {
    if (status !== "ready" || !onAsk) return
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
  }, [messages, status, onAsk])

  // Interleave messages and drawings chronologically. Messages get incrementing
  // virtual timestamps based on order so drawings can splice in naturally.
  const items: Item[] = []
  messages.forEach((m, i) => {
    items.push({ kind: "msg", key: m.id, t: i, node: m })
  })
  drawings.forEach((d) => {
    // Drawings live "between" messages — push to the end so the user-message
    // that announced the sketch still appears with the image alongside.
    items.push({ kind: "drawing", key: d.id, t: messages.length + d.createdAt / 1e10, node: d })
  })
  items.sort((a, b) => a.t - b.t)

  return (
    <section
      className="flex flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-8 md:px-12"
      aria-live="polite"
      aria-label="Conversation with Bitsy"
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 md:max-w-lg lg:max-w-2xl">
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
                    sketch · {new Date(item.node.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </figcaption>
                </figure>
              </div>
            )
          }

          const m = item.node
          const text = getMessageText(m)
          if (!text) return null
          const isUser = m.role === "user"

          // Determine whether this assistant message is the latest one — only
          // the most recent answer carries follow-up question chips beneath it.
          const isLatestAssistant =
            !isUser && m.id === lastAssistantId && status === "ready" && suggestedQuestions.length > 0

          return (
            <div key={item.key} className="flex flex-col gap-2">
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
                    {isUser ? text : renderRichText(text)}
                  </p>
                </div>
              </div>

              {/* Follow-up question chips — appear directly under this Bitsy
                  answer once suggestions for it have arrived. */}
              {isLatestAssistant && onAsk && (
                <div className="ml-1 flex flex-col gap-2 pt-1">
                  {suggestedQuestions.map((q, i) => (
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
              <p className="whitespace-pre-wrap text-pretty">{error.message || "Something went wrong reaching Bitsy. Please try again."}</p>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </section>
  )
}
