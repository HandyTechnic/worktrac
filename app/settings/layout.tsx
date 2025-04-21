"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { PageLayout } from "@/components/page-layout"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center w-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <PageLayout title="User Settings" description="Manage your personal settings and preferences">
      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
          <TabsTrigger value="profile" onClick={() => router.push("/profile")}>
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" onClick={() => router.push("/settings/notifications")}>
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" onClick={() => router.push("/settings/appearance")}>
            Appearance
          </TabsTrigger>
        </TabsList>
        {children}
      </Tabs>
    </PageLayout>
  )
}
