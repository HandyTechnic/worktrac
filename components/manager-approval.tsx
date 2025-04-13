"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ProgressIndicator } from "@/components/progress-indicator"
import { formatAssignees } from "@/lib/utils"
import { useTasks } from "@/contexts/task-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { useRouter } from "next/navigation"

export default function ManagerApproval({ compact = false }) {
  const { toast } = useToast()
  const { tasks, updateTask } = useTasks()
  const { userRole } = useWorkspace()
  const router = useRouter()

  const [pendingTasks, setPendingTasks] = useState([])
  const [processingId, setProcessingId] = useState(null)

  // Filter tasks that need approval
  useEffect(() => {
    if (!tasks) return

    const filtered = tasks.filter((task) => task.status === "completed" && task.requiresApproval)

    setPendingTasks(filtered)
  }, [tasks])

  const handleApprove = async (taskId) => {
    setProcessingId(taskId)

    try {
      // Create an update for the approval
      const task = tasks.find((t) => t.id === taskId)
      if (!task) throw new Error("Task not found")

      const update = {
        id: Date.now(),
        text: "Task approved",
        timestamp: new Date().toISOString(),
        userId: task.creatorId,
        type: "approval",
      }

      // Update the task
      await updateTask(taskId, {
        status: "approved",
        updates: [...(task.updates || []), update],
      })

      // Update local state
      setPendingTasks((prev) => prev.filter((t) => t.id !== taskId))

      toast({
        title: "Task Approved",
        description: "The task has been approved and moved to historical tasks.",
      })
    } catch (error) {
      console.error("Error approving task:", error)
      toast({
        title: "Error",
        description: "Failed to approve task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (taskId) => {
    setProcessingId(taskId)

    try {
      // Create an update for the rejection
      const task = tasks.find((t) => t.id === taskId)
      if (!task) throw new Error("Task not found")

      const update = {
        id: Date.now(),
        text: "Task rejected and returned to in-progress",
        timestamp: new Date().toISOString(),
        userId: task.creatorId,
        type: "rejection",
      }

      // Update the task
      await updateTask(taskId, {
        status: "in-progress",
        updates: [...(task.updates || []), update],
      })

      // Update local state
      setPendingTasks((prev) => prev.filter((t) => t.id !== taskId))

      toast({
        title: "Task Rejected",
        description: "The task has been rejected and returned to in-progress.",
      })
    } catch (error) {
      console.error("Error rejecting task:", error)
      toast({
        title: "Error",
        description: "Failed to reject task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  // Only show for managers
  if (userRole !== "manager" && userRole !== "admin" && userRole !== "owner") {
    return null
  }

  if (pendingTasks.length === 0 && compact) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          Tasks Pending Approval
          {pendingTasks.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {pendingTasks.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingTasks.length > 0 ? (
          <div className="space-y-4">
            {pendingTasks.map((task) => {
              const hasMultipleAssignees = task.assigneeIds.length > 1

              return (
                <div key={task.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ProgressIndicator status={task.status} />
                      <div>
                        <h3 className="font-medium">{task.title}</h3>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <span>Completed by </span>
                          {hasMultipleAssignees ? (
                            <span className="flex items-center ml-1">
                              <Users className="h-3 w-3 mr-1" />
                              {formatAssignees(task.assigneeIds)}
                            </span>
                          ) : (
                            <span className="ml-1">{formatAssignees(task.assigneeIds)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge>Pending Approval</Badge>
                  </div>

                  {!compact && (
                    <>
                      <p className="text-sm">{task.description}</p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <span>Completed on {format(new Date(), "MMM d, yyyy")}</span>
                        <span className="mx-1">•</span>
                        <span>Complexity: {task.complexity}/5</span>
                        <span className="mx-1">•</span>
                        <span>Workload: {task.workload}/5</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(task.id)}
                      disabled={processingId === task.id}
                      className="text-destructive hover:text-destructive"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(task.id)}
                      disabled={processingId === task.id}
                      className="bg-success hover:bg-success/90 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">No tasks pending approval</div>
        )}
      </CardContent>
    </Card>
  )
}
