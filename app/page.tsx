"use client"

import { useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { AuraBackground } from "@/components/aura-background"
import { TopBar } from "@/components/top-bar"
import { BitsyCard } from "@/components/bitsy-card"
import { ChatThread } from "@/components/chat-thread"
import { ChatSnippet } from "@/components/chat-snippet"
import { InteractionBar } from "@/components/interaction-bar"
import { LensView } from "@/components/lens-view"
import { CanvasView } from "@/components/canvas-view"

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
  const [drawings, setDrawings] = useState<SavedDrawing[]>([])
  const lastTriggeredMessageIdRef = useRef<string | null>(null)
  const canvasCloseRef = useRef<(() => void) | null>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })

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

  const handleCanvasClose = (saved?: { dataUrl: string; note?: string }) => {
    setCanvasOpen(false)
    if (!saved) return
    const drawing: SavedDrawing = {
      id: `dwg_${Date.now()}`,
      dataUrl: saved.dataUrl,
      note: saved.note,
      createdAt: Date.now(),
    }
    setDrawings((prev) => [...prev, drawing])
    sendMessage({
      text: saved.note ? `I just made a quick sketch — ${saved.note}` : "I just made a quick sketch. What do you see in it?",
    })
  }

  return (
    <>
      <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col md:max-w-lg lg:max-w-2xl">
        <AuraBackground />

        <TopBar onBack={canvasOpen ? () => canvasCloseRef.current?.() : undefined} />

        {canvasOpen ? (
          <>
            <ChatSnippet messages={messages} />
            <CanvasView prompt={canvasPrompt} onClose={handleCanvasClose} closeRef={canvasCloseRef} />
          </>
        ) : (
          <>
            {hasConversation ? (
              <ChatThread messages={messages} status={status} drawings={drawings} />
            ) : (
              <BitsyCard />
            )}
            <InteractionBar
              input={input}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              onCamera={() => setLensOpen(true)}
              onCanvas={() => setCanvasOpen(true)}
              status={status}
            />
          </>
        )}
      </main>
      {lensOpen && <LensView onClose={() => setLensOpen(false)} />}
    </>
  )
}
