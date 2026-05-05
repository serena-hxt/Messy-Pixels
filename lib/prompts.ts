import type { MakerProfileType } from "./storage"

export interface CreativePrompt {
  text: string
  profile: MakerProfileType
}

const PROMPT_POOLS: Record<MakerProfileType, string[]> = {
  visualizer: [
    "Expand the canvas. What might exist beyond the edge of this artwork?",
    "Change the mood using only color, pattern, or light.",
    "Redesign one visual detail to make the artwork feel more like your world.",
    "What colors are missing? Add them to transform the scene.",
    "Draw what this artwork would look like at a different time of day.",
  ],
  storyteller: [
    "What happened two seconds before this moment?",
    "Write the inner thought this person or place is hiding.",
    "Give this artwork a secret and reveal it in one sentence.",
    "What conversation just ended — or is about to begin?",
    "Add a caption that completely changes the meaning.",
  ],
  inhabitant: [
    "Step into the artwork. Where are you standing?",
    "What is the first sound, smell, or feeling you notice inside this scene?",
    "Choose one figure or object and speak from its point of view.",
    "If you lived here, what would your daily routine be?",
    "What would you touch first? Draw yourself reaching for it.",
  ],
  remixer: [
    "Add one object from today's world. How does it change the artwork?",
    "Turn this artwork into a meme, poster, or album cover.",
    "Move this scene into the future. What changes first?",
    "What if this artwork was an ad? What would it sell?",
    "Combine this artwork with your favorite movie or game.",
  ],
}

/**
 * Get a random prompt for the given maker profile.
 * Optionally exclude specific prompts to avoid repetition.
 */
export function getPromptForProfile(
  profile: MakerProfileType,
  exclude: string[] = []
): CreativePrompt {
  const pool = PROMPT_POOLS[profile].filter((p) => !exclude.includes(p))
  const available = pool.length > 0 ? pool : PROMPT_POOLS[profile]
  const text = available[Math.floor(Math.random() * available.length)]
  return { text, profile }
}

/**
 * Get all prompts for a given profile.
 */
export function getAllPromptsForProfile(profile: MakerProfileType): string[] {
  return PROMPT_POOLS[profile]
}

/**
 * Get a prompt from a different profile (for "Try Another Profile" feature).
 */
export function getPromptFromOtherProfile(
  currentProfile: MakerProfileType,
  targetProfile: MakerProfileType
): CreativePrompt {
  const pool = PROMPT_POOLS[targetProfile]
  const text = pool[Math.floor(Math.random() * pool.length)]
  return { text, profile: targetProfile }
}

/**
 * Shuffle to get a different prompt from the same profile.
 */
export function shufflePrompt(
  profile: MakerProfileType,
  currentPrompt: string
): CreativePrompt {
  return getPromptForProfile(profile, [currentPrompt])
}

/**
 * Free create prompt — no constraints.
 */
export const FREE_CREATE_PROMPT: CreativePrompt = {
  text: "Create freely — no rules, no limits.",
  profile: "remixer", // Closest match for free-form
}

/**
 * Remix prompt for responding to community creations.
 */
export const REMIX_PROMPT: CreativePrompt = {
  text: "Remix this response in your own way.",
  profile: "remixer",
}
