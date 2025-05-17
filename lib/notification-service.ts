import { createNotification } from "./firebase/notifications"
import { sendTaskInvitationEmail, sendWorkspaceInvitationEmail } from "./email-service"
import { getUser } from "./firebase/auth"
import { getTask } from "./firebase/db"
import { getWorkspace } from "./firebase/workspace"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "./firebase/config"
// Add import for the telegram formatter
import { sendTelegramMessage, getUserTelegramChatId } from "./telegram-service"
import { formatTelegramNotification } from "./telegram-formatter"

// Notification types
export type NotificationChannel = "push" | "email" | "telegram" | "both" | "none"

// User notification preferences interface
export interface NotificationPreferences {
  taskAssignment: NotificationChannel
  taskInvitation: NotificationChannel
  taskCompletion: NotificationChannel
  taskApproval: NotificationChannel
  workspaceInvitation: NotificationChannel
  comments: NotificationChannel
  telegramEnabled?: boolean
}

// Default notification preferences
export const defaultNotificationPreferences: NotificationPreferences = {
  taskAssignment: "both",
  taskInvitation: "both",
  taskCompletion: "both",
  taskApproval: "both",
  workspaceInvitation: "both",
  comments: "push",
  telegramEnabled: false,
}

// Get user notification preferences
export async function getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      return defaultNotificationPreferences
    }

    const userData = userDoc.data()
    return {
      ...defaultNotificationPreferences,
      ...(userData.notificationPreferences || {}),
    }
  } catch (error) {
    console.error("Error getting user notification preferences:", error)
    return defaultNotificationPreferences
  }
}

// Update user notification preferences
export async function updateUserNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>,
): Promise<void> {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      notificationPreferences: preferences,
    })
  } catch (error) {
    console.error("Error updating user notification preferences:", error)
    throw error
  }
}

// Main notification function that handles both in-app, push, and email notifications
export async function sendNotification({
  userId,
  type,
  title,
  message,
  actionUrl,
  relatedId,
  metadata = {},
}: {
  userId: string
  type: string
  title: string
  message: string
  actionUrl?: string
  relatedId?: string
  metadata?: Record<string, any>
}): Promise<void> {
  try {
    // Get user notification preferences
    const preferences = await getUserNotificationPreferences(userId)

    // Determine which channels to use based on notification type and user preferences
    let channels: NotificationChannel = "none"

    switch (type) {
      case "task_invitation":
      case "subtask_invitation":
        channels = preferences.taskInvitation
        break
      case "task_assignment":
        channels = preferences.taskAssignment
        break
      case "task_completed":
        channels = preferences.taskCompletion
        break
      case "task_approval_request":
      case "task_approved":
      case "task_rejected":
        channels = preferences.taskApproval
        break
      case "workspace_invitation":
        channels = preferences.workspaceInvitation
        break
      case "comment_added":
        channels = preferences.comments
        break
      default:
        channels = "push" // Default to push only
    }

    // Always create in-app notification
    await createNotification({
      userId,
      type: type as any,
      title,
      message,
      actionUrl,
      relatedId,
      metadata,
    })

    // Send push notification if enabled
    if (channels === "push" || channels === "both") {
      await sendPushNotification(userId, title, message, actionUrl)
    }

    // Send email notification if enabled
    if (channels === "email" || channels === "both") {
      await sendEmailNotification(userId, type, title, message, actionUrl, metadata)
    }

    // Send Telegram notification if enabled
    if (channels === "telegram" || (channels === "both" && preferences.telegramEnabled)) {
      await sendTelegramNotification(userId, type, title, message, actionUrl, metadata)
    }
  } catch (error) {
    console.error("Error sending notification:", error)
  }
}

// Add this new function for sending Telegram notifications
async function sendTelegramNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  actionUrl?: string,
  metadata?: Record<string, any>,
): Promise<void> {
  try {
    // Get user's Telegram chat ID
    const chatId = await getUserTelegramChatId(userId)

    if (!chatId) {
      // User hasn't linked their Telegram account
      return
    }

    // Format the message for Telegram
    const formattedMessage = await formatTelegramNotification(type, title, message, actionUrl, metadata)

    // Send the message
    await sendTelegramMessage(chatId, formattedMessage, {
      parseMode: "Markdown",
      disableWebPagePreview: false,
    })
  } catch (error) {
    console.error("Error sending Telegram notification:", error)
  }
}

// Send push notification
async function sendPushNotification(userId: string, title: string, message: string, actionUrl?: string): Promise<void> {
  try {
    // Get user's push subscription
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      return
    }

    const userData = userDoc.data()
    const pushSubscription = userData.pushSubscription

    if (!pushSubscription) {
      // User hasn't subscribed to push notifications
      return
    }

    // In a production environment, you would use the Web Push API or Firebase Cloud Messaging
    // to send the actual push notification to the user's device
    console.log(`[PUSH SERVICE] Sending push notification to user ${userId}:`, {
      title,
      message,
      actionUrl,
    })

    // This is where you would integrate with FCM or Web Push API
    // For now, we'll just log it
  } catch (error) {
    console.error("Error sending push notification:", error)
  }
}

// Send email notification
async function sendEmailNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  actionUrl?: string,
  metadata?: Record<string, any>,
): Promise<void> {
  try {
    // Get user details
    const user = await getUser(userId)

    if (!user || !user.email) {
      return
    }

    // Send different types of emails based on notification type
    switch (type) {
      case "task_invitation":
      case "subtask_invitation": {
        const taskId = metadata?.taskId
        if (taskId) {
          const task = await getTask(taskId)
          const inviter = metadata?.inviterId ? await getUser(metadata.inviterId) : null

          if (task && inviter) {
            await sendTaskInvitationEmail(user.email, inviter.name || "A team member", task.title)
          }
        }
        break
      }

      case "workspace_invitation": {
        const workspaceId = metadata?.workspaceId
        if (workspaceId) {
          const workspace = await getWorkspace(workspaceId)
          const inviter = metadata?.inviterId ? await getUser(metadata.inviterId) : null

          if (workspace && inviter) {
            await sendWorkspaceInvitationEmail(user.email, inviter.name || "A team member", workspace.name)
          }
        }
        break
      }

      case "task_approval_request":
      case "task_approved":
      case "task_rejected": {
        // These would be implemented with specific email templates
        console.log(`[EMAIL SERVICE] Sending ${type} email to ${user.name} (${user.email})`)
        break
      }

      default:
        // Generic email for other notification types
        console.log(`[EMAIL SERVICE] Sending notification email to ${user.name} (${user.email})`)
        console.log(`Subject: ${title}`)
        console.log(`Message: ${message}`)
        break
    }
  } catch (error) {
    console.error("Error sending email notification:", error)
  }
}
