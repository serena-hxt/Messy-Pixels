import type { UIMessage } from "ai"

/* -----------------------------  Maker Profile  ------------------------ */

export type MakerProfileType = "visualizer" | "storyteller" | "inhabitant" | "remixer"

export interface MakerProfile {
  type: MakerProfileType
  quizAnswers: [string, string] // Answers to Q1 and Q2
  createdAt: number
}

const MAKER_PROFILE_KEY = "bitsy:makerProfile"

export function loadMakerProfile(): MakerProfile | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(MAKER_PROFILE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as MakerProfile
  } catch {
    return null
  }
}

export function saveMakerProfile(profile: MakerProfile) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(MAKER_PROFILE_KEY, JSON.stringify(profile))
  } catch {
    /* quota / privacy mode */
  }
}

export function clearMakerProfile() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(MAKER_PROFILE_KEY)
  } catch {
    /* ignore */
  }
}

export const MAKER_PROFILE_INFO: Record<MakerProfileType, { name: string; tagline: string; description: string }> = {
  visualizer: {
    name: "Visualizer",
    tagline: "You make meaning through images.",
    description: "You like drawing, coloring, extending, and changing the visual world of an artwork.",
  },
  storyteller: {
    name: "Storyteller",
    tagline: "You make meaning through stories.",
    description: "You like creating backstories, dialogue, inner thoughts, and next scenes.",
  },
  inhabitant: {
    name: "Inhabitant",
    tagline: "You make meaning by stepping inside.",
    description: "You imagine yourself inside the artwork through roleplay, empathy, and sensory detail.",
  },
  remixer: {
    name: "Remixer",
    tagline: "You make meaning by changing the context.",
    description: "You like modernizing, mashing up, memeing, and turning artworks into new worlds.",
  },
}

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

export type PrivacyLevel = "private" | "class" | "museum"

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
  /** Privacy level — controls visibility in community views. */
  privacy?: PrivacyLevel
  /** The artwork ID this creation is based on. */
  artworkId?: number
  /** The artwork title this creation is based on. */
  artworkTitle?: string
  /** The prompt used when creating. */
  prompt?: string
  /** The maker profile used when creating. */
  makerProfile?: MakerProfileType
  /** Comments on this item. */
  comments?: { id: string; author: string; text: string; createdAt: number }[]
  /** Active remix preset when this creation was saved (for re-render hints). */
  remixMode?: "movie-poster" | "meme" | "futuristic" | "dreamy" | null
  /** Serialized overlay elements (text + stickers) at save time. */
  overlays?: unknown[]
  /** Stored canvas dimensions (CSS pixels) so overlays re-render to scale. */
  canvasWidth?: number
  canvasHeight?: number
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

export function updateGalleryItem(id: string, updates: Partial<GalleryItem>): GalleryItem[] {
  const existing = loadGallery()
  const next = existing.map((item) => (item.id === id ? { ...item, ...updates } : item))
  saveGallery(next)
  return next
}

export function removeFromGallery(id: string): GalleryItem[] {
  const existing = loadGallery()
  const next = existing.filter((item) => item.id !== id)
  saveGallery(next)
  return next
}

/** Get shared creations for a specific artwork (class or museum level). */
export function getSharedCreationsForArtwork(artworkId: number): GalleryItem[] {
  const all = loadGallery()
  return all.filter(
    (item) =>
      item.artworkId === artworkId &&
      (item.privacy === "class" || item.privacy === "museum")
  )
}

/** Get all user's own creations. */
export function getMyCreations(): GalleryItem[] {
  const all = loadGallery()
  return all.filter((item) => item.isMine)
}

/** Add a comment to a gallery item. */
export function addCommentToGalleryItem(
  itemId: string,
  comment: { author: string; text: string }
): GalleryItem[] {
  const existing = loadGallery()
  const next = existing.map((item) => {
    if (item.id !== itemId) return item
    const newComment = {
      id: `comment_${Date.now()}`,
      ...comment,
      createdAt: Date.now(),
    }
    return { ...item, comments: [...(item.comments || []), newComment] }
  })
  saveGallery(next)
  return next
}

/** Toggle like on a gallery item. */
export function toggleLikeGalleryItem(itemId: string): GalleryItem[] {
  const existing = loadGallery()
  const next = existing.map((item) => {
    if (item.id !== itemId) return item
    const liked = !item.liked
    return { ...item, liked, likes: item.likes + (liked ? 1 : -1) }
  })
  saveGallery(next)
  return next
}

/* -----------------------------  Saved Artworks  ------------------------------ */

export interface SavedArtwork {
  id: number
  title: string
  artist?: string
  primaryimageurl?: string
  savedAt: number
}

const SAVED_ARTWORKS_KEY = "bitsy:savedArtworks"

export function loadSavedArtworks(): SavedArtwork[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(SAVED_ARTWORKS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SavedArtwork[]
  } catch {
    return []
  }
}

export function saveSavedArtworks(artworks: SavedArtwork[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(SAVED_ARTWORKS_KEY, JSON.stringify(artworks))
  } catch {
    /* ignore */
  }
}

export function addSavedArtwork(artwork: SavedArtwork): SavedArtwork[] {
  const existing = loadSavedArtworks()
  // Don't duplicate
  if (existing.some((a) => a.id === artwork.id)) return existing
  const next = [artwork, ...existing]
  saveSavedArtworks(next)
  return next
}

export function removeSavedArtwork(id: number): SavedArtwork[] {
  const existing = loadSavedArtworks()
  const next = existing.filter((a) => a.id !== id)
  saveSavedArtworks(next)
  return next
}

/* -----------------------------  Saved Inspirations  ------------------------------ */

const SAVED_INSPIRATIONS_KEY = "bitsy:savedInspirations"

export function loadSavedInspirations(): GalleryItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(SAVED_INSPIRATIONS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as GalleryItem[]
  } catch {
    return []
  }
}

export function saveSavedInspirations(items: GalleryItem[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(SAVED_INSPIRATIONS_KEY, JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

export function addSavedInspiration(item: GalleryItem): GalleryItem[] {
  const existing = loadSavedInspirations()
  // Don't duplicate
  if (existing.some((i) => i.id === item.id)) return existing
  const next = [item, ...existing]
  saveSavedInspirations(next)
  return next
}

export function removeSavedInspiration(id: string): GalleryItem[] {
  const existing = loadSavedInspirations()
  const next = existing.filter((i) => i.id !== id)
  saveSavedInspirations(next)
  return next
}
