// In a production environment, you would use a proper email service like SendGrid, Mailgun, etc.
// For now, we'll create a placeholder service that logs the emails

export async function sendApprovalEmail(email: string, name: string) {
  console.log(`[EMAIL SERVICE] Sending approval email to ${name} (${email})`)

  // In production, you would use something like:
  // await sendGrid.send({
  //   to: email,
  //   from: 'noreply@worktrac.com',
  //   subject: 'Your WorkTrac Account Has Been Approved',
  //   text: `Hello ${name}, Your WorkTrac account has been approved. You can now log in.`,
  //   html: `<p>Hello ${name},</p><p>Your WorkTrac account has been approved. You can now <a href="https://worktrac.app/login">log in</a>.</p>`
  // })

  return { success: true }
}

export async function sendRejectionEmail(email: string, name: string, reason: string) {
  console.log(`[EMAIL SERVICE] Sending rejection email to ${name} (${email})`)
  console.log(`Reason: ${reason || "No reason provided"}`)

  return { success: true }
}

export async function sendVerificationReminderEmail(email: string, name: string) {
  console.log(`[EMAIL SERVICE] Sending verification reminder to ${name} (${email})`)

  return { success: true }
}

export async function sendInvitationEmail(email: string, inviterName: string, workspaceName = "") {
  console.log(`[EMAIL SERVICE] Sending invitation email to ${email}`)
  console.log(`Invited by: ${inviterName} to workspace: ${workspaceName}`)

  return { success: true }
}

export async function sendTaskInvitationEmail(email: string, inviterName: string, taskTitle: string) {
  console.log(`[EMAIL SERVICE] Sending task invitation email to ${email}`)
  console.log(`Invited by: ${inviterName} to task: ${taskTitle}`)

  return { success: true }
}
