import { createNotification } from "./firebase/notifications"
import {
  sendTaskInvitationEmail,
  sendWorkspaceInvitationEmail,
  sendTaskAssignmentEmail,
  sendTaskCompletionEmail,
  sendTaskApprovalRequestEmail,
  sendTaskApprovedEmail,
  sendTaskRejectedEmail,
  sendCommentNotificationEmail,
  sendEmail,
} from "./email-service"
import { getUser } from "./firebase/auth"
import { getTask } from "./firebase/db"
import { getWorkspace } from "./firebase/workspace"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "./firebase/config"
// Add import for the telegram formatter
import { sendTelegramMessage, getUserTelegramChatId } from "./telegram-service"
import { formatTelegramNotification } from "./telegram-formatter"

// Add import for the error handler utilities
import { logError, safeExecute } from "./utils/error-handler"

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
      case "test_notification":
        // For test notifications, force all channels
        channels = "both"
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

    // Send Telegram notification if enabled or if it's a test notification
    if (
      type === "test_notification" ||
      channels === "telegram" ||
      (channels === "both" && preferences.telegramEnabled)
    ) {
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
      console.log(`[EMAIL SERVICE] Cannot send email: User ${userId} has no email address`)
      return
    }

    // Get the app URL for building links
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://worktrac.app"

    // Format action URL to be a full URL if it's not already
    let fullActionUrl = actionUrl
    if (actionUrl && !actionUrl.startsWith("http")) {
      fullActionUrl = `${appUrl}${actionUrl.startsWith("/") ? actionUrl : `/${actionUrl}`}`
    }

    // Send different types of emails based on notification type
    switch (type) {
      case "task_invitation":
      case "subtask_invitation": {
        const taskId = metadata?.taskId
        if (taskId) {
          await safeExecute(
            "EMAIL SERVICE",
            "sending task invitation",
            async () => {
              const task = await getTask(taskId)
              const inviter = metadata?.inviterId ? await getUser(metadata.inviterId) : null
              const workspace = metadata?.workspaceId ? await getWorkspace(metadata.workspaceId) : null

              if (task && inviter) {
                const result = await sendTaskInvitationEmail(
                  user.email,
                  inviter.name || "A team member",
                  task.title,
                  workspace?.name || "",
                )

                if (!result.success) {
                  logError("EMAIL SERVICE", "Failed to send task invitation email", result.error)
                }
                return result
              } else {
                console.log(`[EMAIL SERVICE] Cannot send task invitation: Missing task or inviter data`)
                return { success: false, error: "Missing task or inviter data" }
              }
            },
            { success: false, error: "Failed to process task invitation" },
          )
        }
        break
      }

      case "workspace_invitation": {
        const workspaceId = metadata?.workspaceId
        if (workspaceId) {
          await safeExecute(
            "EMAIL SERVICE",
            "sending workspace invitation",
            async () => {
              const workspace = await getWorkspace(workspaceId)
              const inviter = metadata?.inviterId ? await getUser(metadata.inviterId) : null

              if (workspace && inviter) {
                const result = await sendWorkspaceInvitationEmail(
                  user.email,
                  inviter.name || "A team member",
                  workspace.name,
                )

                if (!result.success) {
                  logError("EMAIL SERVICE", "Failed to send workspace invitation email", result.error)
                }
                return result
              } else {
                console.log(`[EMAIL SERVICE] Cannot send workspace invitation: Missing workspace or inviter data`)
                return { success: false, error: "Missing workspace or inviter data" }
              }
            },
            { success: false, error: "Failed to process workspace invitation" },
          )
        }
        break
      }

      case "task_assignment": {
        const taskId = metadata?.taskId
        if (taskId) {
          await safeExecute(
            "EMAIL SERVICE",
            "sending task assignment notification",
            async () => {
              const task = await getTask(taskId)
              const assigner = metadata?.assignerId ? await getUser(metadata.assignerId) : null

              if (task && assigner) {
                const result = await sendTaskAssignmentEmail(
                  user.email,
                  assigner.name || "A team member",
                  task.title,
                  task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "",
                  `${appUrl}/task/${taskId}`,
                )

                if (!result.success) {
                  logError("EMAIL SERVICE", "Failed to send task assignment email", result.error)
                }
                return result
              } else {
                console.log(`[EMAIL SERVICE] Cannot send task assignment: Missing task or assigner data`)
                return { success: false, error: "Missing task or assigner data" }
              }
            },
            { success: false, error: "Failed to process task assignment" },
          )
        }
        break
      }

      case "task_completed": {
        const taskId = metadata?.taskId
        if (taskId) {
          await safeExecute(
            "EMAIL SERVICE",
            "sending task completion notification",
            async () => {
              const task = await getTask(taskId)
              const completer = metadata?.completerId ? await getUser(metadata.completerId) : null

              if (task && completer) {
                const result = await sendTaskCompletionEmail(
                  user.email,
                  completer.name || "A team member",
                  task.title,
                  `${appUrl}/task/${taskId}`,
                )

                if (!result.success) {
                  logError("EMAIL SERVICE", "Failed to send task completion email", result.error)
                }
                return result
              } else {
                console.log(`[EMAIL SERVICE] Cannot send task completion: Missing task or completer data`)
                return { success: false, error: "Missing task or completer data" }
              }
            },
            { success: false, error: "Failed to process task completion" },
          )
        }
        break
      }

      case "task_approval_request": {
        const taskId = metadata?.taskId
        if (taskId) {
          await safeExecute(
            "EMAIL SERVICE",
            "sending task approval request",
            async () => {
              const task = await getTask(taskId)
              const requester = metadata?.requesterId ? await getUser(metadata.requesterId) : null

              if (task && requester) {
                const result = await sendTaskApprovalRequestEmail(
                  user.email,
                  requester.name || "A team member",
                  task.title,
                  `${appUrl}/task/${taskId}?action=approve`,
                )

                if (!result.success) {
                  logError("EMAIL SERVICE", "Failed to send task approval request email", result.error)
                }
                return result
              } else {
                console.log(`[EMAIL SERVICE] Cannot send task approval request: Missing task or requester data`)
                return { success: false, error: "Missing task or requester data" }
              }
            },
            { success: false, error: "Failed to process task approval request" },
          )
        }
        break
      }

      case "task_approved": {
        const taskId = metadata?.taskId
        if (taskId) {
          await safeExecute(
            "EMAIL SERVICE",
            "sending task approved notification",
            async () => {
              const task = await getTask(taskId)
              const approver = metadata?.approverId ? await getUser(metadata.approverId) : null

              if (task && approver) {
                const result = await sendTaskApprovedEmail(
                  user.email,
                  approver.name || "A team member",
                  task.title,
                  `${appUrl}/task/${taskId}`,
                )

                if (!result.success) {
                  logError("EMAIL SERVICE", "Failed to send task approved email", result.error)
                }
                return result
              } else {
                console.log(`[EMAIL SERVICE] Cannot send task approved: Missing task or approver data`)
                return { success: false, error: "Missing task or approver data" }
              }
            },
            { success: false, error: "Failed to process task approved notification" },
          )
        }
        break
      }

      case "task_rejected": {
        const taskId = metadata?.taskId
        if (taskId) {
          await safeExecute(
            "EMAIL SERVICE",
            "sending task rejected notification",
            async () => {
              const task = await getTask(taskId)
              const rejector = metadata?.rejectorId ? await getUser(metadata.rejectorId) : null

              if (task && rejector) {
                const result = await sendTaskRejectedEmail(
                  user.email,
                  rejector.name || "A team member",
                  task.title,
                  metadata?.reason || "No reason provided",
                  `${appUrl}/task/${taskId}`,
                )

                if (!result.success) {
                  logError("EMAIL SERVICE", "Failed to send task rejected email", result.error)
                }
                return result
              } else {
                console.log(`[EMAIL SERVICE] Cannot send task rejected: Missing task or rejector data`)
                return { success: false, error: "Missing task or rejector data" }
              }
            },
            { success: false, error: "Failed to process task rejected notification" },
          )
        }
        break
      }

      case "comment_added": {
        const taskId = metadata?.taskId
        if (taskId) {
          await safeExecute(
            "EMAIL SERVICE",
            "sending comment notification",
            async () => {
              const task = await getTask(taskId)
              const commenter = metadata?.commenterId ? await getUser(metadata.commenterId) : null

              if (task && commenter) {
                const result = await sendCommentNotificationEmail(
                  user.email,
                  commenter.name || "A team member",
                  task.title,
                  metadata?.comment || "New comment",
                  `${appUrl}/task/${taskId}#comments`,
                )

                if (!result.success) {
                  logError("EMAIL SERVICE", "Failed to send comment notification email", result.error)
                }
                return result
              } else {
                console.log(`[EMAIL SERVICE] Cannot send comment notification: Missing task or commenter data`)
                return { success: false, error: "Missing task or commenter data" }
              }
            },
            { success: false, error: "Failed to process comment notification" },
          )
        }
        break
      }

      case "test_notification": {
        // Send a test email with generic content
        await safeExecute(
          "EMAIL SERVICE",
          "sending test notification",
          async () => {
            const result = await sendEmail({
              type: "test_notification",
              email: user.email,
              subject: "Test Notification from WorkTrac",
              data: {
                userName: user.name || "there",
                messageContent: message || "This is a test notification from WorkTrac.",
              },
            })

            if (!result.success) {
              logError("EMAIL SERVICE", "Failed to send test notification email", result.error)
            }
            return result
          },
          { success: false, error: "Failed to send test notification" },
        )
        break
      }

      default:
        // Generic email for other notification types
        console.log(`[EMAIL SERVICE] Unhandled notification type: ${type}`)
        await sendEmail({
          type: "generic_notification",
          email: user.email,
          subject: title,
          data: {
            userName: user.name || "there",
            messageTitle: title,
            messageContent: message,
            actionUrl: fullActionUrl,
          },
        })
        break
    }
  } catch (error) {
    logError("EMAIL SERVICE", "Error sending email notification", error)
  }
}
