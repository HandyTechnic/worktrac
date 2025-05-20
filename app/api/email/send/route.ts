import { type NextRequest, NextResponse } from "next/server"
import FormData from "form-data"
import Mailgun from "mailgun.js"

// Domain from environment variables - only accessible on server
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || ""
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY || ""

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, email, data } = body

    if (!email || !type) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Log the request for debugging
    console.log(`[EMAIL API] Received request:`, JSON.stringify({ type, email, data }))

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
    let subject = ""
    let text = ""
    let html = ""

    // Ensure we have valid strings for all data properties
    const safeInviterName = typeof data?.inviterName === "string" ? data.inviterName : "A team member"

    if (type === "workspace_invitation") {
      const safeWorkspaceName = typeof data?.workspaceName === "string" ? data.workspaceName : ""

      subject = `Invitation to Join ${safeWorkspaceName || "a WorkTrac Workspace"}`
      text = `Hello, ${safeInviterName} has invited you to join ${
        safeWorkspaceName ? `the "${safeWorkspaceName}" workspace` : "a workspace"
      } on WorkTrac. Please log in or create an account to accept the invitation.`

      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Workspace Invitation</h2>
          <p>Hello,</p>
          <p><strong>${safeInviterName}</strong> has invited you to join ${
            safeWorkspaceName ? `the <strong>"${safeWorkspaceName}"</strong> workspace` : "a workspace"
          } on WorkTrac.</p>
          <p>Please log in or create an account to accept the invitation.</p>
          <p><a href="https://worktrac.app/login" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">Log In / Sign Up</a></p>
          <p>Best regards,<br>The WorkTrac Team</p>
        </div>
      `
    } else if (type === "task_invitation") {
      const safeTaskName = typeof data?.taskName === "string" ? data.taskName : "a task"
      const safeWorkspaceName = typeof data?.workspaceName === "string" ? data.workspaceName : ""

      subject = `Task Invitation: ${safeTaskName}`
      text = `Hello, ${safeInviterName} has invited you to collaborate on the task "${safeTaskName}"${
        safeWorkspaceName ? ` in the "${safeWorkspaceName}" workspace` : ""
      }. Please log in to your WorkTrac account to view and accept this task invitation.`

      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Task Invitation</h2>
          <p>Hello,</p>
          <p><strong>${safeInviterName}</strong> has invited you to collaborate on the task <strong>"${safeTaskName}"</strong>${
            safeWorkspaceName ? ` in the <strong>"${safeWorkspaceName}"</strong> workspace` : ""
          }.</p>
          <p>Please log in to your WorkTrac account to view and accept this task invitation.</p>
          <p><a href="https://worktrac.app/login" style="background-color: #4f46e5; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">Log In to WorkTrac</a></p>
          <p>Best regards,<br>The WorkTrac Team</p>
        </div>
      `
    } else {
      return NextResponse.json({ success: false, error: "Invalid email type" }, { status: 400 })
    }

    // Create the message data with sanitized values
    const sanitizedData = {
      from: `WorkTrac <postmaster@${MAILGUN_DOMAIN}>`,
      to: String(email),
      subject: String(subject),
      text: String(text),
      html: String(html),
    }

    console.log(`[EMAIL API] Sending email with data:`, JSON.stringify(sanitizedData))

    try {
      // Send the email
      const result = await mg.messages.create(MAILGUN_DOMAIN, sanitizedData)
      console.log(`[EMAIL API] Successfully sent email:`, result)
      return NextResponse.json({ success: true })
    } catch (mailgunError) {
      console.error("[EMAIL API] Mailgun error:", mailgunError)
      return NextResponse.json(
        {
          success: false,
          error: typeof mailgunError === "object" ? JSON.stringify(mailgunError) : String(mailgunError),
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in email API route:", error)
    return NextResponse.json(
      {
        success: false,
        error: typeof error === "object" ? JSON.stringify(error) : String(error),
      },
      { status: 500 },
    )
  }
}
