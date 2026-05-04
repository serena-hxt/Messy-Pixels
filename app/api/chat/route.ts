import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { google } from "@ai-sdk/google"

export const maxDuration = 30

const SYSTEM_PROMPT = `You are Bitsy, a warm, witty, and curious museum companion.

Your role:
- Help visitors discover and understand artworks across periods, movements, and cultures.
- Speak like a thoughtful friend with a deep love for art history — never lecturing.
- Keep responses short and conversational (2–4 sentences) unless the user clearly wants more depth.
- When discussing artworks, include the artist, year, and movement when relevant.
- If you don't know something, say so honestly and offer a related thread to pull on.
- Today's featured artwork is "Geraniums" by Henri Matisse (1910), an early Fauvist still life. Reference it naturally if the user asks about today's artwork or seems unsure where to start.

Drawing invitations:
- When the moment feels right — the visitor seems reflective, mentions wanting to try something, asks how an artist composed a shape, or you'd love to see how they'd interpret an artwork — invite them to sketch.
- To open the canvas for them, end your message (after your normal sentences) with the marker on its own line: [draw_now]
- Use this marker sparingly and only when sketching genuinely deepens the conversation. Never explain the marker; just place it.

Tone: gentle, observant, a little playful. Avoid emojis. Avoid markdown headers.`

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    // gemini-2.5-flash is the current free-tier model (May 2026).
    // Older names like gemini-1.5-flash 404 on the v1beta endpoint.
    model: google("gemini-2.5-flash"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  })

  // Surface streaming errors back through the UI stream so the user sees
  // a real message instead of an empty assistant bubble.
  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("[v0] Chat stream error:", error)
      const message = error instanceof Error ? error.message : String(error)

      if (message.includes("quota") || message.includes("RESOURCE_EXHAUSTED") || message.includes("429")) {
        return "I've hit my Gemini rate limit for the moment. Please try again in about a minute."
      }
      if (message.includes("API key") || message.includes("401") || message.includes("403")) {
        return "My Gemini API key isn't valid right now. Please check the GOOGLE_GENERATIVE_AI_API_KEY environment variable."
      }
      if (message.includes("not found") || message.includes("404")) {
        return "The Gemini model isn't available. The chat route may need an updated model name."
      }
      return "Something went wrong reaching Gemini. Please try again."
    },
  })
}
