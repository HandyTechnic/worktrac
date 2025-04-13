import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  getCountFromServer,
} from "firebase/firestore"
import { db } from "./config"

export type NotificationType =
  | "task_invitation"
  | "workspace_invitation"
  | "task_approval_request"
  | "task_approved"
  | "task_rejected"
  | "task_completed"
  | "comment_added"

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: number
  actionUrl?: string
  relatedId?: string
  metadata?: Record<string, any>
}

export interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
  relatedId?: string
  metadata?: Record<string, any>
}

export async function createNotification(params: CreateNotificationParams): Promise<string> {
  try {
    const notificationData = {
      ...params,
      read: false,
      createdAt: Date.now(),
    }

    const docRef = await addDoc(collection(db, "notifications"), notificationData)
    return docRef.id
  } catch (error) {
    console.error("Error creating notification:", error)
    throw error
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const notificationRef = doc(db, "notifications", notificationId)
    await updateDoc(notificationRef, { read: true })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    throw error
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const q = query(collection(db, "notifications"), where("userId", "==", userId), where("read", "==", false))

    const querySnapshot = await getDocs(q)

    // Use Promise.all to update all documents in parallel
    await Promise.all(querySnapshot.docs.map((doc) => updateDoc(doc.ref, { read: true })))
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    throw error
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    const notificationRef = doc(db, "notifications", notificationId)
    await deleteDoc(notificationRef)
  } catch (error) {
    console.error("Error deleting notification:", error)
    throw error
  }
}

export async function getUserNotifications(
  userId: string,
  options: {
    limit?: number
    onlyUnread?: boolean
    types?: NotificationType[]
  } = {},
): Promise<Notification[]> {
  try {
    let q = query(collection(db, "notifications"), where("userId", "==", userId))

    if (options.onlyUnread) {
      q = query(q, where("read", "==", false))
    }

    if (options.types && options.types.length > 0) {
      q = query(q, where("type", "in", options.types))
    }

    const querySnapshot = await getDocs(q)

    let notifications = querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Notification,
    )

    // Sort by creation date (newest first)
    notifications.sort((a, b) => b.createdAt - a.createdAt)

    // Apply limit if specified
    if (options.limit && notifications.length > options.limit) {
      notifications = notifications.slice(0, options.limit)
    }

    return notifications
  } catch (error) {
    console.error("Error getting user notifications:", error)
    throw error
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const q = query(collection(db, "notifications"), where("userId", "==", userId), where("read", "==", false))

    const snapshot = await getCountFromServer(q)
    return snapshot.data().count
  } catch (error) {
    console.error("Error getting unread notification count:", error)
    throw error
  }
}

export function subscribeToUserNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
): () => void {
  const q = query(collection(db, "notifications"), where("userId", "==", userId))

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const notifications = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Notification,
      )

      // Sort notifications by creation date (newest first)
      notifications.sort((a, b) => b.createdAt - a.createdAt)

      callback(notifications)
    },
    (error) => {
      console.error("Error subscribing to notifications:", error)
    },
  )

  return unsubscribe
}
