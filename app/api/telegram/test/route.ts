import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ error: "Telegram bot token not configured" }, { status: 500 })
    }

    // Get bot info to verify the token is valid
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`)

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ error: "Telegram API error", details: errorData }, { status: response.status })
    }

    const data = await response.json()

    // Get webhook info to verify it's properly set
    const webhookResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`)
    const webhookData = await webhookResponse.json()

    return NextResponse.json({
      botInfo: data,
      webhookInfo: webhookData,
    })
  } catch (error) {
    console.error("Error testing Telegram bot:", error)
    return NextResponse.json({ error: "Failed to test Telegram bot", details: error.message }, { status: 500 })
  }
}
