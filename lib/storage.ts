import type { UIMessage } from "ai"

/* -----------------------------  Profile  ------------------------------ */

export interface UserProfile {
  displayName: string
  bio: string
  joinedAt: number
}

const PROFILE_KEY = "bitsy:profile"

export const defaultProfile = (): UserProfile => ({
  displayName: "Visitor",
  bio: "Curious about color, line, and the small worlds inside paintings.",
  joinedAt: Date.now(),
})

export function loadProfile(): UserProfile {
  if (typeof window === "undefined") return defaultProfile()
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY)
    if (!raw) return defaultProfile()
    const parsed = JSON.parse(raw) as Partial<UserProfile>
    return { ...defaultProfile(), ...parsed }
  } catch {
    return defaultProfile()
  }
}

export function saveProfile(p: UserProfile) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
  } catch {
    /* quota / privacy mode */
  }
}

/* -----------------------------  Chat sessions  ------------------------ */

export interface ChatSession {
  id: string
  startedAt: number
  updatedAt: number
  title: string
  messages: UIMessage[]
}

const SESSIONS_KEY = "bitsy:sessions"

export function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ChatSession[]
  } catch {
    return []
  }
}

export function saveSessions(sessions: ChatSession[]) {
  if (typeof window === "undefined") return
  try {
    // Keep a sensible cap so localStorage never overflows
    const trimmed = sessions.slice(-40)
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed))
  } catch {
    /* ignore */
  }
}

export function upsertSession(updated: ChatSession): ChatSession[] {
  const existing = loadSessions()
  const idx = existing.findIndex((s) => s.id === updated.id)
  let next: ChatSession[]
  if (idx === -1) {
    next = [...existing, updated]
  } else {
    next = [...existing]
    next[idx] = updated
  }
  saveSessions(next)
  return next
}

export function getMessageText(msg: UIMessage): string {
  if (!msg?.parts || !Array.isArray(msg.parts)) return ""
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
    .replace(/\[draw_now\]/gi, "")
    .trim()
}

export function deriveSessionTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user")
  if (firstUser) {
    const t = getMessageText(firstUser)
    if (t) return t.length > 48 ? `${t.slice(0, 48)}…` : t
  }
  return "Untitled conversation"
}

/* -----------------------------  Gallery  ------------------------------ */

export interface GalleryItem {
  id: string
  dataUrl: string
  title: string
  caption?: string
  author: string
  likes: number
  createdAt: number
  /** True if the current user authored this work. */
  isMine: boolean
  /** Liked by current user (for community items). */
  liked?: boolean
}

const GALLERY_KEY = "bitsy:gallery"

export function loadGallery(): GalleryItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(GALLERY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as GalleryItem[]
  } catch {
    return []
  }
}

export function saveGallery(items: GalleryItem[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(GALLERY_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

export function addToGallery(item: GalleryItem): GalleryItem[] {
  const existing = loadGallery()
  const next = [item, ...existing]
  saveGallery(next)
  return next
}
