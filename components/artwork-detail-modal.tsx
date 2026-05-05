"use client"

import { useEffect } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import type { Artwork } from "@/lib/ham-api"

interface ArtworkDetailModalProps {
  artwork: Artwork | null
  onClose: () => void
}

/**
 * Full-screen detail view for an HAM artwork. Shows the high-resolution image
 * front-and-center with a museum-label-style block beneath it carrying the
 * full curatorial commentary, medium, and a small color palette strip.
 */
export function ArtworkDetailModal({ artwork, onClose }: ArtworkDetailModalProps) {
  const open = !!artwork

  // Close on Escape and lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {artwork && (
        <motion.div
          key={artwork.id}
          className="fixed inset-0 z-50 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label={`${artwork.title} by ${artwork.artist}`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: "rgba(248,249,250,0.92)",
              backdropFilter: "blur(28px) saturate(140%)",
              WebkitBackdropFilter: "blur(28px) saturate(140%)",
            }}
            aria-hidden="true"
          />

          {/* Foreground content */}
          <div className="relative flex h-full flex-col">
            {/* Header */}
            <header className="flex items-center px-4 pt-6 sm:px-8 md:px-12">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close artwork details"
                className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="h-5 w-5" strokeWidth={1.25} aria-hidden="true" />
              </button>
              <p className="ml-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/55">
                harvard art museums
              </p>
            </header>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 pb-12 pt-4 sm:px-8 md:px-12">
              <div className="mx-auto flex w-full max-w-2xl flex-col gap-7">
                {/* Hero image — fade up on open */}
                {artwork.primaryimageurl ? (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
                    className="relative w-full overflow-hidden rounded-[24px] bg-foreground/5"
                    style={{
                      border: "0.5px solid rgba(26,26,31,0.12)",
                      boxShadow: "0 30px 60px -28px rgba(60, 70, 90, 0.28)",
                    }}
                  >
                    {/* Use a fixed aspect container so portraits and landscapes both look right */}
                    <div className="relative aspect-[4/5] w-full">
                      <Image
                        src={artwork.primaryimageurl || "/placeholder.svg"}
                        alt={`${artwork.title} by ${artwork.artist}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 672px"
                        className="object-contain"
                        priority
                        unoptimized
                      />
                    </div>
                  </motion.div>
                ) : null}

                {/* Museum label */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
                  className="flex flex-col gap-1.5"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">
                    on view · object {artwork.id}
                  </p>
                  <h1 className="tracking-display font-mono text-2xl font-normal leading-tight text-foreground sm:text-[28px]">
                    {artwork.title}
                  </h1>
                  <p className="font-mono text-[13px] font-light text-foreground/75">
                    {artwork.artist}
                  </p>
                  {artwork.medium ? (
                    <p className="font-mono text-[11px] font-light text-foreground/55">
                      {artwork.medium}
                    </p>
                  ) : null}
                </motion.div>

                {/* Color palette strip */}
                {artwork.colors.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.28 }}
                    className="flex flex-col gap-2"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">
                      palette
                    </p>
                    <div
                      className="flex h-3 w-full overflow-hidden rounded-full"
                      style={{ border: "0.5px solid rgba(26,26,31,0.08)" }}
                      aria-hidden="true"
                    >
                      {artwork.colors.slice(0, 8).map((hex, i) => (
                        <span
                          key={`${hex}-${i}`}
                          className="flex-1"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : null}

                {/* Full commentary */}
                {artwork.commentary ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.32 }}
                    className="flex flex-col gap-2"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">
                      curator&apos;s note
                    </p>
                    <div
                      className="rounded-[20px] bg-background/65 p-5 backdrop-blur-md"
                      style={{
                        border: "0.5px solid rgba(26,26,31,0.1)",
                        boxShadow: "0 12px 28px -20px rgba(60, 70, 90, 0.22)",
                      }}
                    >
                      <p className="whitespace-pre-wrap text-pretty font-mono text-[13px] font-light leading-relaxed text-foreground/85">
                        {artwork.commentary}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <p className="font-mono text-[12px] font-light italic text-foreground/55">
                    No curatorial commentary is available for this work yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
