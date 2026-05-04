"use client"

import { useEffect, useMemo, useState } from "react"
import { ImageIcon, MessageSquare, PenLine, Trash2, X } from "lucide-react"
import { getMessageText, loadProfile, loadSessions, saveSessions, type ChatSession, type UserProfile } from "@/lib/storage"

export type MenuDestination = "profile" | "gallery" | "new-chat"

interface MenuDrawerProps {
  open: boolean
  onClose: () => void
  onNavigate: (dest: MenuDestination) => void
  /** Currently active session id, used to show a "live" badge. */
  activeSessionId?: string | null
  /** Called when user taps a past session row — loads that conversation. */
  onOpenSession?: (session: ChatSession) => void
}

export function MenuDrawer({ open, onClose, onNavigate, activeSessionId, onOpenSession }: MenuDrawerProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setProfile(loadProfile())
      setSessions(loadSessions())
    }
  }, [open])

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions],
  )

  if (!open && !closing) return null

  const handleClose = () => {
    setClosing(true)
    window.setTimeout(() => {
      setClosing(false)
      onClose()
    }, 220)
  }

  const handleNav = (dest: MenuDestination) => {
    onNavigate(dest)
    handleClose()
  }

  const handleOpenSession = (session: ChatSession) => {
    onOpenSession?.(session)
    handleClose()
  }

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = sessions.filter((s) => s.id !== id)
    setSessions(next)
    saveSessions(next)
  }

  const initial = (profile?.displayName?.[0] ?? "B").toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Main menu">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={handleClose}
        className={`absolute inset-0 bg-foreground/15 backdrop-blur-[2px] transition-opacity duration-200 ${
          closing ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Panel */}
      <aside
        className={`relative flex h-full w-[85%] max-w-sm flex-col overflow-hidden ${
          closing ? "animate-drawer-exit" : "animate-drawer-enter"
        }`}
        style={{
          backgroundColor: "rgba(248,249,250,0.82)",
          backdropFilter: "blur(40px) saturate(140%)",
          WebkitBackdropFilter: "blur(40px) saturate(140%)",
          borderRight: "0.75px solid rgba(26,26,31,0.14)",
          boxShadow: "20px 0 60px -20px rgba(60,70,90,0.18)",
        }}
      >
        {/* Depth blob */}
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(170,196,176,0.35) 0%, rgba(170,196,176,0) 70%)",
          }}
          aria-hidden="true"
        />

        {/* Close button */}
        <div className="relative flex shrink-0 items-center justify-end px-4 pt-6">
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        {/* Avatar → profile */}
        <button
          type="button"
          onClick={() => handleNav("profile")}
          className="relative mx-5 mt-3 flex shrink-0 items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-foreground"
            style={{
              background: "linear-gradient(135deg, rgba(170,196,176,0.55), rgba(212,166,156,0.55))",
              border: "0.75px solid rgba(26,26,31,0.14)",
            }}
            aria-hidden="true"
          >
            <span className="font-mono text-lg font-light tracking-wider">{initial}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-base font-normal text-foreground">
              {profile?.displayName ?? "Visitor"}
            </p>
            <p className="truncate font-mono text-[11px] font-light text-foreground/55">tap to edit profile</p>
          </div>
        </button>

        {/* Hairline */}
        <div className="mx-5 mt-5 h-px shrink-0 bg-foreground/10" aria-hidden="true" />

        {/* Primary actions: New Chat + Gallery */}
        <nav className="mt-3 shrink-0 flex flex-col gap-1 px-3">
          <ActionItem
            icon={<PenLine className="h-[18px] w-[18px]" strokeWidth={1.5} />}
            label="New chat"
            hint="start fresh with Bitsy"
            onClick={() => handleNav("new-chat")}
          />
          <ActionItem
            icon={<ImageIcon className="h-[18px] w-[18px]" strokeWidth={1.5} />}
            label="Gallery"
            hint="your works & community"
            onClick={() => handleNav("gallery")}
          />
        </nav>

        {/* Hairline */}
        <div className="mx-5 mt-4 shrink-0 h-px bg-foreground/10" aria-hidden="true" />

        {/* Chat history label */}
        <div className="mx-7 mt-4 shrink-0 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/40">Chat history</p>
          {sorted.length > 0 && (
            <span className="font-mono text-[10px] text-foreground/35">{sorted.length}</span>
          )}
        </div>

        {/* Inline session list — scrollable */}
        <div className="relative mt-2 min-h-0 flex-1 overflow-y-auto px-3 pb-8">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-2 pt-10 text-center">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/40"
                style={{ border: "0.5px solid rgba(26,26,31,0.12)" }}
                aria-hidden="true"
              >
                <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
              </span>
              <p className="font-mono text-[12px] font-light text-foreground/50">No conversations yet</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {sorted.map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  isActive={s.id === activeSessionId}
                  onOpen={() => handleOpenSession(s)}
                  onDelete={(e) => handleDeleteSession(s.id, e)}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}

/* ---------- Sub-components ---------- */

function ActionItem({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/75"
        style={{ border: "0.5px solid rgba(26,26,31,0.14)" }}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-mono text-[14px] font-normal text-foreground">{label}</span>
        <span className="truncate font-mono text-[10px] font-light text-foreground/50">{hint}</span>
      </span>
    </button>
  )
}

function SessionItem({
  session,
  isActive,
  onOpen,
  onDelete,
}: {
  session: ChatSession
  isActive: boolean
  onOpen: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const lastMsg = [...session.messages].reverse().find((m) => getMessageText(m).length > 0)
  const preview = lastMsg ? getMessageText(lastMsg) : "New conversation"
  const d = new Date(session.updatedAt)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const dateLabel = isToday
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" })

  return (
    <li>
      <div
        className="group flex items-stretch gap-1 rounded-xl"
        style={{
          backgroundColor: "rgba(255,255,255,0.45)",
          border: "0.5px solid rgba(26,26,31,0.08)",
        }}
      >
        <button
          type="button"
          onClick={onOpen}
          className="flex flex-1 items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MessageSquare
            className="mt-0.5 h-[15px] w-[15px] shrink-0 text-foreground/35"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-2">
              <span className="truncate font-mono text-[12.5px] font-normal leading-snug text-foreground">
                {session.title}
              </span>
              {isActive && (
                <span
                  className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.2em] text-foreground/55"
                  style={{ border: "0.5px solid rgba(26,26,31,0.18)" }}
                >
                  live
                </span>
              )}
            </span>
            <span className="truncate font-mono text-[10.5px] font-light leading-snug text-foreground/50">
              {preview}
            </span>
            <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-foreground/35 mt-0.5">
              {dateLabel} · {session.messages.length} msg
            </span>
          </span>
        </button>

        {/* Delete — visible on hover */}
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete "${session.title}"`}
          className="flex w-9 shrink-0 items-center justify-center rounded-xl text-foreground/30 opacity-0 transition-opacity hover:text-rose-500 focus:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}
