/**
 * Harvard Art Museums (HAM) API utility.
 *
 * The HAM API key is read from `process.env.NEXT_PUBLIC_HAM_API_KEY` per
 * project requirements. Although the variable is prefixed with NEXT_PUBLIC,
 * we only ever read it from server-side code (a Route Handler) so the key
 * is never sent in a client request — it stays inside the Vercel runtime.
 *
 * Docs: https://github.com/harvardartmuseums/api-docs
 */

const HAM_BASE = "https://api.harvardartmuseums.org"

/**
 * The shape that flows through `SelectedArtworkContext`. This is the trimmed
 * projection that components actually consume — not the full HAM payload.
 */
export interface Artwork {
  id: number
  title: string
  artist: string
  /** High-resolution image URL ready for `<img>` / `next/image`. */
  primaryimageurl: string
  /** Curatorial / descriptive text used for storytelling. */
  commentary: string
  /** Dominant colors as `#rrggbb` hex strings (lowercase). */
  colors: string[]
  /** Medium / materials description (e.g. "Oil on canvas"). */
  medium: string
}

/* -------------------------------------------------------------------------- */
/* Raw HAM API types — only the fields we read are typed.                     */
/* -------------------------------------------------------------------------- */

interface HamPerson {
  name?: string
  role?: string
  displayname?: string
}

interface HamColor {
  color?: string
  spectrum?: string
  hue?: string
  percent?: number
  css3?: string
}

interface HamObject {
  id: number
  title?: string | null
  people?: HamPerson[] | null
  primaryimageurl?: string | null
  commentary?: string | null
  description?: string | null
  labeltext?: string | null
  colors?: HamColor[] | null
  medium?: string | null
  technique?: string | null
}

interface HamObjectListResponse {
  records: HamObject[]
  info?: { totalrecords?: number; totalrecordsperquery?: number; pages?: number; page?: number }
}

/* -------------------------------------------------------------------------- */
/* Mapping helpers                                                            */
/* -------------------------------------------------------------------------- */

/** Pick the most likely "creator" name from a person list. */
function pickArtist(people: HamPerson[] | null | undefined): string {
  if (!people || people.length === 0) return "Unknown artist"
  const artist =
    people.find((p) => /artist|painter|maker|creator|designer/i.test(p.role ?? "")) ?? people[0]
  return artist.displayname || artist.name || "Unknown artist"
}

/** Normalize a HAM color entry to a `#rrggbb` hex string, dropping anything malformed. */
function normalizeHex(input: string | undefined | null): string | null {
  if (!input) return null
  const v = input.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(v)) return v
  if (/^#[0-9a-f]{3}$/.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
  }
  return null
}

/**
 * HAM's IIIF service supports size-tuning via query string. We request a
 * generously large image so the front-end can downscale crisply on retina
 * displays without ever upscaling. We fall back to the raw URL if it isn't
 * an IIIF endpoint.
 */
function toHighResImage(url: string | null | undefined): string {
  if (!url) return ""
  // HAM IIIF URLs already serve high-res by default. Appending a width hint
  // for the IIIF Image API ensures we get the largest reasonable size.
  if (/ids\.lib\.harvard\.edu/.test(url)) {
    const sep = url.includes("?") ? "&" : "?"
    return `${url}${sep}width=2000`
  }
  return url
}

/** Convert a raw HAM object to our trimmed `Artwork` shape. */
export function mapHamObjectToArtwork(o: HamObject): Artwork {
  // Prefer commentary, then description, then labeltext — this matches HAM's
  // own editorial hierarchy for storytelling text.
  const commentary = (o.commentary || o.description || o.labeltext || "").trim()

  const colors = (o.colors ?? [])
    .map((c) => normalizeHex(c.color))
    .filter((c): c is string => Boolean(c))

  return {
    id: o.id,
    title: o.title?.trim() || "Untitled",
    artist: pickArtist(o.people),
    primaryimageurl: toHighResImage(o.primaryimageurl),
    commentary,
    colors,
    medium: o.medium?.trim() || o.technique?.trim() || "",
  }
}

/* -------------------------------------------------------------------------- */
/* Fetchers — server-side only.                                               */
/* -------------------------------------------------------------------------- */

