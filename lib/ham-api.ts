/**
 * Harvard Art Museums (HAM) API utility.
 *
 * The HAM API key is read from `process.env.NEXT_PUBLIC_HAM_API_KEY` per
 * project requirements. Although the variable is prefixed with NEXT_PUBLIC,
 * we only ever read it from server-side code (a Route Handler) so the key
 * is never sent in a client request — it stays inside the Vercel runtime.
 *
 * Docs: https://github.com/harvardartmuseums/api-docs
 *
 * This file deliberately keeps several distinct responsibilities together
 * because they all share the same HAM payload shape: type definitions,
 * mapping helpers, image validation, and the search/lookup API. The order
 * of operations is documented below where it matters most.
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

/**
 * A single image record inside the HAM `images` array. HAM returns multiple
 * images per object (e.g. recto/verso, conservation, frame views). We use
 * `displayorder` (1 = front-facing primary view), `role` ("Primary" for the
 * canonical view), and `publiccaption` (null/general for unlabelled primary
 * shots) to pick the right one.
 */
interface HamImage {
  idsid?: number
  iiifbaseuri?: string
  baseimageurl?: string
  displayorder?: number
  publiccaption?: string | null
  role?: string | null
  width?: number
  height?: number
}

interface HamObject {
  id: number
  title?: string | null
  people?: HamPerson[] | null
  primaryimageurl?: string | null
  images?: HamImage[] | null
  commentary?: string | null
  description?: string | null
  labeltext?: string | null
  colors?: HamColor[] | null
  medium?: string | null
  technique?: string | null
  dated?: string | null
}

interface HamObjectListResponse {
  records: HamObject[]
  info?: { totalrecords?: number; totalrecordsperquery?: number; pages?: number; page?: number }
}

/**
 * The set of fields we ask HAM to return. Keeping this constant in one place
 * ensures the search and id-lookup endpoints get the same projection — and
 * crucially, that the `images` array is always included so the fallback
 * picker has something to work with.
 */
const HAM_FIELDS =
  "id,title,people,primaryimageurl,images,commentary,description,labeltext,colors,medium,technique,dated"

/* -------------------------------------------------------------------------- */
/* Image validation + selection                                               */
/* -------------------------------------------------------------------------- */

/**
 * Returns true only for non-empty http(s) URLs that don't look like a
 * known placeholder. Used both inside the picker (when resolving fallbacks)
 * and exported for client-side rendering guards in the Lens / Chat views.
 */
