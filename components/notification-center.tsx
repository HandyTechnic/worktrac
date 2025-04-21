"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface NotificationCenterProps {
  collapsed?: boolean
}

export function NotificationCenter({ collapsed = false }: NotificationCenterProps) {
  const [unreadCount, setUnreadCount] = useState(3)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
              {unreadCount}
            </span>
          )}
          {!collapsed && <span className="sr-only">Notifications</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-3">
          <h4 className="font-medium">Notifications</h4>
          <p className="text-xs text-muted-foreground">You have {unreadCount} unread notifications</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <div className="flex items-start gap-3 border-b p-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">New task assigned</p>
              <p className="text-xs text-muted-foreground">You have been assigned a new task</p>
              <p className="text-xs text-muted-foreground">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-start gap-3 border-b p-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Task deadline approaching</p>
              <p className="text-xs text-muted-foreground">A task is due in 24 hours</p>
              <p className="text-xs text-muted-foreground">1 day ago</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Workspace invitation</p>
              <p className="text-xs text-muted-foreground">You have been invited to join a workspace</p>
              <p className="text-xs text-muted-foreground">3 days ago</p>
            </div>
          </div>
        </div>
        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="w-full justify-center">
            Mark all as read
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
