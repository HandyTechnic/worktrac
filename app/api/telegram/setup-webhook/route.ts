import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ error: "Telegram bot token not configured" }, { status: 500 })
    }

    // Get the URL from the request
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`
    const webhookUrl = `${baseUrl}/api/telegram/webhook`

    console.log(`Setting webhook URL to: ${webhookUrl}`)

    // Set the webhook URL using POST method instead of GET
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhookUrl,
        drop_pending_updates: true,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Telegram API error:", errorData)
      return NextResponse.json({ error: "Telegram API error", details: errorData }, { status: response.status })
    }

    const data = await response.json()
    console.log("Webhook setup response:", data)

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error setting up webhook:", error)
    return NextResponse.json({ error: "Failed to set up webhook", details: error.message }, { status: 500 })
  }
}
