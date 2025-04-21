"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export default function NotificationSettings() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Set the correct tab value when on notifications page
    const tabsList = document.querySelector('[role="tablist"]')
    if (tabsList) {
      const notificationsTab = tabsList.querySelector('[value="notifications"]')
      if (notificationsTab) {
        ;(notificationsTab as HTMLElement).click()
      }
    }
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [loading, user, router])

  if (loading || !user) {
    return null // Loading handled by layout
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">Configure your notification preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Manage which emails you receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-tasks">Task Updates</Label>
              <div className="text-sm text-muted-foreground">Receive emails about task assignments and updates</div>
            </div>
            <Switch id="email-tasks" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-comments">Comments</Label>
              <div className="text-sm text-muted-foreground">Receive emails when someone comments on your tasks</div>
            </div>
            <Switch id="email-comments" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-invites">Workspace Invitations</Label>
              <div className="text-sm text-muted-foreground">Receive emails for new workspace invitations</div>
            </div>
            <Switch id="email-invites" defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>Manage browser notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-enabled">Enable Push Notifications</Label>
              <div className="text-sm text-muted-foreground">Allow browser notifications for important updates</div>
            </div>
            <Switch id="push-enabled" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-sound">Notification Sound</Label>
              <div className="text-sm text-muted-foreground">Play a sound when receiving notifications</div>
            </div>
            <Switch id="push-sound" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
