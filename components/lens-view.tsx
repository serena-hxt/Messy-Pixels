"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronRight, ChevronUp, Menu, RotateCcw, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { AlbumSheet, type Recognition, type RecognizedHistoryItem } from "@/components/album-sheet"
import { ArtworkComments } from "@/components/artwork-comments"
import { useSelectedArtwork } from "@/contexts/selected-artwork-context"
import type { Artwork } from "@/lib/ham-api"

type Danmaku = {
  id: string
  text: string
  top: number
  duration: number
  userAuthored?: boolean
}

const DANMAKU_PHRASES = [
  "so vibrant!",
  "love the composition",
  "matisse goated",
  "the orange tho",
  "fauvism > everything",
  "saw this in 5th grade",
  "screensaver material",
  "look at those leaves",
]

const HISTORY_KEY = "bitsy_recognized_v1"

interface LensViewProps {
  onClose: () => void
  /** Called when user taps an AI question prompt — closes the lens and fires a chat message */
  onAskAI?: (question: string, artworkId: number) => void
}

export function LensView({ onClose, onAskAI }: LensViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)

  const { setArtwork } = useSelectedArtwork()

  const [facing, setFacing] = useState<"environment" | "user">("environment")
  const [danmakuOn, setDanmakuOn] = useState(true)
  const [mode, setMode] = useState<"photo" | "video">("photo")
  const [recognition, setRecognition] = useState<Recognition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exiting, setExiting] = useState(false)
  const [danmaku, setDanmaku] = useState<Danmaku[]>([])
  const [scanning, setScanning] = useState(false)
  const [commentInput, setCommentInput] = useState("")
  const [albumOpen, setAlbumOpen] = useState(false)
  const [recognizedHistory, setRecognizedHistory] = useState<RecognizedHistoryItem[]>([])

  // The HAM-resolved artwork that powers the Digital Twin overlay. Cleared
  // whenever the recognition is dropped (e.g. user re-points the camera).
  const [digitalTwin, setDigitalTwin] = useState<Artwork | null>(null)
  const [twinLoading, setTwinLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)



  // Load persisted recognition history
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      if (raw) setRecognizedHistory(JSON.parse(raw))
    } catch {
      /* ignore */
    }
  }, [])

  // Save recognition to history whenever a confident match arrives
  useEffect(() => {
    if (!recognition?.recognized || !recognition.title || !recognition.artist) return
    setRecognizedHistory((prev) => {
      const key = `${recognition.title}::${recognition.artist}`
      const filtered = prev.filter((p) => `${p.title}::${p.artist}` !== key)
      const next: RecognizedHistoryItem[] = [
        {
          ...recognition,
          id: Math.random().toString(36).slice(2),
          capturedAt: Date.now(),
        },
        ...filtered,
      ].slice(0, 50)
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [recognition?.title, recognition?.artist, recognition?.recognized])

  // Whenever a confident recognition comes in, fetch the HAM record so we can
  // overlay the Digital Twin and populate the SelectedArtworkContext for the
  // rest of the app (chat, gallery, etc.) to consume.
  useEffect(() => {
    if (!recognition?.recognized || !recognition.title) {
      setDigitalTwin(null)
      return
    }

    const title = recognition.title
    const artist = recognition.artist
    const year = recognition.year
    const key = `${title}::${artist}::${year ?? ""}`

    let cancelled = false
    setTwinLoading(true)

    // Pass year (when known) so HAM's strict q-builder can disambiguate
    // titles that recur across years — e.g. multiple "Self-Portrait" works.
    const params = new URLSearchParams({ title })
    if (artist) params.set("artist", artist)
    if (year) params.set("year", year)

    fetch(`/api/artwork?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((data: { artwork: Artwork | null } | null) => {
        if (cancelled) return
        const art = data?.artwork ?? null
        // Only commit if recognition didn't change while we were fetching.
        const stillCurrent =
          `${recognition.title}::${recognition.artist}::${recognition.year ?? ""}` === key
        if (stillCurrent) {
          setDigitalTwin(art)
          if (art) setArtwork(art)
        }
      })
      .finally(() => {
        if (!cancelled) setTwinLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [recognition?.recognized, recognition?.title, recognition?.artist, setArtwork])

  // Start / restart camera stream when facing changes
  useEffect(() => {
    let active = true

    async function start() {
      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          setError("Camera not supported in this browser")
          return
        }
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        })
        if (!active) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
        }
        setError(null)
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Camera access denied"
        setError(msg)
      }
    }

    start()

    return () => {
      active = false
    }
  }, [facing])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  // Capture a frame and return a base64 JPEG (downscaled)
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return null

    const maxW = 640
    const ratio = maxW / video.videoWidth
    canvas.width = maxW
    canvas.height = Math.round(video.videoHeight * ratio)

    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL("image/jpeg", 0.7)
  }, [])

  const recognizeImage = useCallback(async (frame: string) => {
    if (scanningRef.current) return
    scanningRef.current = true
    setScanning(true)
    try {
      const res = await fetch("/api/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: frame }),
      })
      if (res.ok) {
        const data = (await res.json()) as Recognition
        if (data.recognized && data.confidence >= 0.7 && data.title && data.artist) {
          setRecognition(data)
        } else {
          setRecognition(null)
        }
      }
    } catch (e) {
      console.log("[v0] recognize fetch error", e)
    } finally {
      scanningRef.current = false
      setScanning(false)
    }
  }, [])

  const recognize = useCallback(async () => {
    const frame = captureFrame()
    if (!frame) return
    await recognizeImage(frame)
  }, [captureFrame, recognizeImage])

  // Auto-scan periodically while camera is live (paused while album is open or
  // a digital twin is already on-screen — no need to keep scanning over it).
  useEffect(() => {
    if (error || albumOpen || digitalTwin) return
    const initial = window.setTimeout(recognize, 1500)
    const interval = window.setInterval(recognize, 5000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [recognize, error, albumOpen, digitalTwin])

  // Danmaku spawner — only when toggled on AND artwork is recognized
  useEffect(() => {
    if (!danmakuOn || !recognition?.recognized) {
      setDanmaku([])
      return
    }
    const interval = window.setInterval(() => {
      setDanmaku((prev) => {
        const next = prev.length > 4 ? prev.slice(1) : [...prev]
        next.push({
          id: Math.random().toString(36).slice(2),
          text: DANMAKU_PHRASES[Math.floor(Math.random() * DANMAKU_PHRASES.length)],
          top: 12 + Math.random() * 50,
          duration: 9 + Math.random() * 4,
        })
        return next
      })
    }, 2200)
    return () => window.clearInterval(interval)
  }, [danmakuOn, recognition?.recognized])

  function handleBack() {
    setExiting(true)
    window.setTimeout(onClose, 380)
  }

  function switchCamera() {
    setFacing((f) => (f === "environment" ? "user" : "environment"))
    setRecognition(null)
    setDigitalTwin(null)
  }

  function clearTwin() {
    setRecognition(null)
    setDigitalTwin(null)
  }

  function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault()
    const text = commentInput.trim()
    if (!text || !recognition?.recognized) return
    setDanmaku((prev) => [
      ...prev.slice(-4),
      {
        id: Math.random().toString(36).slice(2),
        text,
        top: 18 + Math.random() * 40,
        duration: 9 + Math.random() * 3,
        userAuthored: true,
      },
    ])
    setCommentInput("")
  }

  // From the album: a user-picked artwork manually applies recognition.
  // This triggers the same digital-twin fetch + auto-dismiss flow as camera recognition.
  function handleSelectFromAlbum(rec: Recognition) {
    setRecognition(rec)
  }

  // From the album: a user-picked local image runs through the recognizer
  async function handleLocalImage(dataUrl: string) {
    await recognizeImage(dataUrl)
  }

  const showCommentInput = danmakuOn

  // Display title/artist: prefer the resolved HAM record (cleaner formatting)
  // and fall back to the recognition payload while loading.
  const displayTitle = digitalTwin?.title || recognition?.title || ""
  const displayArtist = digitalTwin?.artist || recognition?.artist || ""
  const displayYear = recognition?.year || ""

  // Soft error state — Bitsy recognized the painting from the camera but the
  // HAM lookup didn't return a record for it. We still show the recognition
  // metadata so the user knows what was identified, but add a gentle "still
  // learning" note in place of the digital-twin overlay.
  const twinMissing = !!recognition?.recognized && !twinLoading && !digitalTwin

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 overflow-hidden bg-foreground",
        exiting ? "animate-lens-exit" : "animate-lens-enter",
      )}
      role="dialog"
      aria-label="Camera lens"
    >
      {/* Live camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn("absolute inset-0 h-full w-full object-cover", facing === "user" && "scale-x-[-1]")}
      />
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* Cool lens aura overlay (10% opacity) */}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-screen"
        style={{
          opacity: 0.1,
          background:
            "radial-gradient(60% 60% at 20% 10%, #a8d5d0 0%, transparent 60%), radial-gradient(70% 70% at 90% 90%, #b8c8d8 0%, transparent 60%)",
        }}
      />
      {/* Subtle dark vignette so UI reads well over any camera feed */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(26,26,31,0.45) 0%, rgba(26,26,31,0) 18%, rgba(26,26,31,0) 70%, rgba(26,26,31,0.55) 100%)",
        }}
      />

      {/*
        Digital Twin — a full-screen view that takes over the lens when the
        HAM lookup succeeds. The user stays here until they press × (which
        returns to the live camera), or press the back chevron (which closes
        the entire lens). The twin is NOT auto-dismissed.
      */}
      <AnimatePresence>
        {digitalTwin?.primaryimageurl && (
          <motion.div
            key={digitalTwin.id}
            className="absolute inset-0 z-20 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-foreground/92" />

            {/* High-res image — click to collapse drawer if open */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={digitalTwin.primaryimageurl}
              alt={`${digitalTwin.title} by ${digitalTwin.artist}`}
              className="absolute inset-0 h-full w-full object-contain"
              draggable={false}
              onClick={() => drawerOpen && setDrawerOpen(false)}
            />

            {/* Subtle gold restoration glow */}
            <div
              className="pointer-events-none absolute inset-0 mix-blend-overlay"
              style={{
                background:
                  "radial-gradient(70% 70% at 50% 50%, transparent 60%, rgba(255, 220, 160, 0.18) 100%)",
              }}
            />

            {/* Top bar: Danmaku input + controls — highest z-index, glassmorphism */}
            <div
              className="absolute inset-x-0 top-0 z-30 flex items-center gap-3 px-5 pt-5 pb-3"
              style={{
                background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)",
              }}
            >
              {/* Close button */}
              <button
                type="button"
                aria-label="Close artwork view, return to camera"
                onClick={clearTwin}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 font-mono text-[18px] leading-none text-white/80 backdrop-blur-xl transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                ×
              </button>

              {/* Danmaku input — glassmorphic, expands to fill */}
              <ArtworkComments artworkId={digitalTwin.id} inputOnly />
            </div>

            {/* Danmaku floating layer — fills the space between top bar and bottom panel */}
            <div className="absolute inset-x-0 top-[80px] bottom-[140px] z-10 overflow-hidden px-5">
              <ArtworkComments artworkId={digitalTwin.id} floatingOnly />
            </div>

            {/* Bottom panel: title + collapsible action drawer */}
            <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-0 px-5">
              {/* Animated questions drawer */}
              <AnimatePresence>
                {drawerOpen && (
                  <motion.div
                    className="mb-2.5 flex flex-col gap-2.5 overflow-hidden"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    {[
                      `What makes "${digitalTwin.title}" by ${digitalTwin.artist} significant in art history?`,
                      `If I were standing in front of "${digitalTwin.title}", what details should I look for first?`,
                    ].map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => {
                          onAskAI?.(question, digitalTwin.id)
                        }}
                        className="group flex items-center gap-3 rounded-xl border border-white/18 bg-black/35 px-4 py-3 text-left backdrop-blur-xl transition-colors hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                        style={{ boxShadow: "0 8px 20px -10px rgba(0,0,0,0.5)" }}
                      >
                        <span className="flex-1 font-mono text-[12px] leading-relaxed text-white/80 group-hover:text-white">
                          {question}
                        </span>
                        <span
                          aria-hidden="true"
                          className="shrink-0 font-mono text-[13px] text-white/35 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60"
                        >
                          →
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Title / artist label with expand button */}
              <div
                className="rounded-2xl border border-white/20 bg-black/40 px-5 py-3 text-left backdrop-blur-2xl transition-all duration-300"
                style={{ boxShadow: "0 18px 40px -16px rgba(0,0,0,0.55)" }}
                onClick={() => setDrawerOpen(!drawerOpen)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setDrawerOpen(!drawerOpen)
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
                      now viewing
                    </p>
                    <p className="font-mono text-[14px] leading-tight text-white">
                      {digitalTwin.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-white/70">
                      {digitalTwin.artist}
                      {displayYear ? ` · ${displayYear}` : ""}
                    </p>
                  </div>
                  <motion.button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDrawerOpen(!drawerOpen)
                    }}
                    className="mt-1 shrink-0 rounded-full p-1.5 text-white/60 hover:text-white transition-colors"
                    aria-label={drawerOpen ? "Collapse questions" : "Expand questions"}
                    aria-expanded={drawerOpen}
                    animate={{ rotate: drawerOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
                  </motion.button>
                </div>
              </div>

              <div className="h-2" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan reticle (subtle, only when nothing recognized yet) */}
      {!recognition?.recognized && !error && !digitalTwin && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "h-56 w-44 rounded-2xl border border-white/30",
              scanning ? "animate-scan-pulse" : "opacity-25",
            )}
          />
        </div>
      )}

      {/*
        Glassmorphic "restoring…" / "still learning…" label — shown while the
        HAM lookup is in flight, or when it returns no record. Hidden once the
        digital twin is available (the twin overlay takes over from here).
      */}
      <AnimatePresence>
        {recognition?.recognized && displayTitle && displayArtist && !digitalTwin && (
          <motion.div
            key={`${displayTitle}-${displayArtist}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="absolute inset-x-0 bottom-36 z-10 flex justify-center px-6"
          >
            <div
              className="max-w-[88%] rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-left backdrop-blur-2xl"
              style={{ boxShadow: "0 18px 40px -16px rgba(0,0,0,0.55)" }}
            >
              <p className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
                {twinLoading ? "restoring" : twinMissing ? "still learning" : "now viewing"}
              </p>
              <p className="font-mono text-[14px] leading-tight text-white">
                {displayTitle}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-white/70">
                {displayArtist}
                {displayYear ? ` · ${displayYear}` : ""}
              </p>
              {twinMissing && (
                <p className="mt-1.5 font-mono text-[10.5px] font-light italic leading-relaxed text-white/55">
                  Bitsy is still learning about this piece…
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom tray */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-6 pt-2">
        <div
          className="rounded-[28px] border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-2xl"
          style={{ boxShadow: "0 -10px 40px -10px rgba(0,0,0,0.4)" }}
        >
          <div className="flex items-center justify-between">
            {/* Album — blurred Van Gogh thumbnail preview */}
            <button
              type="button"
              onClick={() => setAlbumOpen(true)}
              aria-label="Open album"
              className="relative h-11 w-11 overflow-hidden rounded-xl border-[1.5px] border-white/70 transition-colors hover:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg"
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover"
                style={{ filter: "blur(3px)", transform: "scale(1.12)" }}
                draggable={false}
              />
              {/* subtle vignette overlay */}
              <div className="absolute inset-0 bg-black/20" />
            </button>

            {/* Shutter + photo|video caption */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={recognize}
                aria-label="Capture and recognize"
                className={cn(
                  "h-16 w-16 rounded-full border border-white/40 bg-white",
                  "transition-all duration-150 active:scale-95",
                )}
                style={{
                  boxShadow:
                    "6px 6px 14px rgba(0,0,0,0.35), -3px -3px 10px rgba(255,255,255,0.15), inset 0 0 0 4px rgba(26,26,31,0.06)",
                }}
              />
              <div className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-white/85">
                <button
                  type="button"
                  onClick={() => setMode("photo")}
                  className={cn(
                    "transition-colors focus-visible:outline-none",
                    mode === "photo" ? "text-white" : "text-white/45",
                  )}
                  aria-pressed={mode === "photo"}
                >
                  photo
                </button>
                <span className="text-white/30">|</span>
                <button
                  type="button"
                  onClick={() => setMode("video")}
                  className={cn(
                    "transition-colors focus-visible:outline-none",
                    mode === "video" ? "text-white" : "text-white/45",
                  )}
                  aria-pressed={mode === "video"}
                >
                  video
                </button>
              </div>
            </div>

            {/* Switch + Forward */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={switchCamera}
                aria-label="Switch camera"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <RotateCcw className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleBack}
                aria-label="Back to home"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-foreground transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Album sheet */}
      <AlbumSheet
        open={albumOpen}
        onClose={() => setAlbumOpen(false)}
        recognizedHistory={recognizedHistory}
        onSelectArtwork={handleSelectFromAlbum}
        onPickLocalImage={handleLocalImage}
      />

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-foreground/85 px-8 text-center">
          <div className="max-w-xs">
            <p className="font-mono text-sm text-white">Camera unavailable</p>
            <p className="mt-2 font-mono text-xs text-white/60 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={handleBack}
              className="mt-6 rounded-full border border-white/40 px-5 py-2 font-mono text-xs text-white/90 transition-colors hover:bg-white/10"
            >
              back to home
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
