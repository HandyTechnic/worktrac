import { NextResponse } from "next/server"
import { getUserTelegramChatId, sendTelegramMessage } from "@/lib/telegram-service"
import { formatTelegramNotification } from "@/lib/telegram-formatter"

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Get the user's Telegram chat ID
    const chatId = await getUserTelegramChatId(userId)
    console.log("Found Telegram chat ID:", chatId)

    if (!chatId) {
      return NextResponse.json({ error: "User does not have a Telegram chat ID" }, { status: 400 })
    }

    // Format the test message
    const message = await formatTelegramNotification(
      "test_notification",
      "Test Notification",
      "This is a test notification. If you're seeing this, your Telegram integration is working!",
      "/profile?tab=notifications",
      { timestamp: new Date().toISOString() },
    )

    // Send the message directly
    const success = await sendTelegramMessage(chatId, message, {
      parseMode: "Markdown",
      disableWebPagePreview: false,
    })

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Failed to send Telegram message" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error sending test notification:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
