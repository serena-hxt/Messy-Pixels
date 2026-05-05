"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

interface Ripple {
  id: number
  x: number
  y: number
}

interface BitsyCardProps {
  /**
   * Called when the user taps one of the follow-up question chips that appear
   * after the card flips. The question text is sent as if the user typed it.
   */
  onAsk?: (question: string) => void
}

const SUGGESTED_QUESTIONS = [
  "What makes this painting Fauvist?",
  "Why did Matisse pair red with green?",
] as const

export function BitsyCard({ onAsk }: BitsyCardProps) {
  const [flipped, setFlipped] = useState(false)
  const [showQuestions, setShowQuestions] = useState(false)
  const [ripples, setRipples] = useState<Ripple[]>([])

  // After the card flips, wait 3s of dwell time before revealing the
  // suggested questions (and letting the card glide upward to make room).
  // Flipping back instantly hides them again.
  useEffect(() => {
    if (!flipped) {
      setShowQuestions(false)
      return
    }
    const t = window.setTimeout(() => setShowQuestions(true), 3000)
    return () => window.clearTimeout(t)
  }, [flipped])

  const frontRef = useRef<HTMLDivElement>(null)
  const lastSpawnAtRef = useRef(0)
  const lastSpawnPosRef = useRef<{ x: number; y: number } | null>(null)
  const rippleIdRef = useRef(0)

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (flipped) return
    const el = frontRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Clip to interior — ignore the dead pixels right at the rounded edge
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return

    // Continuous cursor spotlight via CSS vars (no re-render)
    el.style.setProperty("--mx", `${x}px`)
    el.style.setProperty("--my", `${y}px`)
    el.style.setProperty("--mo", "1")

    // Spawn discrete ripples — throttled by time + movement distance so
    // standing still doesn't flood the surface
    const now = performance.now()
    const last = lastSpawnPosRef.current
    const dist = last ? Math.hypot(x - last.x, y - last.y) : Number.POSITIVE_INFINITY

    if (now - lastSpawnAtRef.current > 95 && dist > 22) {
      lastSpawnAtRef.current = now
      lastSpawnPosRef.current = { x, y }
      const id = ++rippleIdRef.current
      setRipples((rs) => [...rs, { id, x, y }])
      window.setTimeout(() => {
        setRipples((rs) => rs.filter((r) => r.id !== id))
      }, 900)
    }
  }

  const handlePointerLeave = () => {
    const el = frontRef.current
    if (!el) return
    el.style.setProperty("--mo", "0")
  }

  return (
    <section className="flex flex-1 flex-col items-center justify-start overflow-hidden px-4 pt-4 pb-2 sm:px-8 md:px-12">
      <div className="perspective-1200 flex w-full max-w-sm flex-col md:max-w-md" style={{ flex: "1 1 0", minHeight: 0 }}>
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? "Hide artwork of the day" : "Reveal artwork of the day"}
          aria-pressed={flipped}
          className="relative w-full flex-1 min-h-0 rounded-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div
            className="preserve-3d absolute inset-0 transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* FRONT — frosted glass with the artwork blurred underneath */}
            <div
              ref={frontRef}
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              className="backface-hidden absolute inset-0 overflow-hidden rounded-[36px] text-left"
              style={{
                border: "0.75px solid rgba(26,26,31,0.18)",
                boxShadow: "0 30px 60px -20px rgba(60, 70, 90, 0.12)",
                transform: "rotateY(0deg) translateZ(0.01px)",
              }}
            >
              {/* Underlying artwork, heavily blurred + slightly scaled to avoid edge bleed */}
              <Image
                src="/artwork-of-the-day.png"
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 384px"
                priority
                unoptimized
                aria-hidden="true"
                className="object-cover"
                style={{
                  filter: "blur(36px) saturate(115%)",
                  transform: "scale(1.18)",
                }}
              />

              {/* Frosted-glass wash on top of the blurred artwork for legibility */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: "rgba(248,249,250,0.55)",
                  backdropFilter: "blur(18px) saturate(130%)",
                  WebkitBackdropFilter: "blur(18px) saturate(130%)",
                  boxShadow: "0 1px 0 0 rgba(255,255,255,0.55) inset",
                }}
                aria-hidden="true"
              />

              {/* Cursor spotlight — continuous soft glow that tracks the pointer */}
              <div
                className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                style={{
                  opacity: "var(--mo, 0)" as unknown as number,
                  background:
                    "radial-gradient(circle 160px at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.42), rgba(255,255,255,0) 70%)",
                  mixBlendMode: "soft-light",
                }}
                aria-hidden="true"
              />

              {/* Ripple bursts — spawned on movement, fade out radially */}
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                {ripples.map((r) => (
                  <span
                    key={r.id}
                    className="animate-ripple-fade absolute block rounded-full"
                    style={{
                      left: r.x,
                      top: r.y,
                      width: 14,
                      height: 14,
                      marginLeft: -7,
                      marginTop: -7,
                      background:
                        "radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0) 75%)",
                      mixBlendMode: "soft-light",
                    }}
                  />
                ))}
              </div>

              {/* Soft bottom vignette to anchor the headline */}
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(248,249,250,0) 0%, rgba(248,249,250,0.55) 70%, rgba(248,249,250,0.85) 100%)",
                }}
                aria-hidden="true"
              />

              {/* Foreground content */}
              <div className="relative flex h-full flex-col p-7">
                <div className="flex-1" />
                <div className="space-y-2">
                  <h1 className="tracking-display text-pretty font-mono text-3xl font-normal leading-tight text-foreground sm:text-[34px]">
                    {"Hi, I'm Bitsy"}
                  </h1>
                  <p className="font-mono text-[11px] font-light text-foreground/60">
                    click to see the artwork of the day
                  </p>
                </div>
              </div>
            </div>

            {/* BACK */}
            <div
              className="backface-hidden absolute inset-0 flex flex-col overflow-hidden rounded-[36px] text-left"
              style={{
                backgroundColor: "rgba(255,255,255,0.92)",
                border: "0.75px solid rgba(26,26,31,0.18)",
                boxShadow: "0 30px 60px -20px rgba(60, 70, 90, 0.12)",
                transform: "rotateY(180deg) translateZ(0.01px)",
              }}
            >
              {/* Artwork */}
              <div className="relative flex-1 overflow-hidden">
                <Image
                  src="/artwork-of-the-day.png"
                  alt="Geraniums by Henri Matisse, 1910"
                  fill
                  sizes="(max-width: 768px) 100vw, 384px"
                  className="object-cover"
                  priority
                  unoptimized
                />
                {/* Subtle bottom gradient so the label area reads cleanly */}
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(248,249,250,0) 0%, rgba(248,249,250,0.85) 70%, rgba(248,249,250,0.98) 100%)",
                  }}
                />
              </div>

              {/* Caption plate */}
              <div className="relative px-7 pb-6 pt-4">
                <div className="flex items-end justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/50">
                      artwork of the day
                    </p>
                    <h2 className="tracking-display font-mono text-xl font-normal leading-tight text-foreground">
                      Geraniums
                    </h2>
                    <p className="font-mono text-xs font-light text-foreground/70">Henri Matisse</p>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-foreground/55">1910</span>
                </div>
              </div>
            </div>
          </div>
        </button>

        {/*
          Follow-up questions — always mounted (so the flex parent can smoothly
          redistribute when they expand), but their container's row height
          animates 0fr → 1fr after a 3s dwell on the flipped face. The flex
          centering of the parent <section> then naturally lifts the card
          upward in sync, instead of snapping when the content first renders.
        */}
        {onAsk && (
          <div
            aria-hidden={!showQuestions}
            className="grid transition-[grid-template-rows] duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              gridTemplateRows: showQuestions ? "1fr" : "0fr",
            }}
          >
            <div className="overflow-hidden">
              <div
                className="mt-5 flex flex-col gap-2"
                aria-label="Suggested questions about this artwork"
              >
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45"
                  style={{
                    opacity: showQuestions ? 1 : 0,
                    transform: showQuestions ? "translateY(0)" : "translateY(6px)",
                    transition: "opacity 380ms ease-out 220ms, transform 380ms ease-out 220ms",
                  }}
                >
                  ask bitsy
                </p>
                {SUGGESTED_QUESTIONS.map((question, i) => (
                  <button
                    key={question}
                    type="button"
                    tabIndex={showQuestions ? 0 : -1}
                    onClick={() => onAsk(question)}
                    className="group flex w-full items-center justify-between gap-3 rounded-full bg-background/70 px-5 py-3 text-left backdrop-blur-md transition-colors hover:bg-background/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{
                      border: "0.75px solid rgba(26,26,31,0.15)",
                      boxShadow: "0 8px 22px -16px rgba(60, 70, 90, 0.18)",
                      opacity: showQuestions ? 1 : 0,
                      transform: showQuestions ? "translateY(0)" : "translateY(10px)",
                      transition: `opacity 460ms ease-out ${320 + i * 120}ms, transform 460ms ease-out ${320 + i * 120}ms`,
                    }}
                  >
                    <span className="font-mono text-[12.5px] font-light text-foreground/85 group-hover:text-foreground">
                      {question}
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
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
