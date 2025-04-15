// Email service using Mailgun
import FormData from "form-data"
import Mailgun from "mailgun.js"

// Domain from environment variables
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || ""

export async function sendWorkspaceInvitationEmail(email: string, inviterName: string, workspaceName = "") {
  try {
    console.log(`[EMAIL SERVICE] Sending workspace invitation to ${email}`)

    // Initialize Mailgun with FormData
    const mailgun = new Mailgun(FormData)

    // Create client
    const mg = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY || "",
    })

    const subject = `Invitation to Join ${workspaceName || "a WorkTrac Workspace"}`
    const text = `Hello, ${inviterName} has invited you to join ${
      workspaceName ? `the "${workspaceName}" workspace` : "a workspace"
    } on WorkTrac. Please log in or create an account to accept the invitation.`

    const html = `
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

    // Create the message data
    const messageData = {
      from: `WorkTrac <postmaster@${MAILGUN_DOMAIN}>`,
      to: email,
      subject: subject,
      text: text,
      html: html,
    }

    // Send the email
    const result = await mg.messages.create(MAILGUN_DOMAIN, messageData)

    console.log(`[EMAIL SERVICE] Successfully sent email:`, result)
    return { success: true }
  } catch (error) {
    console.error("Error sending email:", error)
    return { success: false, error }
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

    // Initialize Mailgun with FormData
    const mailgun = new Mailgun(FormData)

    // Create client
    const mg = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY || "",
    })

    const subject = `Task Invitation: ${taskName}`
    const text = `Hello, ${inviterName} has invited you to collaborate on the task "${taskName}"${
      workspaceName ? ` in the "${workspaceName}" workspace` : ""
    }. Please log in to your WorkTrac account to view and accept this task invitation.`

    const html = `
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

    // Create the message data
    const messageData = {
      from: `WorkTrac <postmaster@${MAILGUN_DOMAIN}>`,
      to: email,
      subject: subject,
      text: text,
      html: html,
    }

    // Send the email
    const result = await mg.messages.create(MAILGUN_DOMAIN, messageData)

    console.log(`[EMAIL SERVICE] Successfully sent email:`, result)
    return { success: true }
  } catch (error) {
    console.error("Error sending email:", error)
    return { success: false, error }
  }
}

// For backward compatibility
export const sendInvitationEmail = sendWorkspaceInvitationEmail
