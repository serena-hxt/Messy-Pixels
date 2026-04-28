"use client"

import { useState } from "react"
import Image from "next/image"

export function BitsyCard() {
  const [flipped, setFlipped] = useState(false)

  return (
    <section className="flex flex-1 items-center justify-center px-4 py-6 sm:px-8 md:px-12 md:py-10">
      <div className="perspective-1200 w-full max-w-sm md:max-w-md">
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? "Hide artwork of the day" : "Reveal artwork of the day"}
          aria-pressed={flipped}
          className="relative h-[60vh] max-h-[680px] w-full rounded-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-[70vh]"
        >
          <div
            className="preserve-3d relative h-full w-full transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* FRONT */}
            <div
              className="backface-hidden absolute inset-0 flex flex-col overflow-hidden rounded-[36px] p-7 text-left"
              style={{
                backgroundColor: "rgba(255,255,255,0.7)",
                backdropFilter: "blur(40px) saturate(140%)",
                WebkitBackdropFilter: "blur(40px) saturate(140%)",
                border: "0.75px solid rgba(26,26,31,0.18)",
                boxShadow: "0 30px 60px -20px rgba(60, 70, 90, 0.12), 0 1px 0 0 rgba(255,255,255,0.7) inset",
                transform: "rotateY(0deg) translateZ(0.01px)",
              }}
            >
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
      </div>
    </section>
  )
}
