import { type NextRequest, NextResponse } from "next/server"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import webpush from "web-push"

// Set VAPID keys - in production, these would be environment variables
const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
}

webpush.setVapidDetails("mailto:support@worktrac.com", vapidKeys.publicKey || "", vapidKeys.privateKey || "")

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, title, message, actionUrl } = body

    if (!userId || !title || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user's push subscription
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const pushSubscription = userData.pushSubscription

    if (!pushSubscription) {
      return NextResponse.json({ error: "User has no push subscription" }, { status: 400 })
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      message,
      actionUrl: actionUrl || "/",
      timestamp: Date.now(),
    })

    // Send push notification
    await webpush.sendNotification(pushSubscription, payload)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending push notification:", error)
    return NextResponse.json({ error: "Failed to send push notification" }, { status: 500 })
  }
}
