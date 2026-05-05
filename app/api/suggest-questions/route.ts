import { generateText, Output } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"

export const maxDuration = 30

export async function POST(req: Request) {
  const { answer } = (await req.json()) as { answer: string }

  if (!answer || answer.trim().length === 0) {
    return Response.json({ questions: [] })
  }

  try {
    const { experimental_output } = await generateText({
      model: google("gemini-2.5-flash"),
      system: `You suggest follow-up questions for a museum-companion chatbot called Bitsy.

Given Bitsy's previous answer, generate exactly 2 brief, curious follow-up questions that encourage deeper exploration of the artwork, artist, technique, movement, or historical context mentioned. Each question should be 6–14 words, open-ended, and feel like a natural next step in conversation.`,
      prompt: `Bitsy just said:\n\n"${answer}"\n\nSuggest 2 follow-up questions a curious museum visitor might ask next.`,
      experimental_output: Output.object({
        schema: z.object({
          questions: z
            .array(z.string())
            .length(2)
            .describe("Exactly two follow-up questions"),
        }),
      }),
      providerOptions: {
        google: {
          thinkingConfig: { thinkingBudget: 0 },
        },
      },
    })

    return Response.json({
      questions: experimental_output.questions.slice(0, 2),
    })
  } catch (error) {
    console.error("[v0] Suggest questions error:", error)
    return Response.json({ questions: [] })
  }
}
