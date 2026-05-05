"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import type { Artwork } from "@/lib/ham-api"

/**
 * Global state for the artwork the user is currently exploring (lens scan,
 * gallery tap, daily feature, etc.). Components anywhere in the tree can
 * read it via `useSelectedArtwork()` and set it via the same hook's setters.
 *
 * The context also exposes a small `loadArtworkById` helper that hits
 * `/api/artwork?id=...` so callers don't need to know about the route.
 */

interface SelectedArtworkContextValue {
  /** The currently focused artwork, or null if none has been selected yet. */
  selectedArtwork: Artwork | null
  /** Replace or clear the selected artwork. */
  setSelectedArtwork: (artwork: Artwork | null) => void
  /** True while `loadArtworkById` is in flight. */
  isLoading: boolean
  /** Last fetch error message, or null. */
  error: string | null
  /** Fetch a HAM object by id and store the result as the selected artwork. */
  loadArtworkById: (id: number) => Promise<Artwork | null>
}

const SelectedArtworkContext = createContext<SelectedArtworkContextValue | null>(null)

export function SelectedArtworkProvider({ children }: { children: ReactNode }) {
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadArtworkById = useCallback(async (id: number): Promise<Artwork | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/artwork?id=${encodeURIComponent(String(id))}`)
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      const data = (await res.json()) as { artwork: Artwork }
      setSelectedArtwork(data.artwork)
      return data.artwork
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load artwork"
      setError(message)
      console.error("[v0] loadArtworkById failed:", message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const value = useMemo<SelectedArtworkContextValue>(
    () => ({ selectedArtwork, setSelectedArtwork, isLoading, error, loadArtworkById }),
    [selectedArtwork, isLoading, error, loadArtworkById],
  )

  return <SelectedArtworkContext.Provider value={value}>{children}</SelectedArtworkContext.Provider>
}

/**
 * Read or update the selected artwork from anywhere in the tree.
 * Throws if used outside `SelectedArtworkProvider`.
 */
export function useSelectedArtwork(): SelectedArtworkContextValue {
  const ctx = useContext(SelectedArtworkContext)
  if (!ctx) {
    throw new Error("useSelectedArtwork must be used inside <SelectedArtworkProvider>.")
  }
  return ctx
}

// Re-export the Artwork type for convenience so consumers can do:
//   import { useSelectedArtwork, type Artwork } from "@/contexts/selected-artwork-context"
export type { Artwork }
