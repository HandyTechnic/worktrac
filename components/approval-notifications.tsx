"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { useTasks } from "@/contexts/task-context"
import { Bell } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ApprovalNotifications() {
  const { toast } = useToast()
  const { user } = useAuth()
  const { currentWorkspace, userRole } = useWorkspace()
  const { tasks } = useTasks()
  const router = useRouter()

  const [pendingApprovals, setPendingApprovals] = useState([])
  const [shouldRender, setShouldRender] = useState(false)

  // Only show for managers
  useEffect(() => {
    if (userRole === "manager" || userRole === "admin" || userRole === "owner") {
      setShouldRender(true)
    } else {
      setShouldRender(false)
    }
  }, [userRole])

  // Filter tasks that need approval
  useEffect(() => {
    if (!tasks) return

    const filtered = tasks.filter((task) => task.status === "completed" && task.requiresApproval)

    setPendingApprovals(filtered)
  }, [tasks])

  // If no tasks need approval, don't render
  if (!shouldRender || pendingApprovals.length === 0) {
    return null
  }

  return (
    <Card className="mb-4 border-warning/50 bg-warning/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-warning" />
            <div>
              <p className="font-medium">Tasks Pending Approval</p>
              <p className="text-sm text-muted-foreground">{pendingApprovals.length} task(s) require your approval</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push("/?tab=dashboard")}>
            View All
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
