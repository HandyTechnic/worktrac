// Service Worker for Push Notifications

self.addEventListener("install", (event) => {
  console.log("Service Worker installing.")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("Service Worker activating.")
  return self.clients.claim()
})

// Handle push notifications
self.addEventListener("push", (event) => {
  console.log("Push notification received:", event)

  if (!event.data) {
    console.log("No payload in push notification")
    return
  }

  try {
    const data = event.data.json()
    console.log("Push notification data:", data)

    const title = data.title || "WorkTrac Notification"
    const options = {
      body: data.message || "You have a new notification",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      data: {
        url: data.actionUrl || "/",
      },
    }

    event.waitUntil(self.registration.showNotification(title, options))
  } catch (error) {
    console.error("Error processing push notification:", error)
  }
})

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event)

  event.notification.close()

  // Get the notification data
  const url = event.notification.data?.url || "/"

  // Open or focus the relevant page
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === url && "focus" in client) {
          return client.focus()
        }
      }
      // If no window/tab is open with the URL, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    }),
  )
})
