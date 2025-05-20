"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  limit,
  startAfter,
  getDocs,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { useAuth } from "./auth-context"

// Define the notification type
export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: Date
  metadata?: Record<string, any>
}

// Define the context type
interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  hasMoreNotifications: boolean
  loadMoreNotifications: () => Promise<void>
  loadingMore: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  markingAllAsRead: boolean
  acceptWorkspaceInvitation: (invitationId: string) => Promise<void>
  declineWorkspaceInvitation: (invitationId: string) => Promise<void>
}

// Create the context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// Helper function to safely convert various timestamp formats to Date
function safelyConvertToDate(timestamp: any): Date {
  if (!timestamp) {
    return new Date() // Default to current date if no timestamp
  }

  // If it's a Firestore Timestamp
  if (timestamp instanceof Timestamp || (timestamp && typeof timestamp.toDate === "function")) {
    return timestamp.toDate()
  }

  // If it's already a Date
  if (timestamp instanceof Date) {
    return timestamp
  }

  // If it's a number (unix timestamp)
  if (typeof timestamp === "number") {
    return new Date(timestamp)
  }

  // If it's a string, try to parse it
  if (typeof timestamp === "string") {
    const date = new Date(timestamp)
    return isNaN(date.getTime()) ? new Date() : date
  }

  // Fallback
  return new Date()
}

// Define the provider component
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hasMoreNotifications, setHasMoreNotifications] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false)
  const [lastVisible, setLastVisible] = useState<any>(null)
  const NOTIFICATIONS_PER_PAGE = 10

  // Use a ref to store the unsubscribe function
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Function to load notifications
  const loadNotifications = useCallback(() => {
    if (!user) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const notificationsRef = collection(db, "notifications")
      const q = query(
        notificationsRef,
        where("userId", "==", user.id),
        orderBy("createdAt", "desc"),
        limit(NOTIFICATIONS_PER_PAGE),
      )

      // Clean up any existing subscription
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const notificationData: Notification[] = []
          let unread = 0

          snapshot.forEach((doc) => {
            const data = doc.data()
            const notification: Notification = {
              id: doc.id,
              userId: data.userId,
              type: data.type,
              title: data.title,
              message: data.message,
              read: data.read,
              createdAt: safelyConvertToDate(data.createdAt),
              metadata: data.metadata || {},
            }
            notificationData.push(notification)
            if (!notification.read) {
              unread++
            }
          })

          setNotifications(notificationData)
          setUnreadCount(unread)
          setLoading(false)

          // Set last visible document for pagination
          const lastDoc = snapshot.docs[snapshot.docs.length - 1]
          setLastVisible(lastDoc)

          // Check if there are more notifications
          if (snapshot.docs.length === NOTIFICATIONS_PER_PAGE) {
            setHasMoreNotifications(true)
          } else {
            setHasMoreNotifications(false)
          }
        },
        (error) => {
          console.error("Error in notification listener:", error)
          setLoading(false)
        },
      )

      // Store the unsubscribe function in the ref
      unsubscribeRef.current = unsubscribe
    } catch (error) {
      console.error("Error setting up notifications:", error)
      setLoading(false)
    }
  }, [user])

  // Function to load more notifications
  const loadMoreNotifications = async () => {
    if (!user || !lastVisible || loadingMore || !hasMoreNotifications) return

    try {
      setLoadingMore(true)
      const notificationsRef = collection(db, "notifications")
      const q = query(
        notificationsRef,
        where("userId", "==", user.id),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(NOTIFICATIONS_PER_PAGE),
      )

      const snapshot = await getDocs(q)
      const newNotifications: Notification[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        const notification: Notification = {
          id: doc.id,
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          read: data.read,
          createdAt: safelyConvertToDate(data.createdAt),
          metadata: data.metadata || {},
        }
        newNotifications.push(notification)
        if (!notification.read) {
          setUnreadCount((prev) => prev + 1)
        }
      })

      // Append new notifications to existing ones
      setNotifications((prev) => [...prev, ...newNotifications])

      // Update last visible document
      const lastDoc = snapshot.docs[snapshot.docs.length - 1]
      setLastVisible(lastDoc)

      // Check if there are more notifications
      if (snapshot.docs.length < NOTIFICATIONS_PER_PAGE) {
        setHasMoreNotifications(false)
      }

      setLoadingMore(false)
    } catch (error) {
      console.error("Error loading more notifications:", error)
      setLoadingMore(false)
    }
  }

  // Function to mark a notification as read
  const markAsRead = async (id: string) => {
    try {
      const notificationRef = doc(db, "notifications", id)
      await updateDoc(notificationRef, { read: true })

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) => {
          if (notification.id === id && !notification.read) {
            setUnreadCount((count) => Math.max(0, count - 1))
            return { ...notification, read: true }
          }
          return notification
        }),
      )
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  // Function to mark all notifications as read
  const markAllAsRead = async () => {
    if (!user || markingAllAsRead) return

    try {
      setMarkingAllAsRead(true)

      // Update each unread notification
      const updatePromises = notifications
        .filter((notification) => !notification.read)
        .map((notification) => {
          const notificationRef = doc(db, "notifications", notification.id)
          return updateDoc(notificationRef, { read: true })
        })

      await Promise.all(updatePromises)

      // Update local state
      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
      setUnreadCount(0)
      setMarkingAllAsRead(false)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      setMarkingAllAsRead(false)
    }
  }

  // Function to accept a workspace invitation
  const acceptWorkspaceInvitation = async (invitationId: string) => {
    try {
      // Find the notification with this invitation ID
      const notification = notifications.find(
        (n) => n.type === "workspace_invitation" && n.metadata?.invitationId === invitationId,
      )

      if (!notification) {
        console.error("Invitation not found")
        return
      }

      // Mark the notification as read
      await markAsRead(notification.id)

      // Accept the invitation (this would typically call a function from your workspace service)
      // For now, we'll just log it
      console.log(`Accepting workspace invitation: ${invitationId}`)

      // Here you would typically call your workspace service to accept the invitation
      // Example: await workspaceService.acceptInvitation(invitationId)
    } catch (error) {
      console.error("Error accepting workspace invitation:", error)
    }
  }

  // Function to decline a workspace invitation
  const declineWorkspaceInvitation = async (invitationId: string) => {
    try {
      // Find the notification with this invitation ID
      const notification = notifications.find(
        (n) => n.type === "workspace_invitation" && n.metadata?.invitationId === invitationId,
      )

      if (!notification) {
        console.error("Invitation not found")
        return
      }

      // Mark the notification as read
      await markAsRead(notification.id)

      // Decline the invitation (this would typically call a function from your workspace service)
      // For now, we'll just log it
      console.log(`Declining workspace invitation: ${invitationId}`)

      // Here you would typically call your workspace service to decline the invitation
      // Example: await workspaceService.declineInvitation(invitationId)
    } catch (error) {
      console.error("Error declining workspace invitation:", error)
    }
  }

  // Load notifications when the user changes
  useEffect(() => {
    loadNotifications()

    // Clean up function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [loadNotifications])

  // Create the context value
  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    hasMoreNotifications,
    loadMoreNotifications,
    loadingMore,
    markAsRead,
    markAllAsRead,
    markingAllAsRead,
    acceptWorkspaceInvitation,
    declineWorkspaceInvitation,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

// Create a hook to use the notification context
export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}
