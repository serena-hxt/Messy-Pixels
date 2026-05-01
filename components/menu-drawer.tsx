"use client"

import { useEffect, useState } from "react"
import { ImageIcon, MessageSquare, User2, X } from "lucide-react"
import { loadProfile, type UserProfile } from "@/lib/storage"

export type MenuDestination = "profile" | "history" | "gallery"

interface MenuDrawerProps {
  open: boolean
  onClose: () => void
  onNavigate: (dest: MenuDestination) => void
}

export function MenuDrawer({ open, onClose, onNavigate }: MenuDrawerProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) setProfile(loadProfile())
  }, [open])

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
        className={`relative h-full w-[85%] max-w-sm overflow-hidden ${
          closing ? "animate-drawer-exit" : "animate-drawer-enter"
        }`}
        style={{
          backgroundColor: "rgba(248,249,250,0.78)",
          backdropFilter: "blur(40px) saturate(140%)",
          WebkitBackdropFilter: "blur(40px) saturate(140%)",
          borderRight: "0.75px solid rgba(26,26,31,0.14)",
          boxShadow: "20px 0 60px -20px rgba(60,70,90,0.18)",
        }}
      >
        {/* Soft sage tint blob in the corner for depth */}
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(170,196,176,0.35) 0%, rgba(170,196,176,0) 70%)",
          }}
          aria-hidden="true"
        />

        <div className="relative flex h-full flex-col">
          {/* Close */}
          <div className="flex items-center justify-end px-4 pt-6">
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close menu"
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>

          {/* Mini profile */}
          <button
            type="button"
            onClick={() => handleNav("profile")}
            className="mx-5 mt-4 flex items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          <div className="mx-5 mt-6 h-px bg-foreground/10" aria-hidden="true" />

          {/* Nav items */}
          <nav className="mt-4 flex flex-col gap-1 px-3">
            <NavItem icon={<User2 className="h-[18px] w-[18px]" strokeWidth={1.5} />} label="Profile" hint="your details" onClick={() => handleNav("profile")} />
            <NavItem icon={<MessageSquare className="h-[18px] w-[18px]" strokeWidth={1.5} />} label="Chat history" hint="conversations with Bitsy" onClick={() => handleNav("history")} />
            <NavItem icon={<ImageIcon className="h-[18px] w-[18px]" strokeWidth={1.5} />} label="Gallery" hint="your works & community" onClick={() => handleNav("gallery")} />
          </nav>

          <div className="flex-1" />

          {/* Footer */}
          <div className="px-7 pb-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/40">Bitsy</p>
            <p className="mt-1 font-mono text-[11px] font-light leading-relaxed text-foreground/55">
              A small companion for noticing.
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}

function NavItem({
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
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/75" style={{ border: "0.5px solid rgba(26,26,31,0.14)" }}>
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-mono text-[14px] font-normal text-foreground">{label}</span>
        <span className="truncate font-mono text-[10px] font-light text-foreground/50">{hint}</span>
      </span>
    </button>
  )
}
