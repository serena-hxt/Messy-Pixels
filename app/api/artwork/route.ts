import { NextResponse } from "next/server"
import { fetchArtworkById, searchArtworks } from "@/lib/ham-api"

/**
 * GET /api/artwork
 *
 * Two modes:
 *   1. ?id=12345         — fetch a single artwork by HAM object id
 *   2. ?q=Matisse        — search (also accepts size, page, classification, sort)
 *
 * Both return the trimmed `Artwork` projection used by `SelectedArtworkContext`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const idParam = url.searchParams.get("id")

  try {
    if (idParam) {
      const id = Number(idParam)
      if (!Number.isFinite(id)) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 })
      }
      const artwork = await fetchArtworkById(id)
      return NextResponse.json({ artwork })
    }

    const q = url.searchParams.get("q") ?? undefined
    const sizeParam = url.searchParams.get("size")
    const pageParam = url.searchParams.get("page")
    const classification = url.searchParams.get("classification") ?? undefined
    const sort = url.searchParams.get("sort") ?? undefined

    const artworks = await searchArtworks({
      q,
      size: sizeParam ? Number(sizeParam) : undefined,
      page: pageParam ? Number(pageParam) : undefined,
      classification,
      sort,
    })

    return NextResponse.json({ artworks })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    console.error("[v0] HAM API route error:", message)
    const status = /Missing NEXT_PUBLIC_HAM_API_KEY/.test(message) ? 500 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
