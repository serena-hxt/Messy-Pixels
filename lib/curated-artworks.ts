/**
 * Curated registry of the 10 primary artworks featured in Bitsy.
 *
 * The single source of truth: each entry is keyed by its Harvard Art Museums
 * (HAM) Object ID — the integer at the end of harvardartmuseums.org/collections/object/{id}.
 * Looking up by ID is the most reliable HAM call (no fuzzy matching, no
 * tie-breaking), so anywhere the app already knows it's referring to one of
 * these 10 works it should skip the q-builder entirely and call
 * `fetchArtworkById(objectid)`.
 *
 * Each entry also carries:
 *  - canonical title / artist / year metadata used for soft matching when
 *    we only know the names (e.g. Gemini's lens recognition output)
 *  - an optional `fallbackImageUrl` so we still have something to render if
 *    the HAM API is unreachable (paste in URLs scraped from the public site)
 *  - a `bitsyPrompt` string — the "Creative Making" question Bitsy asks the
 *    visitor when they engage with this specific work. These are open-ended
 *    invitations written in the voice of an art educator.
 */

export interface CuratedArtwork {
  /** HAM Object ID (the integer at the end of the collections URL). */
  objectid: number
  title: string
  artist: string
  year: string
  /**
   * Public HAM website image URL used only when the API is unreachable.
   * Optional — leave empty and the UI falls back to its soft-state message.
   */
  fallbackImageUrl?: string
  /**
   * Bitsy's invitation prompt for this work — the "Creative Making" question
   * surfaced in chat / canvas when the visitor selects this artwork.
   */
  bitsyPrompt: string
}

export const CURATED_ARTWORKS: CuratedArtwork[] = [
  {
    objectid: 299843,
    title: "Self-Portrait Dedicated to Paul Gauguin",
    artist: "Vincent van Gogh",
    year: "1888",
    bitsyPrompt:
      "Van Gogh painted himself as a Buddhist monk, with no shadows and a halo of jade-green air. If you painted yourself the way you wished a friend would see you, what would you change about your face — and what would you keep exactly?",
  },
  {
    objectid: 228650,
    title: "Red Boats, Argenteuil",
    artist: "Claude Monet",
    year: "1875",
    bitsyPrompt:
      "Monet built this scene from short, separate strokes that only become a river when you step back. Try painting a place you love using only small dabs of color — no outlines, no blending. What appears when you stop trying to draw the thing and just place its light?",
  },
  {
    objectid: 229045,
    title: "Geraniums",
    artist: "Henri Matisse",
    year: "1910",
    bitsyPrompt:
      "Matisse paired hot reds against jade greens because, in his words, an inch of the wrong blue can ruin an acre of red. Pick two colors you've been told don't go together and put them next to each other — does the disagreement create more energy than harmony would have?",
  },
  {
    objectid: 349940,
    title: "Entertainments of Spain",
    artist: "Francisco Goya",
    year: "1825",
    bitsyPrompt:
      "Goya filled this lithograph with a crowd that's both celebrating and unsettled — a public ritual on the edge of becoming something else. Sketch a moment from your own life that holds two opposite feelings at once.",
  },
  {
    objectid: 227646,
    title: "Mural",
    artist: "Joan Miró",
    year: "1935",
    bitsyPrompt:
      "Miró believed the painting begins with a single shape that calls the next one into being. Start with one mark — a circle, a line, a smudge — and let each stroke decide the one that follows, with no plan in mind. Where does the conversation lead you?",
  },
  {
    objectid: 299931,
    title: "No. 2",
    artist: "Jackson Pollock",
    year: "1950",
    bitsyPrompt:
      "Pollock dripped paint while moving around the canvas on the floor — the painting recorded his body, not his hand. Try drawing with your whole arm instead of your wrist. How does the line change when your shoulder is doing the talking?",
  },
  {
    objectid: 232342,
    title: "Flight",
    artist: "David Smith",
    year: "1951",
    bitsyPrompt:
      "Smith welded steel lines into the air the way other artists draw on paper — sculpture you can almost see through. Sketch something heavy as if it were weightless. What lifts when you let the negative space carry as much weight as the form?",
  },
  {
    objectid: 317270,
    title: 'Large "Pushou" Monster Mask',
    artist: "Anonymous",
    year: "Late 7th – early 8th century",
    bitsyPrompt:
      "This mask was meant to scare evil spirits away from a doorway — protection through ferocity. Design a face that guards something you care about. What features does the face need so it's a little frightening, but also clearly on your side?",
  },
  {
    objectid: 230005,
    title: "Little Dancer, Aged Fourteen",
    artist: "Edgar Degas",
    year: "1880",
    bitsyPrompt:
      "Degas dressed his bronze in real fabric and a wig of human hair — sculpture that refused to stay sculpture. Pick one detail of an everyday object and render it more honestly than the rest. Does the realism in one place make everything else feel more dreamlike?",
  },
  {
    objectid: 228358,
    title: "Bamboo through the Four Seasons",
    artist: "Yoo Tok Chang",
    year: "mid 18th century",
    fallbackImageUrl:
      "https://mps.lib.harvard.edu/assets/image/DRS:17386759/full/!3000,3000/0/default.jpg",
    bitsyPrompt:
      "Yoo Tok Chang painted bamboo through all four seasons from a single leaf — the growth and decay held in one moment. Choose something in your life that cycles through change. Sketch it as if all its seasons exist at the same time.",
  },
  {
    objectid: 228378,
    title: "Landscape (composition cubiste)",
    artist: "Jean Metzinger",
    year: "1912",
    fallbackImageUrl:
      "https://scontent-bos5-1.xx.fbcdn.net/v/t39.30808-6/494753288_10229215892597283_3388564043821532722_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=e06c5d&_nc_ohc=DWcJrFTpgGEQ7kNvwGJqvl5&_nc_oc=AdqWo_LI2SlMOMXMhtn5LfH7MgdouMpp31D69NOwl1zQBfPrDiuSGSTydNgBVdgmBLY&_nc_zt=23&_nc_ht=scontent-bos5-1.xx&_nc_gid=9tsIaDGpvWaQliGNw7FmJA&_nc_ss=7b2a8&oh=00_Af5zN_Y_LPxl-fefxN1Xm6mhGHWEpTyVotyWZ9pafLUC9Q&oe=69FEEFB8",
    bitsyPrompt:
      "Metzinger painted a landscape from several viewpoints at once — the village seen as you'd remember it after walking through it, not as you'd photograph it. Draw a place you know by combining what it looks like, what it sounds like, and what it feels like to be there.",
  },
]

