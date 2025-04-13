"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Calendar,
  Clock,
  FileText,
  MessageSquare,
  Users,
  Paperclip,
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { useTasks } from "@/contexts/task-context"
import { ProgressIndicator } from "@/components/progress-indicator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { FileUpload } from "@/components/file-upload"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Task, SubTask, TaskUpdate } from "@/lib/types"
import { Separator } from "@/components/ui/separator"
import { getAllUsers } from "@/lib/firebase/auth"
import { getTask, updateTask } from "@/lib/firebase/db"
// Import the TaskApprovalWorkflow component
import TaskApprovalWorkflow from "@/components/task-approval-workflow"
import { createTaskInvitation } from "@/lib/firebase/db"
// Import the TeamMemberSelectionDialog component
import TeamMemberSelectionDialog from "@/components/team-member-selection-dialog"

interface TaskViewProps {
  taskId: string
}

export default function ComprehensiveTaskView({ taskId }: TaskViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const { currentWorkspace, userRole } = useWorkspace()
  const { tasks } = useTasks()

  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [staffMembers, setStaffMembers] = useState([])
  const [activeTab, setActiveTab] = useState("overview")
  const [comment, setComment] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  // Add state for the dialog
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  // Load task details
  const loadTaskDetails = async () => {
    try {
      setLoading(true)
      const taskData = await getTask(taskId)
      if (taskData) {
        setTask(taskData as Task)
      } else {
        toast({
          title: "Error",
          description: "Task not found. It may have been deleted.",
          variant: "destructive",
        })
        router.push("/")
      }
    } catch (error) {
      console.error("Error loading task:", error)
      toast({
        title: "Error",
        description: "Failed to load task details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadStaffMembers = async () => {
      try {
        const users = await getAllUsers()
        setStaffMembers(users)
      } catch (error) {
        console.error("Error loading staff members:", error)
      }
    }

    loadTaskDetails()
    loadStaffMembers()
  }, [taskId, router, toast])

  // Add permission checks for subtask creation and invitations

  // First, add a function to check if the current user can create subtasks
  const canCreateSubtasks = () => {
    if (!user || !task) return false

    // Workspace owners can always create subtasks
    if (userRole === "owner") return true

    // Members can only create subtasks in tasks they're assigned to
    return task.assigneeIds?.includes(user.id)
  }

  // Add a function to check if a user can be invited to a subtask
  const canInviteUserToSubtask = (userId) => {
    if (!task) return false

    // Can only invite users who are already assigned to the parent task
    return task.assigneeIds?.includes(userId)
  }

  // Update the inviteTeamMember function to check permissions
  const inviteTeamMember = async (userId: string) => {
    if (!user || !task) return

    // Check if the current user has permission to invite
    if (userRole !== "owner" && !task.assigneeIds?.includes(user.id)) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to invite members to this task.",
        variant: "destructive",
      })
      return
    }

    // Check if the invited user is already assigned to the parent task
    if (userRole !== "owner" && !task.assigneeIds?.includes(userId)) {
      toast({
        title: "Permission Denied",
        description: "You can only invite members who are already assigned to the parent task.",
        variant: "destructive",
      })
      return
    }

    try {
      // Create task invitation
      await createTaskInvitation(
        task.id.toString(),
        null, // No subtask
        user.id as string,
        userId,
        currentWorkspace?.id as string,
      )

      toast({
        title: "Invitation Sent",
        description: "The team member has been invited to join this task.",
      })
    } catch (error) {
      console.error("Error inviting team member:", error)
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Add comment
  const handleAddComment = async () => {
    if (!comment.trim() || !task || !user) return

    setSubmittingComment(true)

    try {
      const newUpdate: TaskUpdate = {
        id: Date.now(),
        text: comment,
        timestamp: new Date().toISOString(),
        userId: user.id as number,
      }

      const updatedTask = {
        ...task,
        updates: [...(task.updates || []), newUpdate],
      }

      await updateTask(task.id as string, { updates: updatedTask.updates })

      setTask(updatedTask as Task)
      setComment("")

      toast({
        title: "Comment Added",
        description: "Your comment has been added successfully.",
      })
    } catch (error) {
      console.error("Error adding comment:", error)
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmittingComment(false)
    }
  }

  // Get user by ID
  const getUserById = (userId: string | number) => {
    return staffMembers.find((member) => member.id === userId) || null
  }

  // Format assignee names
  const formatAssignees = (assigneeIds: (string | number)[]) => {
    if (!assigneeIds || assigneeIds.length === 0) return "No assignees"

    const assignees = assigneeIds.map((id) => {
      const member = getUserById(id)
      return member ? member.name : "Unknown"
    })

    if (assignees.length <= 2) {
      return assignees.join(", ")
    }

    return `${assignees[0]}, ${assignees[1]} +${assignees.length - 2} more`
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return "bg-success text-success-foreground"
      case "in-progress":
        return "bg-primary text-primary-foreground"
      case "pending":
        return "bg-warning text-warning-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading task details...</p>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">Task Not Found</h2>
          <p className="text-muted-foreground mb-4">This task may have been deleted or doesn't exist.</p>
          <Button onClick={() => router.push("/")}>Return to Dashboard</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.push("/")} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl font-bold flex-1">Task Details</h1>

        {/* Action buttons - only visible to task creator or managers */}
        {(task.creatorId === user?.id || userRole === "manager" || userRole === "admin" || userRole === "owner") && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {}}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Task
            </Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => {}}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content - 2/3 width on large screens */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 mb-2">
                <ProgressIndicator status={task.status} />
                <CardTitle className="text-2xl">{task.title}</CardTitle>
                <Badge className={getStatusColor(task.status)} variant="default">
                  {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace("-", " ")}
                </Badge>
              </div>
              <CardDescription>{task.description || "No description provided."}</CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs defaultValue="overview" onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="updates">
                    Updates {task.updates && task.updates.length > 0 ? `(${task.updates.length})` : ""}
                  </TabsTrigger>
                  <TabsTrigger value="files">
                    Files {task.files && task.files.length > 0 ? `(${task.files.length})` : ""}
                  </TabsTrigger>
                  {task.subtasks && task.subtasks.length > 0 && (
                    <TabsTrigger value="subtasks">Subtasks ({task.subtasks.length})</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        {format(new Date(task.startDate), "MMM d, yyyy")}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        {format(new Date(task.endDate), "MMM d, yyyy")}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Complexity</p>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-5 h-2 rounded-full ${i < task.complexity ? "bg-primary" : "bg-muted"}`}
                            ></div>
                          ))}
                        </div>
                        <span>{task.complexity}/5</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Workload</p>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-5 h-2 rounded-full ${i < task.workload ? "bg-primary" : "bg-muted"}`}
                            ></div>
                          ))}
                        </div>
                        <span>{task.workload}/5</span>
                      </div>
                    </div>

                    <div className="col-span-2 space-y-1">
                      <p className="text-sm text-muted-foreground">Progress ({task.completion}%)</p>
                      <Progress value={task.completion} className="h-2" />
                    </div>

                    {/* Add a button to invite team members in the assignees section: */}
                    <div className="col-span-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Assignees</p>
                        {(userRole === "owner" || task.assigneeIds?.includes(user?.id)) && (
                          <Button variant="outline" size="sm" onClick={() => setShowInviteDialog(true)}>
                            <Plus className="h-3 w-3 mr-1" /> Invite
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {task.assigneeIds && task.assigneeIds.length > 0 ? (
                          task.assigneeIds.map((id) => {
                            const member = getUserById(id)
                            if (!member) return null

                            return (
                              <div key={id} className="flex items-center gap-2 bg-muted/50 py-1 px-3 rounded-md">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback>{member.name?.charAt(0) || "U"}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{member.name}</span>
                              </div>
                            )
                          })
                        ) : (
                          <p className="text-muted-foreground">No assignees</p>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="updates" className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Comments & Updates</h3>
                    </div>

                    <div className="flex items-start gap-4 mb-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Textarea
                          placeholder="Add a comment or update..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          className="mb-2"
                          rows={3}
                        />
                        <Button size="sm" onClick={handleAddComment} disabled={!comment.trim() || submittingComment}>
                          {submittingComment ? "Posting..." : "Post Comment"}
                        </Button>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {task.updates && task.updates.length > 0 ? (
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-4">
                          {task.updates
                            .slice()
                            .reverse()
                            .map((update) => {
                              const commenter = getUserById(update.userId)

                              return (
                                <div key={update.id} className="flex gap-4">
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback>{commenter?.name?.charAt(0) || "U"}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <p className="font-medium">{commenter?.name || "Unknown User"}</p>
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(update.timestamp), "MMM d, yyyy 'at' h:mm a")}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-sm">{update.text}</p>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-10">
                        <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">No comments or updates yet</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="files" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Files & Attachments</h3>
                    </div>

                    <FileUpload taskId={task.id.toString()} />

                    <Separator className="my-4" />

                    {task.files && task.files.length > 0 ? (
                      <div className="space-y-2">
                        {task.files.map((file) => (
                          <div key={file.id} className="flex items-center justify-between border rounded-lg p-3">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-3 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Uploaded by {getUserById(file.uploadedBy)?.name || "Unknown"} on{" "}
                                  {format(new Date(file.uploadedAt), "MMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <Paperclip className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">No files attached to this task</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {task.subtasks && task.subtasks.length > 0 && (
                  <TabsContent value="subtasks" className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Subtasks</h3>

                        {(task.creatorId === user?.id ||
                          userRole === "manager" ||
                          userRole === "admin" ||
                          userRole === "owner") && (
                          <Button size="sm" variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Subtask
                          </Button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {task.subtasks.map((subtask: SubTask) => (
                          <Card key={subtask.id} className="overflow-hidden">
                            <div className="flex items-center p-4 border-b">
                              <ProgressIndicator status={subtask.status} />
                              <h4 className="font-medium ml-2">{subtask.title}</h4>
                              <Badge className={`ml-auto ${getStatusColor(subtask.status)}`} variant="default">
                                {subtask.completion}%
                              </Badge>
                            </div>

                            <CardContent className="p-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1 text-sm">
                                  <p className="text-muted-foreground">Assignees</p>
                                  <p className="flex items-center">
                                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                                    {formatAssignees(subtask.assigneeIds)}
                                  </p>
                                </div>

                                <div className="space-y-1 text-sm">
                                  <p className="text-muted-foreground">Timeline</p>
                                  <p className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                    {format(new Date(subtask.startDate), "MMM d")} -{" "}
                                    {format(new Date(subtask.endDate), "MMM d, yyyy")}
                                  </p>
                                </div>

                                <div className="col-span-2 space-y-1">
                                  <p className="text-sm text-muted-foreground">Progress</p>
                                  <Progress value={subtask.completion} className="h-2" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 width on large screens */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Created by</p>
                <div className="flex items-center gap-2">
                  {task.creatorId ? (
                    <>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{getUserById(task.creatorId)?.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <span>{getUserById(task.creatorId)?.name || "Unknown"}</span>
                    </>
                  ) : (
                    <span>Unknown</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Time Remaining</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {new Date(task.endDate) > new Date() ? (
                    <span>
                      {Math.ceil((new Date(task.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}{" "}
                      days left
                    </span>
                  ) : (
                    <span className="text-destructive">
                      Overdue by{" "}
                      {Math.ceil((new Date().getTime() - new Date(task.endDate).getTime()) / (1000 * 60 * 60 * 24))}{" "}
                      days
                    </span>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Recent Activity</p>
                {task.updates && task.updates.length > 0 ? (
                  <div className="space-y-2">
                    {task.updates
                      .slice(-3)
                      .reverse()
                      .map((update) => (
                        <div key={update.id} className="text-sm">
                          <p>
                            <span className="font-medium">{getUserById(update.userId)?.name || "Unknown"}</span> added a
                            comment
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(update.timestamp), "MMM d, yyyy")}
                          </p>
                        </div>
                      ))}
                    {task.updates.length > 3 && (
                      <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setActiveTab("updates")}>
                        View all activity
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Related Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks
                .filter((t) => t.id !== task.id)
                .slice(0, 3)
                .map((relatedTask) => (
                  <div
                    key={relatedTask.id}
                    className="flex items-center gap-2 p-2 hover:bg-muted rounded-md group mb-2"
                  >
                    <ProgressIndicator status={relatedTask.status} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{relatedTask.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {format(new Date(relatedTask.endDate), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => router.push(`/task/${relatedTask.id}`)}
                    >
                      View
                    </Button>
                  </div>
                ))}

              <Button variant="outline" className="w-full mt-2" onClick={() => router.push("/")}>
                View All Tasks
              </Button>
            </CardContent>
          </Card>

          {(task.creatorId === user?.id || userRole === "manager" || userRole === "admin" || userRole === "owner") && (
            <Card>
              <CardHeader>
                <CardTitle>Task Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {task.status === "completed" &&
                  (userRole === "manager" || userRole === "admin" || userRole === "owner") && (
                    <Button variant="outline" className="w-full justify-start" onClick={() => {}}>
                      <CheckCircle className="h-4 w-4 mr-2 text-success" />
                      Approve Task
                    </Button>
                  )}

                <Button variant="outline" className="w-full justify-start" onClick={() => {}}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Task Details
                </Button>

                {task.status !== "approved" && (
                  <Button variant="outline" className="w-full justify-start" onClick={() => {}}>
                    <Clock className="h-4 w-4 mr-2" />
                    Update Progress
                  </Button>
                )}

                <Button variant="outline" className="w-full justify-start text-destructive" onClick={() => {}}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Task
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Task Approval (for managers only) */}
          {task &&
            task.status === "completed" &&
            task.requiresApproval &&
            (userRole === "manager" || userRole === "admin" || userRole === "owner") && (
              <Card>
                <CardHeader>
                  <CardTitle>Task Approval</CardTitle>
                </CardHeader>
                <CardContent>
                  <TaskApprovalWorkflow task={task} onClose={() => router.push("/")} />
                </CardContent>
              </Card>
            )}
        </div>
      </div>
      {task && (
        <TeamMemberSelectionDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          taskId={task.id.toString()}
          currentAssigneeIds={task.assigneeIds}
          onInvitationsSent={() => {
            // Refresh task data after invitations are sent
            loadTaskDetails()
          }}
        />
      )}
    </div>
  )
}
