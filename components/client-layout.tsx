"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { WorkspaceProvider } from "@/contexts/workspace-context"
import { NotificationProvider } from "@/contexts/notification-context"
import { TaskProvider } from "@/contexts/task-context"
import { ThemeProvider } from "@/components/theme-provider"
import { forceHttps } from "@/lib/firebase/config"

export function ClientLayout({ children }) {
  // Force HTTPS in production
  useEffect(() => {
    forceHttps()
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <WorkspaceProvider>
          <TaskProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </TaskProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

function AuthenticatedLayout({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && !loading) {
      const publicPaths = ["/login", "/register", "/reset-password"]
      const isPublicPath = publicPaths.some((path) => pathname?.startsWith(path))

      if (!user && !isPublicPath) {
        router.push("/login")
      } else if (user && isPublicPath) {
        // Redirect to Gantt chart based on user role after login
        const ganttPath =
          user.userRole === "owner" || user.userRole === "admin" ? "/gantt?view=people" : "/gantt?view=tasks"
        router.push(ganttPath)
      }
    }
  }, [user, loading, router, pathname, isClient])

  if (!isClient) {
    return null
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  const publicPaths = ["/login", "/register", "/reset-password"]
  const isPublicPath = publicPaths.some((path) => pathname?.startsWith(path))

  if (!user && !isPublicPath) {
    return null
  }

  return children
}