/* -------------------------------------------------------------------------- */
/* Soft-matching helpers                                                       */
/* -------------------------------------------------------------------------- */

/** Lower-case + strip diacritics + collapse whitespace for forgiving matches. */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/**
 * Find a curated entry whose title + artist roughly match the input. Returns
 * null when nothing comes close enough to be confident — callers should fall
 * back to the generic HAM search in that case.
 */
export function findCuratedMatch(input: { title?: string; artist?: string }): CuratedArtwork | null {
  const t = input.title ? normalize(input.title) : ""
  const a = input.artist ? normalize(input.artist) : ""
  if (!t) return null

  // Title equality is the strongest signal — use it first.
  const exactTitle = CURATED_ARTWORKS.filter((c) => normalize(c.title) === t)
  if (exactTitle.length === 1) return exactTitle[0]
  if (exactTitle.length > 1 && a) {
    const byArtist = exactTitle.find((c) => normalize(c.artist).includes(a) || a.includes(normalize(c.artist)))
    if (byArtist) return byArtist
  }

  // Title substring with artist confirmation — handles "Self-Portrait" → full title.
  if (a) {
    const found = CURATED_ARTWORKS.find((c) => {
      const ct = normalize(c.title)
      const ca = normalize(c.artist)
      const titleClose = ct.includes(t) || t.includes(ct)
      const artistClose = ca.includes(a) || a.includes(ca)
      return titleClose && artistClose
    })
    if (found) return found
  }

  return null
}

/** Look up a curated entry by its HAM Object ID. */
export function findCuratedById(objectid: number): CuratedArtwork | null {
  return CURATED_ARTWORKS.find((c) => c.objectid === objectid) ?? null
}
