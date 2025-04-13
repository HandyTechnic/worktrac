"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Shield, Users, Settings, Bell } from "lucide-react"
import { subscribeToPendingUsers } from "@/lib/firebase/auth"

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [pendingUsersCount, setPendingUsersCount] = useState(0)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }

    // Check if user is an admin
    if (user && user.userRole !== "admin") {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      })
      router.push("/")
    }
  }, [user, loading, router, toast])

  useEffect(() => {
    if (user?.userRole === "admin") {
      // Subscribe to pending users to get the count
      const unsubscribe = subscribeToPendingUsers((users) => {
        setPendingUsersCount(users.length)
      })

      return () => unsubscribe()
    }
  }, [user])

  if (loading || !user || user.userRole !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-[1200px]">
      <Button variant="ghost" className="mb-6" onClick={() => router.push("/")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              User Management
            </CardTitle>
            <CardDescription>Manage users and permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-between" onClick={() => router.push("/admin/users")}>
              Pending Approvals
              {pendingUsersCount > 0 && (
                <span className="bg-white text-primary rounded-full px-2 py-0.5 text-xs font-bold">
                  {pendingUsersCount}
                </span>
              )}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push("/admin/users")}>
              All Users
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              System Settings
            </CardTitle>
            <CardDescription>Configure system-wide settings</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => router.push("/admin/settings")}>
              General Settings
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>Manage system notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => router.push("/admin/notifications")}>
              Notification Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
