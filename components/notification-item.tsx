"use client"

import { format } from "date-fns"
import { Bell, CheckCircle, AlertCircle, Users, MessageSquare, Calendar } from "lucide-react"
import type { Notification } from "@/lib/types"

interface NotificationItemProps {
  notification: Notification
  onClick: () => void
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  // Get icon based on notification type
  const getIcon = () => {
    switch (notification.type) {
      case "workspace_invitation":
      case "task_invitation":
      case "subtask_invitation":
        return <Users className="h-4 w-4" />
      case "task_approval_request":
        return <AlertCircle className="h-4 w-4" />
      case "task_approved":
        return <CheckCircle className="h-4 w-4" />
      case "task_rejected":
        return <AlertCircle className="h-4 w-4" />
      case "task_completed":
        return <CheckCircle className="h-4 w-4" />
      case "task_assigned":
        return <Calendar className="h-4 w-4" />
      case "comment_added":
        return <MessageSquare className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  // Get color based on notification type
  const getColor = () => {
    switch (notification.type) {
      case "workspace_invitation":
      case "task_invitation":
      case "subtask_invitation":
        return "text-blue-500"
      case "task_approval_request":
        return "text-amber-500"
      case "task_approved":
        return "text-green-500"
      case "task_rejected":
        return "text-red-500"
      case "task_completed":
        return "text-green-500"
      case "task_assigned":
        return "text-purple-500"
      case "comment_added":
        return "text-blue-500"
      default:
        return "text-gray-500"
    }
  }

  return (
    <div
      className={`p-4 hover:bg-muted/50 cursor-pointer ${!notification.read ? "bg-muted/20" : ""}`}
      onClick={onClick}
    >
      <div className="flex gap-3">
        <div className={`mt-0.5 ${getColor()}`}>{getIcon()}</div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">{notification.title}</p>
          <p className="text-xs text-muted-foreground">{notification.message}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(notification.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        {!notification.read && <div className="h-2 w-2 rounded-full bg-primary"></div>}
      </div>
    </div>
  )
}
