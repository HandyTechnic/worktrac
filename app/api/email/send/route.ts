import { type NextRequest, NextResponse } from "next/server"
import FormData from "form-data"
import Mailgun from "mailgun.js"

// Domain from environment variables - only accessible on server
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || ""
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY || ""

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, email, subject, data } = body

    if (!email || !type) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Log the request for debugging
    console.log(`[EMAIL API] Received request:`, JSON.stringify({ type, email, subject, data }))

    // Validate Mailgun configuration
    if (!MAILGUN_DOMAIN || !MAILGUN_API_KEY) {
      console.error("[EMAIL API] Missing Mailgun configuration")
      return NextResponse.json({ success: false, error: "Email service not configured properly" }, { status: 500 })
    }

    // Initialize Mailgun with FormData
    const mailgun = new Mailgun(FormData)

    // Create client
    const mg = mailgun.client({
      username: "api",
      key: MAILGUN_API_KEY,
    })

    // Prepare email content based on type
    let text = ""
    let html = ""

    // Helper function to safely get string values from data
    const safeStr = (val: any) => (typeof val === "string" ? val : String(val || ""))

    // Sanitize all input data
    const userName = safeStr(data?.userName)
    const inviterName = safeStr(data?.inviterName)
    const workspaceName = safeStr(data?.workspaceName)
    const taskName = safeStr(data?.taskName)
    const assignerName = safeStr(data?.assignerName)
    const completerName = safeStr(data?.completerName)
    const requesterName = safeStr(data?.requesterName)
    const approverName = safeStr(data?.approverName)
    const rejectorName = safeStr(data?.rejectorName)
    const commenterName = safeStr(data?.commenterName)
    const comment = safeStr(data?.comment)
    const dueDate = safeStr(data?.dueDate)
    const reason = safeStr(data?.reason)
    const taskUrl = safeStr(data?.taskUrl)
    const actionUrl = safeStr(data?.actionUrl)
    const messageTitle = safeStr(data?.messageTitle)
    const messageContent = safeStr(data?.messageContent)

    // Generate email content based on notification type
    switch (type) {
      case "workspace_invitation":
        text = `Hello, ${inviterName} has invited you to join ${
          workspaceName ? `the "${workspaceName}" workspace` : "a workspace"
        } on WorkTrac. Please log in or create an account to accept the invitation.`

        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Workspace Invitation</h2>
            <p>Hello,</p>
            <p><strong>${inviterName}</strong> has invited you to join ${
              workspaceName ? `the <strong>"${workspaceName}"</strong> workspace` : "a workspace"
            } on WorkTrac.</p>
            <p>Please log in or create an account to accept the invitation.</p>
            <p><a href="https://worktrac.app/login" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">Log In / Sign Up</a></p>
            <p>Best regards,<br>The WorkTrac Team</p>
          </div>
        `
        break

      case "task_invitation":
        text = `Hello, ${inviterName} has invited you to collaborate on the task "${taskName}"${
          workspaceName ? ` in the "${workspaceName}" workspace` : ""
        }. Please log in to your WorkTrac account to view and accept this task invitation.`

        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Task Invitation</h2>
            <p>Hello,</p>
            <p><strong>${inviterName}</strong> has invited you to collaborate on the task <strong>"${taskName}"</strong>${
              workspaceName ? ` in the <strong>"${workspaceName}"</strong> workspace` : ""
            }.</p>
            <p>Please log in to your WorkTrac account to view and accept this task invitation.</p>
            <p><a href="https://worktrac.app/login" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">Log In to WorkTrac</a></p>
            <p>Best regards,<br>The WorkTrac Team</p>
          </div>
        `
        break

      case "task_assignment":
        text = `Hello, ${assignerName} has assigned you the task "${taskName}"${
          dueDate ? ` due on ${dueDate}` : ""
        }. Please log in to your WorkTrac account to view this task.`

        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Task Assignment</h2>
            <p>Hello,</p>
            <p><strong>${assignerName}</strong> has assigned you the task <strong>"${taskName}"</strong>${
              dueDate ? ` due on <strong>${dueDate}</strong>` : ""
            }.</p>
            <p>Please log in to your WorkTrac account to view this task and get started.</p>
            <p><a href="${taskUrl}" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">View Task</a></p>
            <p>Best regards,<br>The WorkTrac Team</p>
          </div>
        `
        break

      case "task_completion":
        text = `Hello, ${completerName} has marked the task "${taskName}" as completed. Please log in to your WorkTrac account to review this task.`

        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Task Completed</h2>
            <p>Hello,</p>
            <p><strong>${completerName}</strong> has marked the task <strong>"${taskName}"</strong> as completed.</p>
            <p>Please log in to your WorkTrac account to review this task.</p>
            <p><a href="${taskUrl}" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">Review Task</a></p>
            <p>Best regards,<br>The WorkTrac Team</p>
          </div>
        `
        break

      case "task_approval_request":
        text = `Hello, ${requesterName} has requested your approval for the task "${taskName}". Please log in to your WorkTrac account to approve or reject this task.`

        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Approval Request</h2>
            <p>Hello,</p>
            <p><strong>${requesterName}</strong> has requested your approval for the task <strong>"${taskName}"</strong>.</p>
            <p>Please log in to your WorkTrac account to approve or reject this task.</p>
            <p><a href="${taskUrl}" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">Review & Approve</a></p>
            <p>Best regards,<br>The WorkTrac Team</p>
          </div>
        `
        break

      case "task_approved":
        text = `Hello, ${approverName} has approved the task "${taskName}". Please log in to your WorkTrac account to view this task.`

        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Task Approved</h2>
            <p>Hello,</p>
            <p><strong>${approverName}</strong> has approved the task <strong>"${taskName}"</strong>.</p>
            <p>The task has been marked as approved and is now complete.</p>
            <p><a href="${taskUrl}" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">View Task</a></p>
            <p>Best regards,<br>The WorkTrac Team</p>
          </div>
        `
        break

      case "task_rejected":
        text = `Hello, ${rejectorName} has rejected the task "${taskName}"${
          reason ? ` with the following reason: "${reason}"` : ""
        }. Please log in to your WorkTrac account to review this task.`

        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Task Rejected</h2>
            <p>Hello,</p>
            <p><strong>${rejectorName}</strong> has rejected the task <strong>"${taskName}"</strong>${
              reason ? ` with the following reason:` : ""
            }</p>
            ${reason ? `<p style="background-color: #f9fafb; padding: 10px; border-radius: 4px;">${reason}</p>` : ""}
            <p>Please log in to review the task and make necessary adjustments.</p>
            <p><a href="${taskUrl}" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">Review Task</a></p>
            <p>Best regards,<br>The WorkTrac Team</p>
          </div>
        `
        break

      case "comment_added":
        text = `Hello, ${commenterName} has added a comment on the task "${taskName}": "${comment}". Please log in to your WorkTrac account to view the discussion.`

        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">New Comment</h2>
            <p>Hello,</p>
            <p><strong>${commenterName}</strong> has added a comment on the task <strong>"${taskName}"</strong>:</p>
            <p style="background-color: #f9fafb; padding: 10px; border-radius: 4px;">${comment}</p>
            <p>Please log in to view the full discussion.</p>
            <p><a href="${taskUrl}" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">View Discussion</a></p>
            <p>Best regards,<br>The WorkTrac Team</p>
          </div>
        `
        break

      case "test_notification":
        text = `Hello ${userName || "there"}, ${messageContent || "This is a test notification from WorkTrac."}`

        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Test Notification</h2>
            <p>Hello ${userName || "there"},</p>
            <p>${messageContent || "This is a test notification from WorkTrac."}</p>
            <p>If you received this email, your notification system is working correctly.</p>
            <p>Best regards,<br>The WorkTrac Team</p>
          </div>
        `
        break

      default:
        // Generic notification
        text = `Hello ${userName || "there"}, ${messageTitle}: ${messageContent}${
          actionUrl ? ` Click here to view: ${actionUrl}` : ""
        }`

        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">${messageTitle || "Notification"}</h2>
            <p>Hello ${userName || "there"},</p>
            <p>${messageContent}</p>
            ${
              actionUrl
                ? `<p><a href="${actionUrl}" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">View Details</a></p>`
                : ""
            }
            <p>Best regards,<br>The WorkTrac Team</p>
          </div>
        `
        break
    }

    // Create the message data with sanitized values
    const sanitizedData = {
      from: `WorkTrac <postmaster@${MAILGUN_DOMAIN}>`,
      to: String(email),
      subject: String(subject),
      text: String(text),
      html: String(html),
    }

    console.log(
      `[EMAIL API] Sending email with data:`,
      JSON.stringify({
        from: sanitizedData.from,
        to: sanitizedData.to,
        subject: sanitizedData.subject,
        textLength: text.length,
        htmlLength: html.length,
      }),
    )

    try {
      // Send the email
      const result = await mg.messages.create(MAILGUN_DOMAIN, sanitizedData)
      console.log(`[EMAIL API] Successfully sent email:`, result.id)
      return NextResponse.json({ success: true, messageId: result.id })
    } catch (mailgunError) {
      console.error("[EMAIL API] Mailgun error:", mailgunError)
      let errorMessage = "Unknown error"

      if (typeof mailgunError === "object" && mailgunError !== null) {
        try {
          errorMessage = JSON.stringify(mailgunError)
        } catch (e) {
          errorMessage = String(mailgunError)
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in email API route:", error)
    let errorMessage = "Unknown error"

    if (typeof error === "object" && error !== null) {
      try {
        errorMessage = JSON.stringify(error)
      } catch (e) {
        errorMessage = String(error)
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    )
  }
}
