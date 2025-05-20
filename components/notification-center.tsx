"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useNotifications } from "@/contexts/notification-context"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const {
    notifications,
    unreadCount,
    loading,
    hasMoreNotifications,
    loadMoreNotifications,
    loadingMore,
    markAllAsRead,
    markingAllAsRead,
  } = useNotifications()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-3">
          <h3 className="font-medium">Notifications</h3>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={markingAllAsRead || unreadCount === 0}
              className="h-auto text-xs"
            >
              {markingAllAsRead ? "Marking..." : "Mark all as read"}
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="p-3 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-center text-sm text-muted-foreground">
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
              {hasMoreNotifications && (
                <div className="p-2 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMoreNotifications}
                    disabled={loadingMore}
                    className="w-full text-xs"
                  >
                    {loadingMore ? "Loading..." : "Load more"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

function NotificationItem({ notification }) {
  const { markAsRead } = useNotifications()

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
  }

  // Format the date
  const formatDate = (date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ago`
    } else if (hours > 0) {
      return `${hours}h ago`
    } else if (minutes > 0) {
      return `${minutes}m ago`
    } else {
      return "Just now"
    }
  }

  return (
    <div
      className={`flex cursor-pointer items-start gap-3 rounded-md p-3 text-sm transition-colors hover:bg-muted ${
        !notification.read ? "bg-muted/50" : ""
      }`}
      onClick={handleClick}
    >
      <div className="flex-1">
        <div className="font-medium">{notification.title}</div>
        <div className="text-xs text-muted-foreground">{notification.message}</div>
        <div className="mt-1 text-xs text-muted-foreground">{formatDate(notification.createdAt)}</div>
      </div>
      {!notification.read && <div className="mt-1 h-2 w-2 rounded-full bg-blue-500"></div>}
    </div>
  )
}