function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_HAM_API_KEY
  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_HAM_API_KEY. Add it to your project's environment variables.",
    )
  }
  return key
}

/**
 * Fetch a single artwork by HAM object id.
 *
 * @example
 *   const art = await fetchArtworkById(299843) // The Clouds (Cézanne)
 */
export async function fetchArtworkById(id: number): Promise<Artwork> {
  const apikey = getApiKey()
  const url = `${HAM_BASE}/object/${encodeURIComponent(String(id))}?apikey=${encodeURIComponent(apikey)}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) {
    throw new Error(`HAM API ${res.status}: ${await res.text().catch(() => res.statusText)}`)
  }
  const data = (await res.json()) as HamObject
  return mapHamObjectToArtwork(data)
}

export interface SearchArtworksOptions {
  /** Free-text search across title, artist, etc. */
  q?: string
  /** Title-only filter (HAM-supported). Use to disambiguate generic titles. */
  title?: string
  /** Artist / maker name filter (HAM-supported). */
  person?: string
  /** Filter to records that have an image attached. Defaults to true. */
  hasimage?: boolean
  /** Page size — capped at 100 by HAM. */
  size?: number
  page?: number
  /** Optional classification filter (e.g. "Paintings"). */
  classification?: string
  /** HAM sort token (e.g. "rank", "totalpageviews"). */
  sort?: string
  sortorder?: "asc" | "desc"
}

/** Search the /object endpoint, returning an already-mapped list of artworks. */
export async function searchArtworks(opts: SearchArtworksOptions = {}): Promise<Artwork[]> {
  const apikey = getApiKey()
  const params = new URLSearchParams({ apikey })
  if (opts.q) params.set("q", opts.q)
  if (opts.title) params.set("title", opts.title)
  if (opts.person) params.set("person", opts.person)
  params.set("hasimage", opts.hasimage === false ? "0" : "1")
  params.set("size", String(opts.size ?? 12))
  if (opts.page) params.set("page", String(opts.page))
  if (opts.classification) params.set("classification", opts.classification)
  params.set("sort", opts.sort ?? "rank")
  params.set("sortorder", opts.sortorder ?? "desc")
  // Limit returned fields for speed
  params.set(
    "fields",
    "id,title,people,primaryimageurl,commentary,description,labeltext,colors,medium,technique",
  )

  const url = `${HAM_BASE}/object?${params.toString()}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) {
    throw new Error(`HAM API ${res.status}: ${await res.text().catch(() => res.statusText)}`)
  }
  const data = (await res.json()) as HamObjectListResponse
  return (data.records ?? [])
    .filter((r) => r.primaryimageurl) // drop image-less records defensively
    .map(mapHamObjectToArtwork)
}

/* -------------------------------------------------------------------------- */
/* Convenience: best-match lookup for "title + artist"                        */
/* -------------------------------------------------------------------------- */

/**
 * Try to find the single best HAM record for a (title, artist) pair. Used by
 * the lens digital-twin and the popular-works grid. We attempt progressively
 * looser queries until something with an image returns.
 */
export async function findBestMatch(input: {
  title: string
  artist?: string
}): Promise<Artwork | null> {
  const { title, artist } = input

  // 1. Strict: title + person filters (most accurate)
  if (artist) {
    try {
      const exact = await searchArtworks({ title, person: artist, size: 5 })
      if (exact.length > 0) return exact[0]
    } catch {
      /* fall through */
    }
  }

  // 2. Title-only filter (some HAM titles are unique enough to win on their own)
  try {
    const titled = await searchArtworks({ title, size: 5 })
    if (titled.length > 0) {
      // If we have an artist hint, prefer the closest artist match.
      if (artist) {
        const lowerArtist = artist.toLowerCase()
        const best = titled.find((a) => a.artist.toLowerCase().includes(lowerArtist))
        if (best) return best
      }
      return titled[0]
    }
  } catch {
    /* fall through */
  }

  // 3. Free-text fallback combining title + artist into one query
  try {
    const q = artist ? `${title} ${artist}` : title
    const broad = await searchArtworks({ q, size: 5 })
    return broad[0] ?? null
  } catch {
    return null
  }
}
