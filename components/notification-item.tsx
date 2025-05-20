"use client"

import type React from "react"
import { formatDistanceToNow } from "date-fns"
import { Check, X, Bell, Mail, MessageSquare, Calendar, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNotifications, type Notification } from "@/contexts/notification-context"

interface NotificationItemProps {
  notification: Notification
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const { markAsRead, acceptWorkspaceInvitation, declineWorkspaceInvitation } = useNotifications()

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
  }

  const handleAcceptInvitation = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (notification.metadata?.invitationId) {
      acceptWorkspaceInvitation(notification.metadata.invitationId)
    }
  }

  const handleDeclineInvitation = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (notification.metadata?.invitationId) {
      declineWorkspaceInvitation(notification.metadata.invitationId)
    }
  }

  // Get the appropriate icon based on notification type
  const getIcon = () => {
    switch (notification.type) {
      case "workspace_invitation":
        return <Mail className="h-5 w-5 text-blue-500" />
      case "task_assignment":
        return <Calendar className="h-5 w-5 text-green-500" />
      case "task_comment":
        return <MessageSquare className="h-5 w-5 text-purple-500" />
      case "task_due_soon":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  // Format the timestamp
  const timeAgo = notification.createdAt ? formatDistanceToNow(notification.createdAt, { addSuffix: true }) : "recently"

  return (
    <div
      className={`p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
        !notification.read ? "bg-blue-50 dark:bg-blue-900/20" : ""
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{notification.title}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notification.message}</p>

          {notification.type === "workspace_invitation" && (
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="default" onClick={handleAcceptInvitation}>
                <Check className="h-4 w-4 mr-1" />
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={handleDeclineInvitation}>
                <X className="h-4 w-4 mr-1" />
                Decline
              </Button>
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{timeAgo}</p>
        </div>
        {!notification.read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></div>}
      </div>
    </div>
  )
}
