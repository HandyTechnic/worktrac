"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import {
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  type NotificationPreferences,
  type NotificationChannel,
} from "@/lib/notification-service"

export function NotificationPreferencesForm() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user?.id) return

      setIsLoading(true)
      try {
        const prefs = await getUserNotificationPreferences(user.id)
        setPreferences(prefs)
      } catch (error) {
        console.error("Error fetching notification preferences:", error)
        toast({
          title: "Error",
          description: "Failed to load notification preferences.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchPreferences()
  }, [user, toast])

  const handleChannelChange = (type: keyof NotificationPreferences, value: NotificationChannel) => {
    if (!preferences) return

    setPreferences({
      ...preferences,
      [type]: value,
    })
  }

  const handleSave = async () => {
    if (!user?.id || !preferences) return

    setIsSaving(true)
    try {
      await updateUserNotificationPreferences(user.id, preferences)
      toast({
        title: "Preferences Saved",
        description: "Your notification preferences have been updated.",
      })
    } catch (error) {
      console.error("Error saving notification preferences:", error)
      toast({
        title: "Error",
        description: "Failed to save notification preferences.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !preferences) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Loading your preferences...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Choose how you want to receive different types of notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-assignment">Task Assignments</Label>
              <Select
                value={preferences.taskAssignment}
                onValueChange={(value) => handleChannelChange("taskAssignment", value as NotificationChannel)}
              >
                <SelectTrigger id="task-assignment">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="push">Push Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="telegram">Telegram Only</SelectItem>
                  <SelectItem value="both">All Channels</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-invitation">Task Invitations</Label>
              <Select
                value={preferences.taskInvitation}
                onValueChange={(value) => handleChannelChange("taskInvitation", value as NotificationChannel)}
              >
                <SelectTrigger id="task-invitation">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="push">Push Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="telegram">Telegram Only</SelectItem>
                  <SelectItem value="both">All Channels</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-completion">Task Completions</Label>
              <Select
                value={preferences.taskCompletion}
                onValueChange={(value) => handleChannelChange("taskCompletion", value as NotificationChannel)}
              >
                <SelectTrigger id="task-completion">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="push">Push Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="telegram">Telegram Only</SelectItem>
                  <SelectItem value="both">All Channels</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-approval">Task Approvals</Label>
              <Select
                value={preferences.taskApproval}
                onValueChange={(value) => handleChannelChange("taskApproval", value as NotificationChannel)}
              >
                <SelectTrigger id="task-approval">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="push">Push Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="telegram">Telegram Only</SelectItem>
                  <SelectItem value="both">All Channels</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-invitation">Workspace Invitations</Label>
              <Select
                value={preferences.workspaceInvitation}
                onValueChange={(value) => handleChannelChange("workspaceInvitation", value as NotificationChannel)}
              >
                <SelectTrigger id="workspace-invitation">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="push">Push Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="telegram">Telegram Only</SelectItem>
                  <SelectItem value="both">All Channels</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Comments</Label>
              <Select
                value={preferences.comments}
                onValueChange={(value) => handleChannelChange("comments", value as NotificationChannel)}
              >
                <SelectTrigger id="comments">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="push">Push Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="telegram">Telegram Only</SelectItem>
                  <SelectItem value="both">All Channels</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Preferences"}
        </Button>
      </CardFooter>
    </Card>
  )
}
