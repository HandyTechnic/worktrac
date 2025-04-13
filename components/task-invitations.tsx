"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock } from "lucide-react"
import { format } from "date-fns"
import { getTaskInvitations, acceptTaskInvitation, declineTaskInvitation } from "@/lib/firebase/task-invitations"
import { getTask } from "@/lib/firebase/db"
import type { TaskInvitation } from "@/lib/types"
import { useNotifications } from "@/contexts/notification-context"

type TaskInvitationsProps = {
  refreshTasks?: () => void
}

export default function TaskInvitations({ refreshTasks }: TaskInvitationsProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { refreshNotifications } = useNotifications()

  const [invitations, setInvitations] = useState<TaskInvitation[]>([])
  const [taskDetails, setTaskDetails] = useState<{ [key: string]: any }>({})
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Load user's pending task invitations
  useEffect(() => {
    if (!user?.id || !currentWorkspace) return

    const loadInvitations = async () => {
      setLoading(true)
      try {
        const userInvitations = await getTaskInvitations(user.id as string, currentWorkspace.id)
        setInvitations(userInvitations)

        // Load task details for each invitation
        const details = {}
        for (const invitation of userInvitations) {
          try {
            const task = await getTask(invitation.taskId)
            details[invitation.taskId] = task

            if (invitation.subtaskId) {
              const subtask = task.subtasks?.find((st) => st.id === invitation.subtaskId)
              if (subtask) {
                details[invitation.subtaskId] = subtask
              }
            }
          } catch (error) {
            console.error(`Error loading task details for ${invitation.taskId}:`, error)
          }
        }

        setTaskDetails(details)
      } catch (error) {
        console.error("Error loading task invitations:", error)
      } finally {
        setLoading(false)
      }
    }

    loadInvitations()
  }, [user, currentWorkspace])

  // Accept invitation
  const handleAccept = async (invitation: TaskInvitation) => {
    if (!user) return

    setProcessingId(invitation.id)

    try {
      await acceptTaskInvitation(invitation.id)

      // Refresh tasks after accepting invitation
      if (refreshTasks) {
        refreshTasks()
      }

      // Refresh notifications
      refreshNotifications()

      toast({
        title: "Invitation Accepted",
        description: `You have been added to the ${invitation.subtaskId ? "subtask" : "task"}.`,
      })

      // Remove from local state
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id))
    } catch (error) {
      console.error("Error accepting task invitation:", error)
      toast({
        title: "Error",
        description: "Failed to accept invitation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  // Decline invitation
  const handleDecline = async (invitation: TaskInvitation) => {
    setProcessingId(invitation.id)

    try {
      await declineTaskInvitation(invitation.id)

      // Refresh notifications
      refreshNotifications()

      toast({
        title: "Invitation Declined",
        description: "The task invitation has been declined.",
      })

      // Remove from local state
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id))
    } catch (error) {
      console.error("Error declining task invitation:", error)
      toast({
        title: "Error",
        description: "Failed to decline invitation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  // If no invitations and not loading, don't render anything
  if (!loading && invitations.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Invitations</CardTitle>
        <CardDescription>You have been invited to join these tasks</CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => {
              const taskDetail = taskDetails[invitation.taskId]
              const subtaskDetail = invitation.subtaskId ? taskDetails[invitation.subtaskId] : null
              const detail = subtaskDetail || taskDetail

              if (!detail) return null

              return (
                <div key={invitation.id} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">
                      {subtaskDetail ? `Subtask: ${subtaskDetail.title}` : taskDetail?.title}
                    </h3>
                    {subtaskDetail && (
                      <Badge variant="outline" className="text-xs">
                        Part of: {taskDetail?.title}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Due {format(new Date(detail.endDate), "MMM d, yyyy")}</span>
                    </Badge>
                    <span className="text-sm text-muted-foreground">Invited by {invitation.inviterId}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDecline(invitation)}
                      disabled={processingId === invitation.id}
                      className="text-destructive hover:text-destructive"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(invitation)}
                      disabled={processingId === invitation.id}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
