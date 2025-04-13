"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useTasks } from "@/contexts/task-context"
import { useAuth } from "@/contexts/auth-context"
import { CheckCircle, XCircle, MessageSquare } from "lucide-react"
import { ProgressIndicator } from "@/components/progress-indicator"
import type { Task } from "@/lib/types"

interface TaskApprovalProps {
  task: Task
  onClose?: () => void
}

export default function TaskApprovalWorkflow({ task, onClose }: TaskApprovalProps) {
  const { toast } = useToast()
  const { updateTask } = useTasks()
  const { user } = useAuth()

  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Only show for completed tasks that require approval
  if (task.status !== "completed" || !task.requiresApproval) {
    return null
  }

  const handleApprove = async () => {
    if (!user) return

    setIsSubmitting(true)

    try {
      // Create an update for the approval
      const update = {
        id: Date.now(),
        text: feedback || "Task approved",
        timestamp: new Date().toISOString(),
        userId: user.id,
        type: "approval",
      }

      // Update the task
      await updateTask(task.id.toString(), {
        status: "approved",
        updates: [...(task.updates || []), update],
      })

      toast({
        title: "Task Approved",
        description: "The task has been approved and marked as complete.",
      })

      if (onClose) onClose()
    } catch (error) {
      console.error("Error approving task:", error)
      toast({
        title: "Error",
        description: "Failed to approve task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!user || !feedback.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please provide feedback when rejecting a task.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Create an update for the rejection
      const update = {
        id: Date.now(),
        text: feedback,
        timestamp: new Date().toISOString(),
        userId: user.id,
        type: "rejection",
      }

      // Update the task
      await updateTask(task.id.toString(), {
        status: "in-progress", // Set back to in-progress
        updates: [...(task.updates || []), update],
      })

      toast({
        title: "Task Rejected",
        description: "The task has been returned to the assignee with feedback.",
      })

      if (onClose) onClose()
    } catch (error) {
      console.error("Error rejecting task:", error)
      toast({
        title: "Error",
        description: "Failed to reject task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ProgressIndicator status={task.status} />
          Task Approval Request
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Task: {task.title}</p>
          <p className="text-sm text-muted-foreground">
            This task has been marked as complete and requires your approval.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Feedback (required for rejection)</p>
          </div>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Provide feedback about this task..."
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isSubmitting || !feedback.trim()}
            className="text-destructive hover:text-destructive"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>
          <Button onClick={handleApprove} disabled={isSubmitting} className="bg-success hover:bg-success/90 text-white">
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
