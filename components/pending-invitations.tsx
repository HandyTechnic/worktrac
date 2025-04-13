"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase/config"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { useNotifications } from "@/contexts/notification-context"

export default function PendingInvitations() {
  const { user } = useAuth()
  const { addNotification } = useNotifications()

  // Subscribe to new workspace invitations
  useEffect(() => {
    if (!user?.email) return

    console.log("Setting up workspace invitations listener for:", user.email)

    // Subscribe to workspace invitations
    const invitationsRef = collection(db, "workspaceInvitations")
    const q = query(invitationsRef, where("email", "==", user.email), where("status", "==", "pending"))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const invitation = { id: change.doc.id, ...change.doc.data() }
            console.log("New workspace invitation received:", invitation.id)

            // Add to notification system
            addNotification({
              type: "workspace_invitation",
              title: "Workspace Invitation",
              message: `You've been invited to join ${invitation.workspaceName || invitation.workspaceId}`,
              actionUrl: "/",
              data: invitation,
            })
          }
        })
      },
      (error) => {
        console.error("Error in workspace invitations listener:", error)
      },
    )

    return () => {
      console.log("Cleaning up workspace invitations listener")
      unsubscribe()
    }
  }, [user, addNotification])

  // This component doesn't render anything visible
  return null
}
