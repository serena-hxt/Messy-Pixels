import { streamText } from "ai"
import { google } from "@ai-sdk/google"

export const maxDuration = 30

export async function POST(req: Request) {
  const { answer } = (await req.json()) as { answer: string }

  if (!answer || answer.trim().length === 0) {
    return Response.json({ questions: [] })
  }

  try {
    const result = await streamText({
      model: google("gemini-2.5-flash"),
      system: `You are a helpful assistant that suggests follow-up questions. Given an answer from Bitsy (a museum companion chatbot), generate exactly 2 brief, curious follow-up questions that encourage deeper exploration of the topic.

Rules:
- Return ONLY a JSON object with a "questions" array containing exactly 2 strings.
- Each question should be 8–15 words.
- Questions should be about the artwork, artist, or concept mentioned.
- Make them open-ended and thought-provoking.
- Do NOT explain, do NOT add commentary.

Example output:
{"questions": ["What inspired Matisse to use such bold colors?", "How does this compare to his later cut-out works?"]}`,
      prompt: `Based on this answer, suggest 2 follow-up questions:\n\n${answer}`,
      thinkingConfig: { thinkingBudget: 0 },
    }).text

    try {
      const parsed = JSON.parse(result)
      return Response.json({
        questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 2) : [],
      })
    } catch {
      return Response.json({ questions: [] })
    }
  } catch (error) {
    console.error("[v0] Suggest questions error:", error)
    return Response.json({ questions: [] })
  }
}
