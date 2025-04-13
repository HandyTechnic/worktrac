"use client"

import type React from "react"

import { useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useNotifications } from "@/contexts/notification-context"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatDistanceToNow } from "date-fns"

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, handleWorkspaceInvitation } =
    useNotifications()
  const [open, setOpen] = useState(false)

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id)
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  const handleDeleteNotification = async (id: string) => {
    await deleteNotification(id)
  }

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id)
    }

    // Handle different notification types
    if (notification.actionUrl && notification.type !== "workspace_invitation") {
      window.location.href = notification.actionUrl
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task_invitation":
        return "📋"
      case "workspace_invitation":
        return "🏢"
      case "task_approval_request":
        return "✅"
      case "task_approved":
        return "👍"
      case "task_rejected":
        return "👎"
      case "task_completed":
        return "🎉"
      case "comment_added":
        return "💬"
      default:
        return "📣"
    }
  }

  const renderNotificationActions = (notification: any) => {
    if (notification.type === "workspace_invitation") {
      return (
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            variant="default"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              handleWorkspaceInvitation(notification.id, true)
            }}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              handleWorkspaceInvitation(notification.id, false)
            }}
          >
            Decline
          </Button>
        </div>
      )
    }
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="text-xs">
              Mark all as read
            </Button>
          )}
        </div>
        <Tabs defaultValue="all">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread {unreadCount > 0 && `(${unreadCount})`}</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="p-0">
            <NotificationList
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDeleteNotification}
              onClick={handleNotificationClick}
              renderActions={renderNotificationActions}
              getIcon={getNotificationIcon}
            />
          </TabsContent>
          <TabsContent value="unread" className="p-0">
            <NotificationList
              notifications={notifications.filter((n) => !n.read)}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDeleteNotification}
              onClick={handleNotificationClick}
              renderActions={renderNotificationActions}
              getIcon={getNotificationIcon}
            />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

interface NotificationListProps {
  notifications: any[]
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  onClick: (notification: any) => void
  renderActions: (notification: any) => React.ReactNode
  getIcon: (type: string) => string
}

function NotificationList({
  notifications,
  onMarkAsRead,
  onDelete,
  onClick,
  renderActions,
  getIcon,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return <div className="py-12 text-center text-muted-foreground">No notifications</div>
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-1 p-1">
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
              !notification.read ? "bg-muted/20" : ""
            }`}
            onClick={() => onClick(notification)}
          >
            <div className="flex gap-3">
              <div className="text-xl">{getIcon(notification.type)}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium leading-none">{notification.title}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(notification.id)
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{notification.message}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                  })}
                </p>
                {renderActions(notification)}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  )
}
