import { generateText, Output } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"

export const maxDuration = 30

const RecognitionSchema = z.object({
  recognized: z
    .boolean()
    .describe("true ONLY if a specific, identifiable famous artwork (painting, sculpture, drawing) is clearly visible"),
  title: z.string().nullable().describe("Title of the artwork, or null if unknown"),
  artist: z.string().nullable().describe("Artist's full name, or null if unknown"),
  year: z.string().nullable().describe("Year or year range as a string, or null if unknown"),
  confidence: z.number().describe("Confidence between 0 and 1"),
})

export async function POST(req: Request) {
  try {
    const { image } = await req.json()
    if (!image || typeof image !== "string") {
      return Response.json({ recognized: false, title: null, artist: null, year: null, confidence: 0 })
    }

    const result = await generateText({
      // Gemini 2.5 Flash supports vision + structured output. Using Google
      // here keeps recognition on the same provider that powers chat, so the
      // app only needs one API key to function end-to-end.
      model: google("gemini-2.5-flash"),
      experimental_output: Output.object({ schema: RecognitionSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "You are a museum vision system. Analyze this camera frame. " +
                "If you can clearly identify a SPECIFIC famous artwork (painting, sculpture, or drawing) — even from a partial or angled view — return its title, artist, and year. " +
                "Be generous with well-known masterworks but conservative with obscure ones. " +
                "If the frame shows a person, room, hand, blank wall, random object, or anything you cannot identify as a specific known artwork, set recognized=false with low confidence. " +
                "Never guess. Only set recognized=true when confidence > 0.7.",
            },
            { type: "image", image },
          ],
        },
      ],
    })

    return Response.json(result.experimental_output)
  } catch (e) {
    console.log("[v0] recognize route error:", e instanceof Error ? e.message : e)
    return Response.json({ recognized: false, title: null, artist: null, year: null, confidence: 0 })
  }
}
