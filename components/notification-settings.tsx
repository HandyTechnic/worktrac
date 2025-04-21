"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Bell, Mail, MessageSquare } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"

const notificationFormSchema = z.object({
  type: z.enum(["all", "mentions", "none"], {
    required_error: "You need to select a notification type.",
  }),
  mobile: z.boolean().default(false).optional(),
  communication_emails: z.boolean().default(false).optional(),
  social_emails: z.boolean().default(false).optional(),
  marketing_emails: z.boolean().default(false).optional(),
  security_emails: z.boolean(),
})

type NotificationFormValues = z.infer<typeof notificationFormSchema>

// This can come from your database or API.
const defaultValues: Partial<NotificationFormValues> = {
  type: "all",
  mobile: true,
  communication_emails: false,
  social_emails: true,
  marketing_emails: false,
  security_emails: true,
}

export function NotificationPreferences() {
  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues,
  })

  function onSubmit(data: NotificationFormValues) {
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure how you receive notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Notify me about...</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="all" />
                        </FormControl>
                        <FormLabel className="font-normal">All new tasks and updates</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="mentions" />
                        </FormControl>
                        <FormLabel className="font-normal">Only mentions and assigned tasks</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="none" />
                        </FormControl>
                        <FormLabel className="font-normal">No notifications</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
            <div>
              <h3 className="mb-4 text-sm font-medium">Email Notifications</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="communication_emails"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Task Updates</FormLabel>
                        <FormDescription>Receive emails about task status changes.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="social_emails"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Comments and Mentions</FormLabel>
                        <FormDescription>
                          Receive emails when someone mentions you or comments on your tasks.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="marketing_emails"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Deadline Reminders</FormLabel>
                        <FormDescription>Receive emails about upcoming deadlines.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="security_emails"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Security Updates</FormLabel>
                        <FormDescription>Receive emails about your account security.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} disabled />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <FormField
              control={form.control}
              name="mobile"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Push Notifications</FormLabel>
                    <FormDescription>Receive push notifications on your mobile device.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit">Save preferences</Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Task assigned to you",
      description: "John Doe assigned you a new task: 'Update website content'",
      time: "2 hours ago",
      read: false,
      type: "task",
    },
    {
      id: 2,
      title: "Comment on your task",
      description: "Jane Smith commented on 'Design new logo'",
      time: "Yesterday",
      read: true,
      type: "comment",
    },
    {
      id: 3,
      title: "Deadline approaching",
      description: "Task 'Quarterly report' is due in 2 days",
      time: "Yesterday",
      read: false,
      type: "deadline",
    },
    {
      id: 4,
      title: "Task completed",
      description: "Mark Johnson completed 'Create social media posts'",
      time: "3 days ago",
      read: true,
      type: "completion",
    },
  ])

  const markAsRead = (id: number) => {
    setNotifications(
      notifications.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map((notification) => ({ ...notification, read: true })))
  }

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter((notification) => notification.id !== id))
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "task":
        return <Bell className="h-4 w-4 text-blue-500" />
      case "comment":
        return <MessageSquare className="h-4 w-4 text-green-500" />
      case "deadline":
        return <Bell className="h-4 w-4 text-red-500" />
      case "completion":
        return <Mail className="h-4 w-4 text-purple-500" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>You have {notifications.filter((n) => !n.read).length} unread notifications</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={markAllAsRead}>
          Mark all as read
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start space-x-4 rounded-lg border p-4 ${
                  !notification.read ? "bg-muted/50" : ""
                }`}
              >
                <div className="mt-1">{getIcon(notification.type)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.time}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.description}</p>
                </div>
                <div className="flex space-x-2">
                  {!notification.read && (
                    <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                      Mark as read
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => deleteNotification(notification.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex h-32 items-center justify-center">
              <p className="text-center text-muted-foreground">No notifications to display</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
