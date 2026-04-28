"use client"

import type React from "react"
import { Camera, Mic, Pencil, ArrowUp } from "lucide-react"

interface InteractionBarProps {
  input: string
  onInputChange: (value: string) => void
  onSubmit: () => void
  onCamera: () => void
  onCanvas: () => void
  status: "submitted" | "streaming" | "ready" | "error"
}

export function InteractionBar({
  input,
  onInputChange,
  onSubmit,
  onCamera,
  onCanvas,
  status,
}: InteractionBarProps) {
  const isBusy = status === "submitted" || status === "streaming"
  const canSend = input.trim().length > 0 && !isBusy

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSend) return
    onSubmit()
  }

  return (
    <div className="sticky bottom-0 z-10 px-4 pb-6 pt-2 sm:px-8 md:px-12">
      <form
        onSubmit={handleSubmit}
        className="rounded-[28px] bg-background/70 px-5 pb-4 pt-4 backdrop-blur-xl sm:px-6"
        style={{
          border: "0.75px solid rgba(26,26,31,0.18)",
          boxShadow: "0 12px 30px -16px rgba(60, 70, 90, 0.15)",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Ask me anything..."
          aria-label="Ask Bitsy anything"
          autoComplete="off"
          className="w-full bg-transparent font-mono text-[15px] font-light tracking-tight text-foreground placeholder:text-foreground/40 focus:outline-none"
        />

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={onCamera}
            aria-label="Open camera (Lens)"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ border: "0.75px solid rgba(26,26,31,0.28)" }}
          >
            <Camera className="h-[16px] w-[16px]" strokeWidth={1.25} aria-hidden="true" />
          </button>

          <div className="flex items-center gap-5">
            <button
              type="button"
              aria-label="Voice input"
              className="rounded-full text-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Mic className="h-[20px] w-[20px]" strokeWidth={1.5} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onCanvas}
              aria-label="Open drawing canvas"
              className="rounded-full text-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Pencil className="h-[20px] w-[20px]" strokeWidth={1.5} aria-hidden="true" />
            </button>

            {input.trim().length > 0 && (
              <button
                type="submit"
                disabled={!canSend}
                aria-label="Send message"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
              >
                <ArrowUp className="h-[16px] w-[16px]" strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
