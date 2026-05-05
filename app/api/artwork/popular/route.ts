import { NextResponse } from "next/server"
import { fetchArtworkById, isValidImageUrl, type Artwork } from "@/lib/ham-api"
import { CURATED_ARTWORKS } from "@/lib/curated-artworks"

/**
 * The Popular album is seeded from `CURATED_ARTWORKS` — the 10 featured works
 * whose HAM Object IDs we know exactly. Fetching by ID is the most reliable
 * HAM call (no fuzzy matching, no tie-breaking), so we use that path here
 * and fall back to the registry's metadata + fallbackImageUrl only when the
 * API itself can't be reached.
 */
export interface PopularEntry {
  /** Verbatim from the curated brief — used as the visible label. */
  title: string
  artist: string
  year: string
  /** Bitsy's "Creative Making" prompt for this work. */
  bitsyPrompt: string
  /** Resolved HAM record, or a synthetic fallback if HAM was unreachable. */
  artwork: Artwork | null
}

export async function GET() {
  try {
    const entries: PopularEntry[] = await Promise.all(
      CURATED_ARTWORKS.map(async (item): Promise<PopularEntry> => {
        // Try the API first — by Object ID, so no fuzzy matching is involved.
        let artwork: Artwork | null = null
        try {
          const fetched = await fetchArtworkById(item.objectid)
          if (isValidImageUrl(fetched.primaryimageurl)) {
            artwork = fetched
          }
        } catch {
          /* swallow — we'll synthesize a fallback below */
        }

        // If the API fetch failed (or returned an unusable image) AND the
        // registry has a fallback URL on file, build a minimal Artwork from
        // the curated metadata so the album still renders something useful.
        if (!artwork && isValidImageUrl(item.fallbackImageUrl)) {
          artwork = {
            id: item.objectid,
            title: item.title,
            artist: item.artist,
            primaryimageurl: item.fallbackImageUrl as string,
            commentary: "",
            colors: [],
            medium: "",
          }
        }

        return {
          title: item.title,
          artist: item.artist,
          year: item.year,
          bitsyPrompt: item.bitsyPrompt,
          artwork,
        }
      }),
    )
    return NextResponse.json({ entries })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    console.error("[v0] popular route error:", message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
