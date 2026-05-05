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
import { GalleryView } from "@/components/gallery-view"
import { MakerQuiz } from "@/components/maker-quiz"
import { HomeAlbumView } from "@/components/home-album-view"
import { deriveSessionTitle, upsertSession, type ChatSession } from "@/lib/storage"
import { useSelectedArtwork, type Artwork } from "@/contexts/selected-artwork-context"
import { findDefaultAnswer, getScriptedBranch } from "@/lib/artwork-default-answers"
import type { UIMessage } from "ai"

export interface SavedDrawing {
  id: string
  dataUrl: string
  note?: string
  createdAt: number
}

export default function HomePage() {
  const [input, setInput] = useState("")
  const [lensOpen, setLensOpen] = useState(false)
  const [albumOpen, setAlbumOpen] = useState(false)
  const [canvasOpen, setCanvasOpen] = useState(false)
  const [canvasStartWithReference, setCanvasStartWithReference] = useState(false)
  const [drawings, setDrawings] = useState<SavedDrawing[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeView, setActiveView] = useState<MenuDestination | null>(null)
  // System-generated messages for default artwork Q&A (no API call)
  const [syntheticMessages, setSyntheticMessages] = useState<UIMessage[]>([])
  // Follow-up questions to show below the last assistant message
  const [pendingFollowUps, setPendingFollowUps] = useState<[string, string] | null>(null)
  // Current artwork ID for follow-up context
  const [currentArtworkId, setCurrentArtworkId] = useState<number | null>(null)
  // Scripted branch tracking — when in a scripted flow, this stores step index and branch
  const [scriptedFlow, setScriptedFlow] = useState<{
    objectid: number
    stepIndex: number
    triggerQuestion: string
  } | null>(null)
  // Visual cue for canvas: pulses when scripted flow completes
  const [canvasReadyCue, setCanvasReadyCue] = useState(false)
  const { selectedArtwork, setSelectedArtwork } = useSelectedArtwork()
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

  // Advance the scripted flow by one step. The user's input becomes a user
  // bubble, and the next preset response becomes Bitsy's reply. No LLM call.
  // Returns true if the flow handled the input, false if the caller should
  // fall through to a normal AI message.
  const advanceScriptedFlow = (userText: string): boolean => {
    if (!scriptedFlow) return false

    const branch = getScriptedBranch(scriptedFlow.triggerQuestion, scriptedFlow.objectid)
    if (!branch) {
      // Branch lookup failed — exit scripted mode and let caller handle.
      setScriptedFlow(null)
      return false
    }

    const nextStepIndex = scriptedFlow.stepIndex + 1
    if (nextStepIndex >= branch.steps.length) {
      // Already past the last scripted step (the final reward step is fired
      // explicitly by handleCanvasClose, not by typing). Exit scripted mode
      // so subsequent typing goes to the AI normally.
      setScriptedFlow(null)
      return false
    }

    const nextStep = branch.steps[nextStepIndex]

    // The current step (BEFORE advancing) had canvasAction. The user is
    // expected to click the canvas CTA, not type. If they type instead, we
    // still gracefully advance to the canvas — but this branch normally
    // shouldn't fire because step 3 is the canvasAction step and step 4 is
    // only triggered post-canvas-submit.
    const userMsg: UIMessage = {
      id: `synth_user_${Date.now()}`,
      role: "user",
      parts: [{ type: "text", text: userText }],
      createdAt: new Date(),
    }
    const assistantMsg: UIMessage = {
      id: `synth_assistant_${Date.now() + 1}`,
      role: "assistant",
      parts: [{ type: "text", text: nextStep.response }],
      createdAt: new Date(),
    }

    setSyntheticMessages((prev) => [...prev, userMsg, assistantMsg])
    setScriptedFlow({ ...scriptedFlow, stepIndex: nextStepIndex })
    setPendingFollowUps(null)
    return true
  }

  const handleSubmit = () => {
    const text = input.trim()
    if (!text) return
    setInput("")

    // If we're in a scripted flow, ANY user input advances the preset
    // narrative — no API call to Gemini. The flow only exits when the user
    // explicitly leaves it (canvas submission resolves the final step, or
    // the script runs out of preset responses).
    if (advanceScriptedFlow(text)) return

    sendMessage({ text })
  }

  // Handle follow-up question clicks (legacy follow-up chips for non-scripted
  // default-answer artworks). For scripted flows we route through the same
  // scripted advancer so typing or clicking a chip behaves identically.
  const handleAskQuestion = (question: string) => {
    if (advanceScriptedFlow(question)) return
    sendMessage({ text: question })
  }

  const hasConversation = messages.length > 0 || syntheticMessages.length > 0 || drawings.length > 0

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
    setCanvasReadyCue(false)
  }

  const handleCanvasClose = (saved?: { dataUrl: string; note?: string }) => {
    setCanvasOpen(false)
    setCanvasStartWithReference(false)
    setCanvasReadyCue(false)
    if (!saved) return

    // In scripted flows the user's raw sketch is NOT shown as a thumbnail
    // in the chat — the pre-generated hand-and-flower reward image stands
    // in for it. Outside scripted mode we still surface the sketch.
    const isScriptedCanvasStep = (() => {
      if (!scriptedFlow) return false
      const branch = getScriptedBranch(scriptedFlow.triggerQuestion, scriptedFlow.objectid)
      return Boolean(branch?.steps[scriptedFlow.stepIndex]?.canvasAction)
    })()

    if (!isScriptedCanvasStep) {
      const drawing: SavedDrawing = {
        id: `dwg_${Date.now()}`,
        dataUrl: saved.dataUrl,
        note: saved.note,
        createdAt: Date.now(),
      }
      setDrawings((prev) => [...prev, drawing])
    }

    // Scripted flow — strictly NO Gemini/LLM calls. The user's "I just made
    // a creative addition…" message is injected as a synthetic user bubble,
    // then after a 5-second simulated thinking pause Bitsy delivers two
    // pre-baked replies in chronological order: (1) the hand-and-flower
    // reward image, (2) the hard-coded evaluation text.
    if (scriptedFlow) {
      const branch = getScriptedBranch(scriptedFlow.triggerQuestion, scriptedFlow.objectid)
      if (branch) {
        const currentStep = branch.steps[scriptedFlow.stepIndex]
        if (currentStep?.canvasAction) {
          // 1) Synthetic user bubble — exact text per spec when no note is
          //    provided. We do NOT call sendMessage(), so no API request.
          const userBubbleText =
            saved.note?.trim() || "I just made a creative addition to the artwork."
          const userMsg: UIMessage = {
            id: `synth_user_${Date.now()}`,
            role: "user",
            parts: [{ type: "text", text: userBubbleText }],
            createdAt: new Date(),
          }
          setSyntheticMessages((prev) => [...prev, userMsg])

          // 2) Five-second thinking pause, then deliver the pre-generated
          //    reward image + evaluation as two sequential Bitsy bubbles.
          //    The longer pause gives the user a beat to admire their drawing
          //    before Bitsy responds to their gesture.
          setTimeout(() => {
            const nextStepIndex = scriptedFlow.stepIndex + 1
            if (nextStepIndex < branch.steps.length) {
              const finalStep = branch.steps[nextStepIndex]
              if (finalStep?.finalReward) {
                const baseTs = Date.now()
                // Image bubble — uses the [scripted_image:URL] marker so the
                // chat parser renders it as an inline figure (zero API calls).
                const imageMsg: UIMessage = {
                  id: `synth_image_${baseTs}`,
                  role: "assistant",
                  parts: [
                    {
                      type: "text",
                      text: `[scripted_image:${finalStep.finalReward.imageUrl}]`,
                    },
                  ],
                  createdAt: new Date(baseTs),
                }
                // Evaluation bubble — separate, hard-coded text reply.
                const evalMsg: UIMessage = {
                  id: `synth_eval_${baseTs + 1}`,
                  role: "assistant",
                  parts: [
                    { type: "text", text: finalStep.finalReward.evaluation },
                  ],
                  createdAt: new Date(baseTs + 1),
                }
                setSyntheticMessages((prev) => [...prev, imageMsg, evalMsg])
                setScriptedFlow(null)
                setPendingFollowUps(null)
              }
            }
          }, 5000)

          return
        }
      }
    }
    
    // Normal canvas submission (not in scripted flow)
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
                className="flex flex-1 flex-col overflow-hidden min-h-0"
              >
                {hasConversation ? (
                  <ChatThread
                    messages={[...syntheticMessages, ...messages]}
                    status={status}
                    drawings={drawings}
                    error={error}
                    followUpQuestions={pendingFollowUps}
                    onAsk={(question) => {
                      // First check: are we in a scripted flow?
                      if (scriptedFlow) {
                        handleAskQuestion(question)
                        return
                      }
                      
                      // Second check: is this a follow-up to a default answer?
                      if (currentArtworkId) {
                        const defaultQA = findDefaultAnswer(question, currentArtworkId)
                        if (defaultQA) {
                          const userMsg: UIMessage = {
                            id: `synth_user_${Date.now()}`,
                            role: "user",
                            parts: [{ type: "text", text: question }],
                            createdAt: new Date(),
                          }
                          const assistantMsg: UIMessage = {
                            id: `synth_assistant_${Date.now()}`,
                            role: "assistant",
                            parts: [{ type: "text", text: defaultQA.answer }],
                            createdAt: new Date(),
                          }
                          setSyntheticMessages((prev) => [...prev, userMsg, assistantMsg])
                          setPendingFollowUps(defaultQA.followUps)
                          return
                        }
                      }
                      // No default or scripted — call the AI
                      sendMessage({ text: question })
                      setPendingFollowUps(null)
                    }}
                    onEditOnArtwork={handleEditOnArtwork}
                    showCanvasCue={(() => {
                      // Inline derivation: when the current scripted step is
                      // marked as `canvasAction`, render the inline CTA
                      // beneath Bitsy's last reply.
                      if (!scriptedFlow) return false
                      const branch = getScriptedBranch(
                        scriptedFlow.triggerQuestion,
                        scriptedFlow.objectid,
                      )
                      return Boolean(branch?.steps[scriptedFlow.stepIndex]?.canvasAction)
                    })()}
                    onCanvas={() => {
                      if (selectedArtwork) {
                        setCanvasStartWithReference(true)
                      }
                      setCanvasOpen(true)
                      setCanvasReadyCue(false)
                    }}
                  />
                ) : (
                  <BitsyCard onAsk={(question) => sendMessage({ text: question })} />
                )}
                <InteractionBar
                  input={input}
                  onInputChange={setInput}
                  onSubmit={handleSubmit}
                  onCamera={() => setLensOpen(true)}
                  onAlbum={() => setAlbumOpen(true)}
                  onCanvas={() => {
                    if (selectedArtwork) {
                      setCanvasStartWithReference(true)
                    }
                    setCanvasOpen(true)
                    setCanvasReadyCue(false)
                  }}
                  status={status}
                  canvasReadyCue={canvasReadyCue}
                />
              </motion.section>
            )}
          </AnimatePresence>
        </main>

        {/* Overlays — all use `fixed inset-0`, but the frame's transform
            containing block clips them inside the phone shape on desktop. */}
        {lensOpen && (
          <LensView
            onClose={() => setLensOpen(false)}
            onAskAI={(question, artworkId) => {
              setLensOpen(false)
              
              // Check for scripted branch first (hard-coded guided experience)
              const scriptedBranch = getScriptedBranch(question, artworkId)
              if (scriptedBranch) {
                setScriptedFlow({
                  objectid: artworkId,
                  stepIndex: 0,
                  triggerQuestion: question,
                })
                // Inject the initial question and first scripted response
                const userMsg: UIMessage = {
                  id: `synth_user_${Date.now()}`,
                  role: "user",
                  parts: [{ type: "text", text: question }],
                  createdAt: new Date(),
                }
                const assistantMsg: UIMessage = {
                  id: `synth_assistant_${Date.now()}`,
                  role: "assistant",
                  parts: [{ type: "text", text: scriptedBranch.steps[0].response }],
                  createdAt: new Date(),
                }
                setSyntheticMessages((prev) => [...prev, userMsg, assistantMsg])
                // Wait for the user to type ANYTHING in the chat box; the
                // next scripted response fires from advanceScriptedFlow().
                setPendingFollowUps(null)
                setCurrentArtworkId(artworkId)
                return
              }
              
              // Fall back to default answers (pre-written but not scripted)
              const defaultQA = findDefaultAnswer(question, artworkId)
              if (defaultQA) {
                // Inject synthetic user + assistant messages (no API call)
                const userMsg: UIMessage = {
                  id: `synth_user_${Date.now()}`,
                  role: "user",
                  parts: [{ type: "text", text: question }],
                  createdAt: new Date(),
                }
                const assistantMsg: UIMessage = {
                  id: `synth_assistant_${Date.now()}`,
                  role: "assistant",
                  parts: [{ type: "text", text: defaultQA.answer }],
                  createdAt: new Date(),
                }
                setSyntheticMessages((prev) => [...prev, userMsg, assistantMsg])
                setPendingFollowUps(defaultQA.followUps)
                setCurrentArtworkId(artworkId)
              } else {
                // No default — call the AI
                sendMessage({ text: question })
                setPendingFollowUps(null)
                setCurrentArtworkId(null)
              }
            }}
          />
        )}

        <HomeAlbumView
          open={albumOpen}
          onClose={() => setAlbumOpen(false)}
          onSelect={(curated, artwork) => {
            // Set the selected artwork so the chat thread (and later canvas)
            // know which work the user is engaging with. We prefer the
            // resolved HAM Artwork; if that's null we still fall back to
            // a synthetic record built from the curated registry so the
            // chat thread's ArtworkCard can render an image.
            const fallbackArtwork: Artwork =
              artwork ?? {
                id: curated.objectid,
                title: curated.title,
                artist: curated.artist,
                primaryimageurl: curated.fallbackImageUrl ?? "",
                commentary: "",
                colors: [],
                medium: "",
              }
            setSelectedArtwork(fallbackArtwork)
            setCurrentArtworkId(curated.objectid)

            // Synthesize the same first question Lens uses so the existing
            // default-answer registry can supply Bitsy's response without
            // an API call. This keeps the album → chat flow consistent
            // with the lens → chat flow.
            const question = `What makes "${curated.title}" by ${curated.artist} significant in art history?`
            const defaultQA = findDefaultAnswer(question, curated.objectid)

            const userMsg: UIMessage = {
              id: `synth_user_${Date.now()}`,
              role: "user",
              parts: [{ type: "text", text: question }],
              createdAt: new Date(),
            }
            if (defaultQA) {
              const assistantMsg: UIMessage = {
                id: `synth_assistant_${Date.now()}`,
                role: "assistant",
                parts: [{ type: "text", text: defaultQA.answer }],
                createdAt: new Date(),
              }
              setSyntheticMessages((prev) => [...prev, userMsg, assistantMsg])
              setPendingFollowUps(defaultQA.followUps)
            } else {
              // No pre-baked answer for this work — fall back to the AI.
              setSyntheticMessages((prev) => [...prev, userMsg])
              setPendingFollowUps(null)
              sendMessage({ text: question })
            }
            setAlbumOpen(false)
          }}
        />

        <MenuDrawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          activeSessionId={sessionIdRef.current}
          onNavigate={(dest) => {
            if (dest === "new-chat") {
              // Reset session refs so the next message starts a fresh conversation.
              // The useChat hook is stateful so we reload the page to clear messages.
              sessionIdRef.current = null
              sessionStartedRef.current = null
              window.location.reload()
            } else if (dest === "lens") {
              setLensOpen(true)
            } else {
              setActiveView(dest)
            }
          }}
        />

        {activeView === "profile" && (
          <ProfileView onClose={() => setActiveView(null)} drawingsCount={drawings.length} />
        )}
        {activeView === "gallery" && (
          <GalleryView onClose={() => setActiveView(null)} drawings={drawings} />
        )}
        {activeView === "quiz" && (
          <MakerQuiz
            onComplete={() => {
              setActiveView(null)
              setLensOpen(true)
            }}
            onBack={() => setActiveView(null)}
          />
        )}
      </div>
    </div>
  )
}
