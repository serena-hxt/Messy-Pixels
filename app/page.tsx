"use client"

import { useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { AnimatePresence, motion } from "framer-motion"
import { AuraBackground } from "@/components/aura-background"
import { TopBar } from "@/components/top-bar"
import { BitsyCard } from "@/components/bitsy-card"
import { ChatThread } from "@/components/chat-thread"
import { ChatSnippet } from "@/components/chat-snippet"
import { InteractionBar } from "@/components/interaction-bar"
import { LensView } from "@/components/lens-view"
import { CanvasView } from "@/components/canvas-view"
import { MenuDrawer, type MenuDestination } from "@/components/menu-drawer"
import { ProfileView } from "@/components/profile-view"
import { HistoryView } from "@/components/history-view"
import { GalleryView } from "@/components/gallery-view"
import { deriveSessionTitle, upsertSession, type ChatSession } from "@/lib/storage"
import { useSelectedArtwork, type Artwork } from "@/contexts/selected-artwork-context"

export interface SavedDrawing {
  id: string
  dataUrl: string
  note?: string
  createdAt: number
}

export default function HomePage() {
  const [input, setInput] = useState("")
  const [lensOpen, setLensOpen] = useState(false)
  const [canvasOpen, setCanvasOpen] = useState(false)
  const [canvasStartWithReference, setCanvasStartWithReference] = useState(false)
  const [drawings, setDrawings] = useState<SavedDrawing[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeView, setActiveView] = useState<MenuDestination | null>(null)
  const { setSelectedArtwork } = useSelectedArtwork()
  const lastTriggeredMessageIdRef = useRef<string | null>(null)
  const canvasCloseRef = useRef<(() => void) | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const sessionStartedRef = useRef<number | null>(null)

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })

  // Persist the active conversation to localStorage so it shows up in chat history
  useEffect(() => {
    if (messages.length === 0) return
    if (!sessionIdRef.current) {
      sessionIdRef.current = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      sessionStartedRef.current = Date.now()
    }
    const session: ChatSession = {
      id: sessionIdRef.current,
      startedAt: sessionStartedRef.current ?? Date.now(),
      updatedAt: Date.now(),
      title: deriveSessionTitle(messages),
      messages,
    }
    upsertSession(session)
  }, [messages])

  // Auto-open canvas when Bitsy emits the [draw_now] marker
  useEffect(() => {
    if (status !== "ready") return
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")
    if (!lastAssistant) return
    if (lastTriggeredMessageIdRef.current === lastAssistant.id) return
    const text =
      lastAssistant.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") ?? ""
    if (/\[draw_now\]/i.test(text)) {
      lastTriggeredMessageIdRef.current = lastAssistant.id
      setCanvasOpen(true)
    }
  }, [messages, status])

  const handleSubmit = () => {
    const text = input.trim()
    if (!text) return
    sendMessage({ text })
    setInput("")
  }

  const hasConversation = messages.length > 0 || drawings.length > 0

  const isDiscussingArtwork = messages.some((m) => {
    const text = m.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("")
      .toLowerCase()
    return text?.includes("matisse") || text?.includes("geranium")
  })

  const canvasPrompt = isDiscussingArtwork
    ? "How would you re-interpret these leaves?"
    : "Draw something that makes you feel calm"

  // When the user taps "edit on artwork" under a chat ArtworkCard, set the
  // artwork in the global context and open the canvas with the reference
  // overlay enabled. The canvas reads `selectedArtwork` from context, so we
  // just need the flag + open state here.
  const handleEditOnArtwork = (artwork: Artwork) => {
    setSelectedArtwork(artwork)
    setCanvasStartWithReference(true)
    setCanvasOpen(true)
  }

  const handleCanvasClose = (saved?: { dataUrl: string; note?: string }) => {
    setCanvasOpen(false)
    setCanvasStartWithReference(false)
    if (!saved) return
    const drawing: SavedDrawing = {
      id: `dwg_${Date.now()}`,
      dataUrl: saved.dataUrl,
      note: saved.note,
      createdAt: Date.now(),
    }
    setDrawings((prev) => [...prev, drawing])
    sendMessage({
      text: saved.note
        ? `I just made a quick sketch — ${saved.note}`
        : "I just made a quick sketch. What do you see in it?",
    })
  }

  return (
    /*
      Outer "platform" — only visible on desktop. On mobile/tablet the inner
      frame fills the viewport, so this wrapper is invisible. On desktop
      (md+) the inner frame becomes a centered phone-shaped container with
      a soft floating shadow against a muted neutral surface.
    */
    <div
      className="min-h-[100dvh] w-full bg-background md:flex md:items-center md:justify-center md:bg-[#e9ebef] md:p-6 lg:p-10"
    >
      {/*
        The phone-frame. The `transform: translateZ(0)` creates a containing
        block for `position: fixed` descendants, which keeps overlays
        (LensView, MenuDrawer, ProfileView, HistoryView, GalleryView,
        AuraBackground) clipped to this frame on desktop instead of escaping
        to the viewport. On mobile the frame just fills the screen.
      */}
      <div
        className="relative h-[100dvh] w-full overflow-hidden bg-background md:h-[860px] md:max-h-[92vh] md:w-[420px] md:rounded-[44px] lg:w-[440px]"
        style={{
          transform: "translateZ(0)",
          isolation: "isolate",
          // Soft floating shadow + 1px inner highlight only on desktop
          boxShadow:
            "var(--frame-shadow, none)",
        }}
      >
        <main className="relative flex h-full w-full flex-col">
          <AuraBackground />

          <TopBar
            onBack={canvasOpen ? () => canvasCloseRef.current?.() : undefined}
            onMenu={canvasOpen ? undefined : () => setMenuOpen(true)}
          />

          {/*
            Crossfade between Chat and Canvas modes so the SelectedArtworkContext
            transition feels seamless. AnimatePresence with mode="wait" ensures
            the outgoing view fully fades before the incoming one mounts, which
            avoids stutter from canvas resize observers.
          */}
          <AnimatePresence mode="wait" initial={false}>
            {canvasOpen ? (
              <motion.section
                key="canvas-mode"
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-1 flex-col"
              >
                <ChatSnippet messages={messages} />
                <CanvasView
                  prompt={canvasPrompt}
                  onClose={handleCanvasClose}
                  closeRef={canvasCloseRef}
                  startWithReference={canvasStartWithReference}
                />
              </motion.section>
            ) : (
              <motion.section
                key="chat-mode"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-1 flex-col"
              >
                {hasConversation ? (
                  <ChatThread
                    messages={messages}
                    status={status}
                    drawings={drawings}
                    error={error}
                    onAsk={(question) => sendMessage({ text: question })}
                    onEditOnArtwork={handleEditOnArtwork}
                  />
                ) : (
                  <BitsyCard onAsk={(question) => sendMessage({ text: question })} />
                )}
                <InteractionBar
                  input={input}
                  onInputChange={setInput}
                  onSubmit={handleSubmit}
                  onCamera={() => setLensOpen(true)}
                  onCanvas={() => setCanvasOpen(true)}
                  status={status}
                />
              </motion.section>
            )}
          </AnimatePresence>
        </main>

        {/* Overlays — all use `fixed inset-0`, but the frame's transform
            containing block clips them inside the phone shape on desktop. */}
        {lensOpen && <LensView onClose={() => setLensOpen(false)} />}

        <MenuDrawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onNavigate={(dest) => setActiveView(dest)}
        />

        {activeView === "profile" && (
          <ProfileView onClose={() => setActiveView(null)} drawingsCount={drawings.length} />
        )}
        {activeView === "history" && (
          <HistoryView onClose={() => setActiveView(null)} activeSessionId={sessionIdRef.current} />
        )}
        {activeView === "gallery" && (
          <GalleryView onClose={() => setActiveView(null)} drawings={drawings} />
        )}
      </div>
    </div>
  )
}
