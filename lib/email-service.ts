// Email service using API route
export async function sendEmail(props: {
  type: string
  email: string
  subject: string
  data: Record<string, any>
}) {
  try {
    const { type, email, subject, data } = props
    console.log(`[EMAIL SERVICE] Sending ${type} email to ${email}`)

    // Validate inputs before sending to API
    if (!email) {
      console.error("[EMAIL SERVICE] Cannot send email: Email is required")
      return { success: false, error: "Email is required" }
    }

    // Ensure all data is properly formatted as primitives
    const payload = {
      type,
      email: String(email),
      subject: String(subject),
      data: Object.entries(data).reduce(
        (acc, [key, value]) => {
          acc[key] = String(value || "")
          return acc
        },
        {} as Record<string, string>,
      ),
    }

    console.log(`[EMAIL SERVICE] Sending request with payload:`, JSON.stringify(payload))

    const response = await fetch("/api/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    let result
    try {
      result = await response.json()
    } catch (parseError) {
      console.error(`[EMAIL SERVICE] Failed to parse API response: ${parseError}`)
      return { success: false, error: `Failed to parse API response: ${parseError}` }
    }

    if (!response.ok) {
      console.error(`[EMAIL SERVICE] API responded with status ${response.status}:`, result)
      return { success: false, error: result.error || `API error: ${response.status}` }
    }

    if (!result.success) {
      console.error("[EMAIL SERVICE] Error sending email:", result.error)
      return { success: false, error: result.error }
    }

    console.log(`[EMAIL SERVICE] Successfully sent email`)
    return { success: true }
  } catch (error) {
    console.error("[EMAIL SERVICE] Error sending email:", error)
    return { success: false, error: typeof error === "object" ? JSON.stringify(error) : String(error) }
  }
}

// Specialized email functions
export async function sendWorkspaceInvitationEmail(email: string, inviterName: string, workspaceName = "") {
  return sendEmail({
    type: "workspace_invitation",
    email,
    subject: `Invitation to Join ${workspaceName || "a WorkTrac Workspace"}`,
    data: {
      inviterName: inviterName || "A team member",
      workspaceName: workspaceName || "",
    },
  })
}

export async function sendTaskInvitationEmail(
  email: string,
  inviterName: string,
  taskName: string,
  workspaceName = "",
) {
  return sendEmail({
    type: "task_invitation",
    email,
    subject: `Task Invitation: ${taskName}`,
    data: {
      inviterName: inviterName || "A team member",
      taskName,
      workspaceName: workspaceName || "",
    },
  })
}

export async function sendTaskAssignmentEmail(
  email: string,
  assignerName: string,
  taskName: string,
  dueDate = "",
  taskUrl = "",
) {
  return sendEmail({
    type: "task_assignment",
    email,
    subject: `Task Assigned: ${taskName}`,
    data: {
      assignerName: assignerName || "A team member",
      taskName,
      dueDate,
      taskUrl,
    },
  })
}

export async function sendTaskCompletionEmail(email: string, completerName: string, taskName: string, taskUrl = "") {
  return sendEmail({
    type: "task_completion",
    email,
    subject: `Task Completed: ${taskName}`,
    data: {
      completerName: completerName || "A team member",
      taskName,
      taskUrl,
    },
  })
}

export async function sendTaskApprovalRequestEmail(
  email: string,
  requesterName: string,
  taskName: string,
  taskUrl = "",
) {
  return sendEmail({
    type: "task_approval_request",
    email,
    subject: `Approval Requested: ${taskName}`,
    data: {
      requesterName: requesterName || "A team member",
      taskName,
      taskUrl,
    },
  })
}

export async function sendTaskApprovedEmail(email: string, approverName: string, taskName: string, taskUrl = "") {
  return sendEmail({
    type: "task_approved",
    email,
    subject: `Task Approved: ${taskName}`,
    data: {
      approverName: approverName || "A team member",
      taskName,
      taskUrl,
    },
  })
}

export async function sendTaskRejectedEmail(
  email: string,
  rejectorName: string,
  taskName: string,
  reason = "",
  taskUrl = "",
) {
  return sendEmail({
    type: "task_rejected",
    email,
    subject: `Task Rejected: ${taskName}`,
    data: {
      rejectorName: rejectorName || "A team member",
      taskName,
      reason,
      taskUrl,
    },
  })
}

export async function sendCommentNotificationEmail(
  email: string,
  commenterName: string,
  taskName: string,
  comment: string,
  taskUrl = "",
) {
  return sendEmail({
    type: "comment_added",
    email,
    subject: `New Comment on: ${taskName}`,
    data: {
      commenterName: commenterName || "A team member",
      taskName,
      comment,
      taskUrl,
    },
  })
}

// For backward compatibility
export const sendInvitationEmail = sendWorkspaceInvitationEmail
