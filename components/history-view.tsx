"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, MessageSquare, Trash2 } from "lucide-react"
import { AuraBackground } from "@/components/aura-background"
import { getMessageText, loadSessions, saveSessions, type ChatSession } from "@/lib/storage"

interface HistoryViewProps {
  onClose: () => void
  /** Currently active session id, used to highlight the live conversation. */
  activeSessionId: string | null
}

export function HistoryView({ onClose, activeSessionId }: HistoryViewProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    setSessions(loadSessions())
  }, [])

  const sorted = useMemo(() => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt), [sessions])
  const openSession = openId ? sessions.find((s) => s.id === openId) ?? null : null

  const handleDelete = (id: string) => {
    const next = sessions.filter((s) => s.id !== id)
    setSessions(next)
    saveSessions(next)
    if (openId === id) setOpenId(null)
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-background">
      <AuraBackground />

      <header className="relative flex items-center justify-between px-4 pt-6 sm:px-8 md:px-12">
        <button
          type="button"
          onClick={() => (openSession ? setOpenId(null) : onClose())}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.25} aria-hidden="true" />
        </button>
        <h1 className="font-mono text-[12px] uppercase tracking-[0.28em] text-foreground/55">
          {openSession ? "Conversation" : "Chat history"}
        </h1>
        <span className="h-10 w-10" aria-hidden="true" />
      </header>

      {openSession ? (
        <SessionDetail session={openSession} />
      ) : (
        <main className="relative flex-1 overflow-y-auto px-4 pb-12 pt-4 sm:px-8 md:px-12">
          {sorted.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="mx-auto flex w-full max-w-md flex-col gap-3 md:max-w-lg lg:max-w-2xl">
              {sorted.map((s) => (
                <li key={s.id}>
                  <SessionRow
                    session={s}
                    isActive={s.id === activeSessionId}
                    onOpen={() => setOpenId(s.id)}
                    onDelete={() => handleDelete(s.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </main>
      )}
    </div>
  )
}

function SessionRow({
  session,
  isActive,
  onOpen,
  onDelete,
}: {
  session: ChatSession
  isActive: boolean
  onOpen: () => void
  onDelete: () => void
}) {
  const lastMsg = [...session.messages].reverse().find((m) => getMessageText(m).length > 0)
  const preview = lastMsg ? getMessageText(lastMsg) : "New conversation"
  const date = new Date(session.updatedAt)
  const dateLabel = date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  const timeLabel = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })

  return (
    <div
      className="group flex items-stretch gap-2 rounded-2xl"
      style={{
        backgroundColor: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        border: "0.5px solid rgba(26,26,31,0.1)",
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 items-center gap-4 rounded-2xl px-4 py-4 text-left transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground/70"
          style={{ border: "0.5px solid rgba(26,26,31,0.12)" }}
          aria-hidden="true"
        >
          <MessageSquare className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-mono text-[14px] font-normal text-foreground">{session.title}</span>
            {isActive && (
              <span className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-foreground/55" style={{ border: "0.5px solid rgba(26,26,31,0.18)" }}>
                live
              </span>
            )}
          </span>
          <span className="truncate font-mono text-[11px] font-light text-foreground/55">{preview}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/40">
            {dateLabel} · {timeLabel} · {session.messages.length} msg
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${session.title}`}
        className="flex w-12 shrink-0 items-center justify-center rounded-2xl text-foreground/40 opacity-0 transition-opacity hover:text-foreground/80 focus:opacity-100 group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  )
}

function SessionDetail({ session }: { session: ChatSession }) {
  return (
    <main className="relative flex-1 overflow-y-auto px-4 pb-12 pt-4 sm:px-8 md:px-12">
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 md:max-w-lg lg:max-w-2xl">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">{session.title}</p>
        {session.messages.map((m) => {
          const text = getMessageText(m)
          if (!text) return null
          const isUser = m.role === "user"
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[85%] rounded-2xl px-4 py-3"
                style={
                  isUser
                    ? {
                        backgroundColor: "rgba(170,196,176,0.28)",
                        border: "0.5px solid rgba(26,26,31,0.1)",
                      }
                    : {
                        backgroundColor: "rgba(255,255,255,0.55)",
                        backdropFilter: "blur(16px) saturate(140%)",
                        WebkitBackdropFilter: "blur(16px) saturate(140%)",
                        border: "0.5px solid rgba(26,26,31,0.08)",
                      }
                }
              >
                <p className="whitespace-pre-wrap font-mono text-[13px] font-light leading-relaxed text-foreground">
                  {text}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}

function EmptyState() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 pt-24 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full text-foreground/55"
        style={{ border: "0.75px solid rgba(26,26,31,0.14)" }}
        aria-hidden="true"
      >
        <MessageSquare className="h-5 w-5" strokeWidth={1.25} />
      </span>
      <p className="font-mono text-[14px] font-normal text-foreground">No conversations yet</p>
      <p className="font-mono text-[11px] font-light leading-relaxed text-foreground/55">
        Start a chat with Bitsy on the home screen and your conversations will appear here.
      </p>
    </div>
  )
}