export function isValidImageUrl(url: string | null | undefined): url is string {
  if (!url) return false
  const trimmed = url.trim()
  if (!trimmed) return false
  if (!/^https?:\/\//i.test(trimmed)) return false
  // HAM occasionally serves stub paths for restricted records. Drop anything
  // that looks like a placeholder rather than a real artwork image.
  if (/placeholder|no[_-]?image|missing/i.test(trimmed)) return false
  return true
}

/**
 * Build a high-resolution IIIF URL from a HAM `iiifbaseuri`. Following the
 * IIIF Image API 2.0 spec, `/full/full/0/default.jpg` returns the largest
 * available rendering with no rotation. We use this any time we have to
 * synthesize a URL ourselves (i.e. no usable `primaryimageurl` or
 * `baseimageurl`).
 */
function buildIiifUrl(iiifbaseuri: string): string {
  // Strip any trailing slash before appending the IIIF Image API path.
  const base = iiifbaseuri.replace(/\/+$/, "")
  return `${base}/full/full/0/default.jpg`
}

/**
 * Append a width hint to an existing HAM URL so retina downscales stay sharp.
 * Only applied to direct ids.lib.harvard.edu URLs — anything else is left
 * untouched because adding query strings to redirects (e.g. nrs.harvard.edu)
 * can break them.
 */
function withWidthHint(url: string): string {
  if (!/ids\.lib\.harvard\.edu/.test(url)) return url
  // If the URL is already an IIIF Image API path it doesn't need a width hint.
  if (/\/full\/[^/]+\/0\/default\.[a-z]+/i.test(url)) return url
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}width=2000`
}

/**
 * Pick the best image URL for a HAM object using documented fallback rules:
 *
 *   1. If the root `primaryimageurl` is present and valid, use it. This is
 *      HAM's own canonical front-facing rendering and almost always correct.
 *   2. Otherwise, scan the `images` array. Prefer entries with `role` of
 *      "Primary" or with a null/empty `publiccaption` (i.e. unlabelled
 *      primary shots). Sort by ascending `displayorder` so 1 wins.
 *   3. From the chosen image, prefer an IIIF-derived URL using
 *      `iiifbaseuri` + `/full/full/0/default.jpg`; fall back to
 *      `baseimageurl` if that's all we have.
 *
 * Returns "" when no usable image exists — callers must check before render.
 */
function pickBestImage(o: HamObject): string {
  // Step 1: root primaryimageurl wins outright when valid.
  if (isValidImageUrl(o.primaryimageurl)) {
    return withWidthHint(o.primaryimageurl)
  }

  const images = o.images ?? []
  if (images.length === 0) return ""

  // Step 2: filter to "Primary or general" candidates first; broaden if empty.
  const isPrimaryRole = (img: HamImage) =>
    typeof img.role === "string" && img.role.toLowerCase() === "primary"
  const isGeneralCaption = (img: HamImage) =>
    img.publiccaption == null || img.publiccaption === ""

  const primaryCandidates = images.filter((img) => isPrimaryRole(img) || isGeneralCaption(img))
  const candidates = primaryCandidates.length > 0 ? primaryCandidates : images

  // Sort ascending by displayorder (1 = canonical front view). Records
  // missing displayorder fall to the end so they only win as last resort.
  const sorted = [...candidates].sort(
    (a, b) =>
      (a.displayorder ?? Number.POSITIVE_INFINITY) -
      (b.displayorder ?? Number.POSITIVE_INFINITY),
  )

  // Step 3: build a usable URL from the winning image.
  for (const img of sorted) {
    if (img.iiifbaseuri) {
      const built = buildIiifUrl(img.iiifbaseuri)
      if (isValidImageUrl(built)) return built
    }
    if (isValidImageUrl(img.baseimageurl)) {
      return withWidthHint(img.baseimageurl)
    }
  }

  return ""
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

/** Convert a raw HAM object to our trimmed `Artwork` shape. */
export function mapHamObjectToArtwork(o: HamObject): Artwork {
  const commentary = (o.commentary || o.description || o.labeltext || "").trim()

  const colors = (o.colors ?? [])
    .map((c) => normalizeHex(c.color))
    .filter((c): c is string => Boolean(c))

  return {
    id: o.id,
    title: o.title?.trim() || "Untitled",
    artist: pickArtist(o.people),
    primaryimageurl: pickBestImage(o),
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

/** Fetch a single artwork by HAM object id. */
export async function fetchArtworkById(id: number): Promise<Artwork> {
  const apikey = getApiKey()
  const params = new URLSearchParams({ apikey, fields: HAM_FIELDS })
  const url = `${HAM_BASE}/object/${encodeURIComponent(String(id))}?${params.toString()}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) {
    throw new Error(`HAM API ${res.status}: ${await res.text().catch(() => res.statusText)}`)
  }
  const data = (await res.json()) as HamObject
  return mapHamObjectToArtwork(data)
}

export interface SearchArtworksOptions {
  /** Free-text search across title, artist, etc. Supports field prefixes. */
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
  params.set("fields", HAM_FIELDS)

