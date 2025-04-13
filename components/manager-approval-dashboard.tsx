"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useTasks } from "@/contexts/task-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { ProgressIndicator } from "@/components/progress-indicator"
import { formatAssignees } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Clock } from "lucide-react"
import type { Task } from "@/lib/types"

export default function ManagerApprovalDashboard() {
  const { toast } = useToast()
  const { tasks, updateTask } = useTasks()
  const { currentWorkspace, userRole } = useWorkspace()
  const router = useRouter()

  const [pendingApprovalTasks, setPendingApprovalTasks] = useState<Task[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    setShouldRender(userRole === "manager" || userRole === "admin" || userRole === "owner")
  }, [userRole])

  // Filter tasks that need approval
  useEffect(() => {
    if (!tasks) return

    const filtered = tasks.filter((task) => task.status === "completed" && task.requiresApproval)

    setPendingApprovalTasks(filtered)
  }, [tasks])

  // If no tasks need approval, don't render
  if (!shouldRender || pendingApprovalTasks.length === 0) {
    return null
  }

  const viewTaskDetails = (taskId: string | number) => {
    router.push(`/task/${taskId}`)
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center">
          Tasks Pending Approval
          <Badge variant="secondary" className="ml-2">
            {pendingApprovalTasks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingApprovalTasks.map((task) => (
            <div key={task.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ProgressIndicator status={task.status} />
                  <div>
                    <h3 className="font-medium">{task.title}</h3>
                    <div className="text-sm text-muted-foreground">
                      Completed by {formatAssignees(task.assigneeIds)}
                    </div>
                  </div>
                </div>
                <Badge>
                  <Clock className="h-3 w-3 mr-1" />
                  Pending Approval
                </Badge>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => viewTaskDetails(task.id)}>
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
