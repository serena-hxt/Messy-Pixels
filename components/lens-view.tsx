"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronRight, Menu, RotateCcw, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { AlbumSheet, type Recognition, type RecognizedHistoryItem } from "@/components/album-sheet"
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
}

export function LensView({ onClose }: LensViewProps) {
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

  // Auto-dismiss the lens view after the digital twin loads. This creates a
  // smooth "capture and reveal" flow where the recognized artwork displays
  // briefly then fades, ready for the user to interact with it in chat or canvas.

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

  // Auto-dismiss: Once the digital twin loads and displays (not still loading,
  // and has a valid artwork record), wait 2.2 seconds then smoothly close the
  // lens view. This gives the user a moment to see the revealed artwork before
  // transitioning back to chat/canvas context.
  useEffect(() => {
    if (!recognition?.recognized || !digitalTwin || twinLoading) {
      return
    }

    const timer = window.setTimeout(() => {
      setExiting(true)
      window.setTimeout(() => {
        onClose()
      }, 380) // Match the exit animation duration
    }, 2200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [recognition?.recognized, digitalTwin, twinLoading, onClose])

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
        Digital Twin overlay — when the recognized artwork resolves to a HAM
        record, fade the high-resolution image in over the camera feed using
        Framer Motion. The effect is meant to feel like the physical painting
        is being digitally restored on top of itself.
      */}
      <AnimatePresence>
        {digitalTwin?.primaryimageurl && (
          <motion.div
            key={digitalTwin.id}
            className="pointer-events-none absolute inset-0 z-[1]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden="true"
          >
            {/* Soft black backdrop so letterboxed edges feel intentional */}
            <div className="absolute inset-0 bg-foreground/85" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={digitalTwin.primaryimageurl}
              alt={`${digitalTwin.title} by ${digitalTwin.artist}`}
              className="absolute inset-0 h-full w-full object-contain"
              draggable={false}
            />
            {/* Subtle gold edge glow to suggest "restoration" finish */}
            <div
              className="absolute inset-0 mix-blend-overlay"
              style={{
                background:
                  "radial-gradient(70% 70% at 50% 50%, transparent 60%, rgba(255, 220, 160, 0.2) 100%)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Danmaku layer */}
      {danmakuOn && (
        <div className="pointer-events-none absolute inset-x-0 top-32 bottom-56 z-[2] overflow-hidden">
          {danmaku.map((d) => (
            <div
              key={d.id}
              className="absolute left-0 animate-danmaku-slide whitespace-nowrap"
              style={{ top: `${d.top}%`, animationDuration: `${d.duration}s` }}
            >
              <span
                className={cn(
                  "rounded-full px-3 py-1 font-mono text-[12px] backdrop-blur-md",
                  d.userAuthored
                    ? "border border-rose-300/50 bg-rose-300/20 text-white"
                    : "border border-white/20 bg-white/15 text-white",
                )}
              >
                {d.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Top bar: menu + ON|OFF */}
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-5">
        <button
          type="button"
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <Menu className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => setDanmakuOn((v) => !v)}
          aria-label={danmakuOn ? "Turn floating comments off" : "Turn floating comments on"}
          aria-pressed={danmakuOn}
          className="font-mono text-[13px] tracking-[0.18em] text-white/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <span className={cn("transition-colors", danmakuOn ? "text-rose-400" : "text-white/40")}>ON</span>
          <span className="mx-2 text-white/30">|</span>
          <span className={cn("transition-colors", !danmakuOn ? "text-rose-400" : "text-white/40")}>OFF</span>
        </button>
      </header>

      {/* Comment input — appears only when floating comments are ON */}
      {showCommentInput && (
        <div className="absolute inset-x-0 top-16 z-10 px-5">
          <form
            onSubmit={handleSubmitComment}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-xl"
          >
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder={
                recognition?.recognized
                  ? `Comment on ${recognition.title}��`
                  : "Spot an artwork to leave a comment…"
              }
              disabled={!recognition?.recognized}
              maxLength={80}
              aria-label="Add a comment about this artwork"
              className="flex-1 bg-transparent font-mono text-[12px] text-white placeholder:text-white/45 outline-none disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!recognition?.recognized || !commentInput.trim()}
              aria-label="Send comment"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                recognition?.recognized && commentInput.trim()
                  ? "bg-white text-foreground hover:scale-105"
                  : "bg-white/15 text-white/35",
              )}
            >
              <Send className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            </button>
          </form>
        </div>
      )}

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
        Glassmorphic title / artist label — shown whenever the artwork is
        recognized (whether or not the HAM lookup has returned). It fades in
        with a small upward translation so it feels grounded under the twin.
      */}
      <AnimatePresence>
        {recognition?.recognized && displayTitle && displayArtist && (
          <motion.div
            key={`${displayTitle}-${displayArtist}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="absolute inset-x-0 bottom-36 z-10 flex justify-center px-6"
          >
            <button
              type="button"
              onClick={clearTwin}
              aria-label="Dismiss artwork overlay"
              className="group max-w-[88%] rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-left backdrop-blur-2xl transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
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
            </button>
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
            {/* Album */}
            <button
              type="button"
              onClick={() => setAlbumOpen(true)}
              aria-label="Open album"
              className="h-11 w-11 rounded-xl border-[1.5px] border-white/70 bg-white/5 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            />

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