  const url = `${HAM_BASE}/object?${params.toString()}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) {
    throw new Error(`HAM API ${res.status}: ${await res.text().catch(() => res.statusText)}`)
  }
  const data = (await res.json()) as HamObjectListResponse
  // Map first, then validate the resolved image. Some HAM records have a
  // `primaryimageurl` field but the picker rejects it (placeholder, etc.).
  return (data.records ?? [])
    .map(mapHamObjectToArtwork)
    .filter((a) => isValidImageUrl(a.primaryimageurl))
}

/* -------------------------------------------------------------------------- */
/* Strict q-builder for field-prefixed search                                 */
/* -------------------------------------------------------------------------- */

/**
 * Escape a value for inclusion in a HAM `q` parameter. HAM's Solr-flavored
 * search accepts double-quoted phrases; we strip embedded quotes so the
 * surrounding ones aren't broken.
 */
function escapeQTerm(value: string): string {
  return value.replace(/"/g, "").trim()
}

/**
 * Build a strict, field-prefixed q parameter:
 *   title:"The Rehearsal" AND attribution:"Edgar Degas" AND dated:"1880"
 *
 * Field prefixes prevent HAM's free-text fuzzy matcher from surfacing
 * unrelated objects that happen to share a word with the title.
 */
function buildStrictQ(input: { title?: string; artist?: string; year?: string }): string {
  const parts: string[] = []
  if (input.title) parts.push(`title:"${escapeQTerm(input.title)}"`)
  if (input.artist) parts.push(`attribution:"${escapeQTerm(input.artist)}"`)
  if (input.year) parts.push(`dated:"${escapeQTerm(input.year)}"`)
  return parts.join(" AND ")
}

/* -------------------------------------------------------------------------- */
/* Convenience: best-match lookup for "title + artist (+ year)"               */
/* -------------------------------------------------------------------------- */

/**
 * Try to find the single best HAM record for a (title, artist, year) tuple.
 * The escalation order goes from strictest to broadest:
 *
 *   0. Curated registry — if (title, artist) maps to one of the 10 featured
 *      works, fetch by Object ID directly (skips fuzzy search entirely)
 *   1. Strict field-prefixed q with title + attribution + dated
 *   2. Strict q with title + attribution (no year)
 *   3. HAM `title` + `person` filter params (looser than q)
 *   4. Title-only HAM filter, biased toward an artist-name substring match
 *   5. Free-text q combining all hints
 *
 * Each step is wrapped in try/catch so a single failure doesn't poison the
 * fallback chain. Records without a valid image URL are filtered out at
 * the `searchArtworks` level, so this function only returns artworks the
 * UI can actually render.
 */
export async function findBestMatch(input: {
  title: string
  artist?: string
  year?: string
}): Promise<Artwork | null> {
  const { title, artist, year } = input

  /** Helper: prefer the candidate whose artist name contains the hint. */
  const pickByArtist = (list: Artwork[]): Artwork | null => {
    if (list.length === 0) return null
    if (!artist) return list[0]
    const lower = artist.toLowerCase()
    return list.find((a) => a.artist.toLowerCase().includes(lower)) ?? list[0]
  }

  // 0. Curated registry — most reliable path. If the title + artist match
  // one of our 10 featured works we know the exact HAM Object ID, so we
  // skip the fuzzy q-builder entirely. Imported lazily to avoid a circular
  // dependency on this module from inside the curated registry.
  try {
    const { findCuratedMatch } = await import("@/lib/curated-artworks")
    const curated = findCuratedMatch({ title, artist })
    if (curated) {
      try {
        const artwork = await fetchArtworkById(curated.objectid)
        // If HAM returns an artwork without a valid image, use the fallback if available
        if (!artwork.primaryimageurl && curated.fallbackImageUrl) {
          artwork.primaryimageurl = curated.fallbackImageUrl
        }
        return artwork
      } catch {
        // If HAM fetch fails entirely, create a synthetic artwork using the fallback
        if (curated.fallbackImageUrl) {
          return {
            id: curated.objectid,
            title: curated.title,
            artist: curated.artist,
            primaryimageurl: curated.fallbackImageUrl,
            commentary: "",
            colors: [],
            medium: "",
          }
        }
        /* fall through to fuzzy search */
      }
    }
  } catch {
    /* fall through */
  }

  // 1. Strict q with all hints
  if (artist) {
    try {
      const q = buildStrictQ({ title, artist, year })
      const exact = await searchArtworks({ q, size: 5 })
      const match = pickByArtist(exact)
      if (match) return match
    } catch {
      /* fall through */
    }
  }

  // 2. Strict q without year (year strings often don't match HAM's `dated`)
  if (artist) {
    try {
      const q = buildStrictQ({ title, artist })
      const exact = await searchArtworks({ q, size: 5 })
      const match = pickByArtist(exact)
      if (match) return match
    } catch {
      /* fall through */
    }
  }

  // 3. Filter params (title + person)
  if (artist) {
    try {
      const filtered = await searchArtworks({ title, person: artist, size: 5 })
      const match = pickByArtist(filtered)
      if (match) return match
    } catch {
      /* fall through */
    }
  }

  // 4. Title-only filter, biased toward artist substring
  try {
    const titled = await searchArtworks({ title, size: 5 })
    const match = pickByArtist(titled)
    if (match) return match
  } catch {
    /* fall through */
  }

  // 5. Free-text fallback
  try {
    const q = [title, artist, year].filter(Boolean).join(" ")
    const broad = await searchArtworks({ q, size: 5 })
    return pickByArtist(broad)
  } catch {
    return null
  }
}
