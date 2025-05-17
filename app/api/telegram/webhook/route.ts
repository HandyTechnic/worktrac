import { NextResponse } from "next/server"
import { verifyTelegramCode } from "@/lib/telegram-service"
import { db } from "@/lib/firebase/config"
import { collection, query, where, getDocs } from "firebase/firestore"

// This is the webhook that Telegram will call when a user interacts with your bot
export async function POST(request: Request) {
  try {
    const update = await request.json()

    // Check if this is a message
    if (!update.message) {
      return NextResponse.json({ status: "ok" })
    }

    const { message } = update
    const chatId = message.chat.id.toString()
    const text = message.text || ""

    // Handle commands
    if (text.startsWith("/start")) {
      // Send welcome message
      await sendWelcomeMessage(chatId)
      return NextResponse.json({ status: "ok" })
    }

    // Handle verification codes
    if (/^\d{6}$/.test(text)) {
      // This looks like a verification code
      await handleVerificationCode(chatId, text)
      return NextResponse.json({ status: "ok" })
    }

    // Default response for unrecognized messages
    await sendDefaultResponse(chatId)
    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("Error handling Telegram webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function sendWelcomeMessage(chatId: string) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  const message = `
Welcome to the WorkTrac notification bot! 🚀

To link your Telegram account with WorkTrac:
1. Go to your WorkTrac profile settings
2. Click on "Notifications"
3. Find the Telegram section and click "Connect"
4. Enter the verification code you receive here

Once connected, you'll receive notifications about your tasks, invitations, and more directly in this chat.
`

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    }),
  })
}

async function handleVerificationCode(chatId: string, code: string) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

  try {
    // Find user with this verification code
    const usersRef = collection(db, "users")
    const q = query(usersRef, where("telegramVerificationCode", "==", code))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      // No user found with this code
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "⚠️ Invalid or expired verification code. Please try again with a new code from your WorkTrac settings.",
        }),
      })
      return
    }

    // Get the user ID
    const userId = querySnapshot.docs[0].id

    // Verify the code and link the chat
    const success = await verifyTelegramCode(userId, code, chatId)

    if (success) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "✅ Success! Your Telegram account is now linked to WorkTrac. You will receive notifications here.",
        }),
      })
    } else {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "⚠️ Invalid or expired verification code. Please try again with a new code from your WorkTrac settings.",
        }),
      })
    }
  } catch (error) {
    console.error("Error handling verification code:", error)
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "❌ An error occurred. Please try again later.",
      }),
    })
  }
}

async function sendDefaultResponse(chatId: string) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  const message = `
I'm your WorkTrac notification bot. I'll send you updates about your tasks and workspaces.

If you're trying to connect your account, please use the verification code from your WorkTrac settings.

Need help? Type /start for instructions.
`

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
    }),
  })
}
