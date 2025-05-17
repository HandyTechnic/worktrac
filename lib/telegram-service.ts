import { db } from "./firebase/config"
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore"

// Store your Telegram bot token as an environment variable
// IMPORTANT: This should be stored securely in your environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

// Base URL for Telegram Bot API
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

/**
 * Send a message to a Telegram chat
 */
export async function sendTelegramMessage(
  chatId: string,
  message: string,
  options: {
    parseMode?: "HTML" | "Markdown" | "MarkdownV2"
    disableWebPagePreview?: boolean
    disableNotification?: boolean
    replyToMessageId?: number
  } = {},
): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: options.parseMode,
        disable_web_page_preview: options.disableWebPagePreview,
        disable_notification: options.disableNotification,
        reply_to_message_id: options.replyToMessageId,
      }),
    })

    const data = await response.json()
    return data.ok
  } catch (error) {
    console.error("Error sending Telegram message:", error)
    return false
  }
}

/**
 * Get information about the bot
 */
export async function getTelegramBotInfo() {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/getMe`)
    return await response.json()
  } catch (error) {
    console.error("Error getting Telegram bot info:", error)
    return null
  }
}

/**
 * Link a user's Telegram chat ID to their account
 */
export async function linkTelegramChat(userId: string, telegramChatId: string): Promise<boolean> {
  try {
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      console.error("User not found")
      return false
    }

    // Update user document with Telegram chat ID
    await updateDoc(userRef, {
      telegramChatId,
      telegramLinked: true,
    })

    // Also update notification preferences if they exist
    const prefsRef = doc(db, "userNotificationPreferences", userId)
    const prefsDoc = await getDoc(prefsRef)

    if (prefsDoc.exists()) {
      await updateDoc(prefsRef, {
        telegramEnabled: true,
      })
    } else {
      // Create notification preferences if they don't exist
      await setDoc(prefsRef, {
        telegramEnabled: true,
        taskAssignment: "both",
        taskInvitation: "both",
        taskCompletion: "both",
        taskApproval: "both",
        workspaceInvitation: "both",
        comments: "push",
      })
    }

    return true
  } catch (error) {
    console.error("Error linking Telegram chat:", error)
    return false
  }
}

/**
 * Unlink a user's Telegram chat
 */
export async function unlinkTelegramChat(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, "users", userId)

    // Update user document to remove Telegram chat ID
    await updateDoc(userRef, {
      telegramChatId: null,
      telegramLinked: false,
    })

    // Update notification preferences
    const prefsRef = doc(db, "userNotificationPreferences", userId)
    const prefsDoc = await getDoc(prefsRef)

    if (prefsDoc.exists()) {
      await updateDoc(prefsRef, {
        telegramEnabled: false,
      })
    }

    return true
  } catch (error) {
    console.error("Error unlinking Telegram chat:", error)
    return false
  }
}

/**
 * Get a user's Telegram chat ID
 */
export async function getUserTelegramChatId(userId: string): Promise<string | null> {
  try {
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      return null
    }

    const userData = userDoc.data()
    return userData.telegramChatId || null
  } catch (error) {
    console.error("Error getting user Telegram chat ID:", error)
    return null
  }
}

/**
 * Generate a unique verification code for linking Telegram
 */
export async function generateTelegramVerificationCode(userId: string): Promise<string> {
  // Generate a random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString()

  try {
    // Store the code in the user's document with an expiration time (30 minutes)
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      telegramVerificationCode: code,
      telegramVerificationExpires: Date.now() + 30 * 60 * 1000, // 30 minutes
    })

    return code
  } catch (error) {
    console.error("Error generating Telegram verification code:", error)
    throw error
  }
}

/**
 * Verify a Telegram verification code
 */
export async function verifyTelegramCode(userId: string, code: string, telegramChatId: string): Promise<boolean> {
  try {
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      return false
    }

    const userData = userDoc.data()

    // Check if code is valid and not expired
    if (userData.telegramVerificationCode === code && userData.telegramVerificationExpires > Date.now()) {
      // Link the Telegram chat ID to the user
      await linkTelegramChat(userId, telegramChatId)

      // Clear the verification code
      await updateDoc(userRef, {
        telegramVerificationCode: null,
        telegramVerificationExpires: null,
      })

      return true
    }

    return false
  } catch (error) {
    console.error("Error verifying Telegram code:", error)
    return false
  }
}
