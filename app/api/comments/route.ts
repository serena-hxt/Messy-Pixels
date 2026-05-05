import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const artworkId = url.searchParams.get("artworkId")

  if (!artworkId) {
    return NextResponse.json({ error: "artworkId is required" }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("artwork_comments")
      .select("id, nickname, content, created_at")
      .eq("artwork_id", parseInt(artworkId, 10))
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("[v0] Comments fetch error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ comments: data ?? [] })
  } catch (err) {
    console.error("[v0] Comments fetch exception:", err)
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { artworkId, nickname, content } = body

    if (!artworkId || !content) {
      return NextResponse.json(
        { error: "artworkId and content are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("artwork_comments")
      .insert({
        artwork_id: parseInt(artworkId, 10),
        nickname: "Anonymous",
        content: content.trim().slice(0, 500), // Cap at 500 chars
      })
      .select("id, nickname, content, created_at")
      .single()

    if (error) {
      console.error("[v0] Comment insert error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ comment: data })
  } catch (err) {
    console.error("[v0] Comment insert exception:", err)
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 })
  }
}
