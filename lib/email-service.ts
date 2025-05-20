// Email service using API route
export async function sendWorkspaceInvitationEmail(email: string, inviterName: string, workspaceName = "") {
  try {
    console.log(`[EMAIL SERVICE] Sending workspace invitation to ${email}`)

    // Validate inputs before sending to API
    if (!email) {
      console.error("[EMAIL SERVICE] Cannot send invitation: Email is required")
      return { success: false, error: "Email is required" }
    }

    // Ensure all data is properly formatted as primitives
    const payload = {
      type: "workspace_invitation",
      email: String(email),
      data: {
        inviterName: String(inviterName || "A team member"),
        workspaceName: String(workspaceName || ""),
      },
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

export async function sendTaskInvitationEmail(
  email: string,
  inviterName: string,
  taskName: string,
  workspaceName = "",
) {
  try {
    console.log(`[EMAIL SERVICE] Sending task invitation to ${email}`)

    // Validate inputs before sending to API
    if (!email) {
      console.error("[EMAIL SERVICE] Cannot send invitation: Email is required")
      return { success: false, error: "Email is required" }
    }

    if (!taskName) {
      console.error("[EMAIL SERVICE] Cannot send invitation: Task name is required")
      return { success: false, error: "Task name is required" }
    }

    // Ensure all data is properly formatted as primitives
    const payload = {
      type: "task_invitation",
      email: String(email),
      data: {
        inviterName: String(inviterName || "A team member"),
        taskName: String(taskName),
        workspaceName: String(workspaceName || ""),
      },
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

// For backward compatibility
export const sendInvitationEmail = sendWorkspaceInvitationEmail
