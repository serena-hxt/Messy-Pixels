"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Pencil, Save } from "lucide-react"
import { AuraBackground } from "@/components/aura-background"
import { loadProfile, saveProfile, loadSessions, loadGallery, type UserProfile } from "@/lib/storage"

interface ProfileViewProps {
  onClose: () => void
  drawingsCount: number
}

export function ProfileView({ onClose, drawingsCount }: ProfileViewProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState("")
  const [draftBio, setDraftBio] = useState("")
  const [conversations, setConversations] = useState(0)
  const [galleryCount, setGalleryCount] = useState(0)

  useEffect(() => {
    const p = loadProfile()
    setProfile(p)
    setDraftName(p.displayName)
    setDraftBio(p.bio)
    setConversations(loadSessions().length)
    setGalleryCount(loadGallery().filter((g) => g.isMine).length)
  }, [])

  const initial = useMemo(() => (profile?.displayName?.[0] ?? "B").toUpperCase(), [profile])
  const joinedLabel = useMemo(() => {
    if (!profile) return ""
    const d = new Date(profile.joinedAt)
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" })
  }, [profile])

  const handleSave = () => {
    if (!profile) return
    const next: UserProfile = {
      ...profile,
      displayName: draftName.trim() || "Visitor",
      bio: draftBio.trim(),
    }
    saveProfile(next)
    setProfile(next)
    setEditing(false)
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-background">
      <AuraBackground />

      <header className="relative flex items-center justify-between px-4 pt-6 sm:px-8 md:px-12">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.25} aria-hidden="true" />
        </button>
        <h1 className="font-mono text-[12px] uppercase tracking-[0.28em] text-foreground/55">Profile</h1>
        {editing ? (
          <button
            type="button"
            onClick={handleSave}
            aria-label="Save profile"
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Save className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit profile"
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </header>

      <main className="relative flex flex-1 flex-col gap-8 px-4 pb-12 pt-6 sm:px-8 md:px-12">
        {/* Avatar + name */}
        <section className="flex flex-col items-center gap-4 pt-2">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full text-foreground"
            style={{
              background: "linear-gradient(135deg, rgba(170,196,176,0.55), rgba(212,166,156,0.55))",
              border: "0.75px solid rgba(26,26,31,0.14)",
              boxShadow: "0 12px 30px -16px rgba(60,70,90,0.2)",
            }}
            aria-hidden="true"
          >
            <span className="font-mono text-3xl font-light tracking-wider">{initial}</span>
          </div>

          {editing ? (
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={32}
              className="w-full max-w-xs rounded-xl border border-foreground/15 bg-background/60 px-4 py-2 text-center font-mono text-lg font-normal text-foreground outline-none focus:border-foreground/40"
              placeholder="Your name"
            />
          ) : (
            <h2 className="font-mono text-xl font-normal text-foreground">{profile?.displayName ?? "Visitor"}</h2>
          )}

          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">visiting since {joinedLabel}</p>
        </section>

        {/* Bio */}
        <section className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">about</p>
          {editing ? (
            <textarea
              value={draftBio}
              onChange={(e) => setDraftBio(e.target.value)}
              rows={4}
              maxLength={280}
              className="w-full resize-none rounded-2xl border border-foreground/15 bg-background/60 px-4 py-3 font-mono text-[13px] font-light leading-relaxed text-foreground outline-none focus:border-foreground/40"
              placeholder="A few words about how you look at art."
            />
          ) : (
            <p className="font-mono text-[13px] font-light leading-relaxed text-foreground/80">
              {profile?.bio || "—"}
            </p>
          )}
        </section>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-3">
          <Stat label="sketches" value={drawingsCount} />
          <Stat label="conversations" value={conversations} />
          <Stat label="in gallery" value={galleryCount} />
        </section>
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-2xl px-3 py-5"
      style={{
        backgroundColor: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        border: "0.5px solid rgba(26,26,31,0.1)",
      }}
    >
      <span className="font-mono text-2xl font-light tabular-nums text-foreground">{value}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">{label}</span>
    </div>
  )
}
