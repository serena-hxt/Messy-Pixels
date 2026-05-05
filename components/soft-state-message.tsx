"use client"

import { cn } from "@/lib/utils"

interface SoftStateMessageProps {
  /** Body copy. Defaults to a friendly "still learning" line. */
  message?: string
  /** Optional small uppercase caption (e.g. "harvard art museums"). */
  label?: string
  /**
   * Visual variant —
   * - "card": Bitsy chat-bubble shape, used inside the chat thread
   * - "pill": small inline rounded tag
   * - "overlay": for dark backgrounds (lens / camera surfaces)
   */
  variant?: "card" | "pill" | "overlay"
  className?: string
}

/**
 * Soft, low-stakes UI feedback for moments when an API call fails or the
 * Harvard Art Museums collection has no record for a referenced work.
 * Uses italic mono type and reduced opacity so it reads as gentle context
 * rather than a hard error.
 */
export function SoftStateMessage({
  message = "Bitsy is still learning about this piece…",
  label,
  variant = "card",
  className,
}: SoftStateMessageProps) {
  if (variant === "pill") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 self-start rounded-full bg-foreground/[0.05] px-3.5 py-1.5 backdrop-blur-md",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <span
          className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-foreground/40"
          aria-hidden="true"
        />
        <span className="font-mono text-[11px] font-light italic text-foreground/55">
          {message}
        </span>
      </div>
    )
  }

  if (variant === "overlay") {
    return (
      <div
        className={cn(
          "rounded-2xl border border-white/15 bg-white/10 px-5 py-3 backdrop-blur-2xl",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        {label && (
          <p className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
            {label}
          </p>
        )}
        <p className="font-mono text-[12px] font-light italic text-white/85">{message}</p>
      </div>
    )
  }

  // Default: chat-bubble card matching the Bitsy side
  return (
    <div
      className={cn("max-w-[88%] self-start", className)}
      role="status"
      aria-live="polite"
    >
      <div
        className="rounded-[20px] rounded-bl-[6px] bg-background/65 px-4 py-3 backdrop-blur-xl"
        style={{
          border: "0.75px solid rgba(26,26,31,0.12)",
          boxShadow: "0 8px 20px -14px rgba(60, 70, 90, 0.18)",
          opacity: 0,
          transform: "translateY(6px)",
          animation: "meta-rise 480ms ease-out 80ms both",
        }}
      >
        {label && (
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/40">
            {label}
          </p>
        )}
        <p className="font-mono text-[12.5px] font-light italic leading-relaxed text-foreground/65">
          {message}
        </p>
      </div>
    </div>
  )
}
