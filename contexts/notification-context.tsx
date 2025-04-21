"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { db } from "@/lib/firebase/config"
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore"
import { useAuth } from "./auth-context"
import { useWorkspace } from "./workspace-context"
import { getUserInvitations, acceptWorkspaceInvitation, declineWorkspaceInvitation } from "@/lib/firebase/workspace"
import { useToast } from "@/hooks/use-toast"

interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: string
  read: boolean
  actionUrl?: string
  data?: any
  createdAt: Date
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: any) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  handleWorkspaceInvitation: (notificationId: string, accept: boolean) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  handleWorkspaceInvitation: async () => {},
})

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { user } = useAuth()
  const { refreshWorkspaces } = useWorkspace()
  const { toast } = useToast()

  // Load and subscribe to notifications
  useEffect(() => {
    if (!user || !user.id) {
      setNotifications([])
      return
    }

    console.log("Setting up notification listener for user:", user.id)

    const notificationsRef = collection(db, "notifications")
    const q = query(notificationsRef, where("userId", "==", user.id))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notificationsList = snapshot.docs.map((doc) => {
          const data = doc.data()
          let createdAtDate: Date

          // Safely handle the createdAt field
          if (data.createdAt && typeof data.createdAt.toDate === "function") {
            // It's a Firestore Timestamp
            createdAtDate = data.createdAt.toDate()
          } else if (data.createdAt instanceof Date) {
            // It's already a Date
            createdAtDate = data.createdAt
          } else if (data.createdAt) {
            // It might be a timestamp number or string
            try {
              createdAtDate = new Date(data.createdAt)
            } catch (e) {
              createdAtDate = new Date() // Fallback to current date
            }
          } else {
            // No createdAt field
            createdAtDate = new Date() // Fallback to current date
          }

          return {
            id: doc.id,
            ...data,
            createdAt: createdAtDate,
          }
        }) as Notification[]

        // Sort by date, newest first
        notificationsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        console.log("Loaded notifications:", notificationsList.length)
        setNotifications(notificationsList)
      },
      (error) => {
        console.error("Error in notification listener:", error)
      },
    )

    return () => {
      console.log("Cleaning up notification listener")
      unsubscribe()
    }
  }, [user])

  // Load workspace invitations and add them as notifications
  useEffect(() => {
    if (!user?.email || !user?.id) return

    const loadWorkspaceInvitations = async () => {
      try {
        console.log("Loading workspace invitations for:", user.email)
        const invitations = await getUserInvitations(user.email)
        console.log("Found workspace invitations:", invitations.length)

        // For each invitation, check if we already have a notification for it
        for (const invitation of invitations) {
          // Check if we already have a notification for this invitation
          const notificationsRef = collection(db, "notifications")
          const q = query(
            notificationsRef,
            where("userId", "==", user.id),
            where("type", "==", "workspace_invitation"),
            where("data.id", "==", invitation.id),
          )

          const existingNotifications = await getDocs(q)

          if (existingNotifications.empty) {
            console.log("Creating notification for invitation:", invitation.id)
            // Create a notification for this invitation
            await addDoc(collection(db, "notifications"), {
              userId: user.id,
              title: "Workspace Invitation",
              message: `You've been invited to join ${invitation.workspaceName || invitation.workspaceId}`,
              type: "workspace_invitation",
              read: false,
              actionUrl: "/",
              data: invitation,
              createdAt: serverTimestamp(),
            })
          }
        }
      } catch (error) {
        console.error("Error loading workspace invitations:", error)
      }
    }

    loadWorkspaceInvitations()
  }, [user])

  const unreadCount = notifications.filter((n) => !n.read).length

  const addNotification = async (notification: any) => {
    if (!user || !user.id) return

    console.log("Adding notification:", notification)

    try {
      await addDoc(collection(db, "notifications"), {
        userId: user.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: false,
        actionUrl: notification.actionUrl || null,
        data: notification.data || null,
        createdAt: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error adding notification:", error)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const notificationRef = doc(db, "notifications", id)
      await updateDoc(notificationRef, { read: true })

      // Update local state
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    if (!user || !user.id) return

    try {
      const unreadNotifications = notifications.filter((n) => !n.read)

      const promises = unreadNotifications.map((notification) => {
        const notificationRef = doc(db, "notifications", notification.id)
        return updateDoc(notificationRef, { read: true })
      })

      await Promise.all(promises)

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const notificationRef = doc(db, "notifications", id)
      await deleteDoc(notificationRef)

      // Update local state
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (error) {
      console.error("Error deleting notification:", error)
    }
  }

  const handleWorkspaceInvitation = async (notificationId: string, accept: boolean) => {
    if (!user || !user.id) return

    try {
      // Find the notification
      const notification = notifications.find((n) => n.id === notificationId)
      if (!notification || notification.type !== "workspace_invitation" || !notification.data) {
        console.error("Invalid notification for workspace invitation")
        return
      }

      const invitation = notification.data
      console.log("Handling workspace invitation:", invitation.id, accept ? "accept" : "decline")

      if (accept) {
        // Accept the invitation
        console.log("Accepting workspace invitation:", invitation.id)
        await acceptWorkspaceInvitation(invitation.id, user.id)

        toast({
          title: "Invitation Accepted",
          description: `You have joined the workspace "${invitation.workspaceName || invitation.workspaceId}".`,
        })

        // Refresh workspaces to include the new one
        console.log("Refreshing workspaces after accepting invitation")
        await refreshWorkspaces()
      } else {
        // Decline the invitation
        console.log("Declining workspace invitation:", invitation.id)
        await declineWorkspaceInvitation(invitation.id)

        toast({
          title: "Invitation Declined",
          description: "The workspace invitation has been declined.",
        })
      }

      // Delete the notification
      await deleteNotification(notificationId)
    } catch (error) {
      console.error("Error handling workspace invitation:", error)
      toast({
        title: "Error",
        description: "Failed to process the invitation. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        handleWorkspaceInvitation,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
