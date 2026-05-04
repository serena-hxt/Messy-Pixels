import { NextResponse } from "next/server"
import { findBestMatch, type Artwork } from "@/lib/ham-api"

/**
 * Curated list of popular works to seed the album. The titles, artists, and
 * years come from the project brief. Each entry is resolved against the HAM
 * collection at request time, returning the high-resolution `primaryimageurl`
 * and commentary so the album can render real artwork thumbnails.
 */
const POPULAR_LIST: Array<{ title: string; artist?: string; year: string }> = [
  { title: "Self-Portrait Dedicated to Paul Gauguin", artist: "Vincent van Gogh", year: "1888" },
  { title: "Red Boats, Argenteuil", artist: "Claude Monet", year: "1875" },
  { title: "Geraniums", artist: "Henri Matisse", year: "1910" },
  { title: "Entertainments of Spain", artist: "Francisco Goya", year: "1825" },
  { title: "Mural", artist: "Joan Miro", year: "1935" },
  { title: "No. 2", artist: "Jackson Pollock", year: "1950" },
  { title: "Flight", artist: "David Smith", year: "1951" },
  { title: 'Large "Pushou" Monster Mask', year: "Late 7th - early 8th century" },
  { title: "Little Dancer, Aged Fourteen", artist: "Edgar Degas", year: "1880" },
  { title: "Bamboo through the Four Seasons", artist: "Yoo Tok Chang", year: "mid 18th century" },
  { title: "Landscape (composition cubiste)", artist: "Jean Metzinger", year: "1912" },
]

export interface PopularEntry {
  /** What the brief asked for — kept verbatim so the UI can label correctly. */
  title: string
  artist: string
  year: string
  /** Resolved HAM record, or null if no match was found. */
  artwork: Artwork | null
}

export async function GET() {
  try {
    // Resolve all lookups in parallel — HAM is rate-tolerant for ~10 reqs.
    const entries: PopularEntry[] = await Promise.all(
      POPULAR_LIST.map(async (item) => {
        // Pass the year hint so the strict field-prefixed q-builder can use
        // it to disambiguate when multiple HAM records share a title (e.g.
        // Pollock has many "No. 2" entries across years).
        const artwork = await findBestMatch({
          title: item.title,
          artist: item.artist,
          year: item.year,
        }).catch(() => null)
        return {
          title: item.title,
          artist: item.artist ?? "Anonymous",
          year: item.year,
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
