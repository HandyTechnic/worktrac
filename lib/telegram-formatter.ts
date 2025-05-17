import { getUser } from "./firebase/auth"
import { getTask } from "./firebase/db"
import { getWorkspace } from "./firebase/workspace"

/**
 * Format a notification for Telegram
 */
export async function formatTelegramNotification(
  type: string,
  title: string,
  message: string,
  actionUrl?: string,
  metadata?: Record<string, any>,
): Promise<string> {
  let formattedMessage = ""

  switch (type) {
    case "task_invitation":
    case "subtask_invitation": {
      const taskId = metadata?.taskId
      const inviterId = metadata?.inviterId

      if (taskId && inviterId) {
        try {
          const [task, inviter] = await Promise.all([getTask(taskId), getUser(inviterId)])

          if (task && inviter) {
            formattedMessage = `
🔔 *Task Invitation*

You've been invited by *${inviter.name || "a team member"}* to collaborate on:
*${task.title}*

${task.description ? `"${task.description.substring(0, 100)}${task.description.length > 100 ? "..." : ""}"` : ""}

📅 Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
`
          }
        } catch (error) {
          console.error("Error formatting task invitation:", error)
        }
      }
      break
    }

    case "task_assignment": {
      const taskId = metadata?.taskId
      const assignerId = metadata?.assignerId

      if (taskId) {
        try {
          const [task, assigner] = await Promise.all([
            getTask(taskId),
            assignerId ? getUser(assignerId) : Promise.resolve(null),
          ])

          if (task) {
            formattedMessage = `
📋 *Task Assignment*

You've been assigned ${assigner ? `by *${assigner.name}*` : ""} to:
*${task.title}*

${task.description ? `"${task.description.substring(0, 100)}${task.description.length > 100 ? "..." : ""}"` : ""}

📅 Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
🔄 Status: ${task.status || "Not started"}
`
          }
        } catch (error) {
          console.error("Error formatting task assignment:", error)
        }
      }
      break
    }

    case "task_completed": {
      const taskId = metadata?.taskId
      const completerId = metadata?.completerId

      if (taskId) {
        try {
          const [task, completer] = await Promise.all([
            getTask(taskId),
            completerId ? getUser(completerId) : Promise.resolve(null),
          ])

          if (task) {
            formattedMessage = `
✅ *Task Completed*

${completer ? `*${completer.name}*` : "Someone"} has completed:
*${task.title}*

${task.description ? `"${task.description.substring(0, 100)}${task.description.length > 100 ? "..." : ""}"` : ""}
`
          }
        } catch (error) {
          console.error("Error formatting task completion:", error)
        }
      }
      break
    }

    case "workspace_invitation": {
      const workspaceId = metadata?.workspaceId
      const inviterId = metadata?.inviterId

      if (workspaceId && inviterId) {
        try {
          const [workspace, inviter] = await Promise.all([getWorkspace(workspaceId), getUser(inviterId)])

          if (workspace && inviter) {
            formattedMessage = `
🏢 *Workspace Invitation*

You've been invited by *${inviter.name || "a team member"}* to join:
*${workspace.name}*

${workspace.description || ""}
`
          }
        } catch (error) {
          console.error("Error formatting workspace invitation:", error)
        }
      }
      break
    }

    case "comment_added": {
      const taskId = metadata?.taskId
      const commenterId = metadata?.commenterId
      const comment = metadata?.comment

      if (taskId && commenterId && comment) {
        try {
          const [task, commenter] = await Promise.all([getTask(taskId), getUser(commenterId)])

          if (task && commenter) {
            formattedMessage = `
💬 *New Comment*

*${commenter.name}* commented on *${task.title}*:

"${comment.substring(0, 200)}${comment.length > 200 ? "..." : ""}"
`
          }
        } catch (error) {
          console.error("Error formatting comment notification:", error)
        }
      }
      break
    }

    case "task_approval_request": {
      const taskId = metadata?.taskId
      const requesterId = metadata?.requesterId

      if (taskId && requesterId) {
        try {
          const [task, requester] = await Promise.all([getTask(taskId), getUser(requesterId)])

          if (task && requester) {
            formattedMessage = `
🔍 *Approval Request*

*${requester.name}* has requested your approval for:
*${task.title}*

${task.description ? `"${task.description.substring(0, 100)}${task.description.length > 100 ? "..." : ""}"` : ""}
`
          }
        } catch (error) {
          console.error("Error formatting approval request:", error)
        }
      }
      break
    }

    case "task_approved": {
      const taskId = metadata?.taskId
      const approverId = metadata?.approverId

      if (taskId && approverId) {
        try {
          const [task, approver] = await Promise.all([getTask(taskId), getUser(approverId)])

          if (task && approver) {
            formattedMessage = `
✅ *Task Approved*

*${approver.name}* has approved your task:
*${task.title}*
`
          }
        } catch (error) {
          console.error("Error formatting task approval:", error)
        }
      }
      break
    }

    case "task_rejected": {
      const taskId = metadata?.taskId
      const rejecterId = metadata?.rejecterId
      const reason = metadata?.reason

      if (taskId && rejecterId) {
        try {
          const [task, rejecter] = await Promise.all([getTask(taskId), getUser(rejecterId)])

          if (task && rejecter) {
            formattedMessage = `
❌ *Task Rejected*

*${rejecter.name}* has rejected your task:
*${task.title}*

${reason ? `Reason: "${reason}"` : ""}
`
          }
        } catch (error) {
          console.error("Error formatting task rejection:", error)
        }
      }
      break
    }

    case "test_notification": {
      formattedMessage = `
🧪 *Test Notification*

This is a test notification from WorkTrac. If you're seeing this, your Telegram integration is working correctly!

Sent at: ${new Date().toLocaleString()}
`
      break
    }

    default:
      // Default formatting for other notification types
      formattedMessage = `
*${title}*

${message}
`
      break
  }

  // Add action URL if provided
  if (actionUrl) {
    formattedMessage += `\n[View in WorkTrac](${actionUrl})`
  }

  return formattedMessage
}
