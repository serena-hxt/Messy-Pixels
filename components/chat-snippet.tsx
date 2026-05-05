"use client"

import type { UIMessage } from "ai"

function getMessageText(msg: UIMessage): string {
  if (!msg.parts || !Array.isArray(msg.parts)) return ""
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
    // Strip the canvas marker so users never see it
    .replace(/\[draw_now\]/gi, "")
    .trim()
}

interface ChatSnippetProps {
  messages: UIMessage[]
}

/**
 * Compact two-line chat preview shown above the canvas.
 * Renders the most recent assistant message (falls back to last message).
 */
export function ChatSnippet({ messages }: ChatSnippetProps) {
  if (messages.length === 0) return null

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")
  const target = lastAssistant ?? messages[messages.length - 1]
  const text = getMessageText(target)
  if (!text) return null

  const isUser = target.role === "user"

  return (
    <div className="px-4 pt-2 sm:px-8 md:px-12">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/40">
        {isUser ? "you" : "bitsy"}
      </p>
      <p className="mt-1 line-clamp-2 font-mono text-[13px] font-light leading-relaxed text-foreground/85 text-pretty">
        {text}
      </p>
    </div>
  )
}
