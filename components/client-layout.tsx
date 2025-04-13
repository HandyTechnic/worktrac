"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/auth-context"
import { WorkspaceProvider } from "@/contexts/workspace-context"
import { TaskProvider } from "@/contexts/task-context"
import { NotificationProvider } from "@/contexts/notification-context"
import { useEffect } from "react"

export function ClientLayout({ children }) {
  // Force HTTPS
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.location.protocol === "http:" &&
      window.location.hostname !== "localhost"
    ) {
      window.location.href = window.location.href.replace("http:", "https:")
    }
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <NotificationProvider>
          <WorkspaceProvider>
            <TaskProvider>{children}</TaskProvider>
          </WorkspaceProvider>
        </NotificationProvider>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  )
}
