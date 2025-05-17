import { NextResponse } from "next/server"
import { unlinkTelegramChat } from "@/lib/telegram-service"

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const success = await unlinkTelegramChat(userId)

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Failed to unlink Telegram chat" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error disconnecting Telegram:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
