"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Clock, CheckCircle, Users, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useTasks } from "@/contexts/task-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { ProgressIndicator } from "@/components/progress-indicator"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import TaskDetailDialog from "@/components/task-detail-dialog"
import type { Task } from "@/lib/types"

export default function MyTasks() {
  const router = useRouter()
  const { user } = useAuth()
  const { tasks, loading, updateTask } = useTasks()
  const { currentWorkspace } = useWorkspace()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active")
  const userRole = user?.role || "member" // Default to "member" if user or role is undefined

  // Add state for the task detail dialog
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false)

  // Get user's tasks
  const getUserTasks = () => {
    if (!tasks || !user) return []

    // For workspace owners, show all tasks in the workspace
    if (userRole === "owner") {
      return tasks
    }

    // For regular members, only show tasks where they are directly assigned
    // or have accepted subtasks
    return tasks.filter((task) => {
      // Check if user is directly assigned to the task
      const isDirectlyAssigned = task.assigneeIds?.includes(user.id)

      // Check if user is assigned to any subtasks
      const isAssignedToSubtask = task.subtasks?.some((subtask) => subtask.assigneeIds?.includes(user.id))

      return isDirectlyAssigned || isAssignedToSubtask
    })
  }

  const userTasks = getUserTasks()

  // Filter based on search term and active/completed status
  const filteredTasks = userTasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase())
    const isCompleted = task.status === "completed" || task.status === "approved"
    return matchesSearch && ((activeTab === "active" && !isCompleted) || (activeTab === "completed" && isCompleted))
  })

  // Sort tasks by due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    return new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
  })

  // Calculate tasks due soon (next 3 days)
  const today = new Date()
  const threeDaysLater = new Date(today)
  threeDaysLater.setDate(today.getDate() + 3)

  const tasksDueSoon = sortedTasks.filter((task) => {
    const dueDate = new Date(task.endDate)
    return dueDate >= today && dueDate <= threeDaysLater
  })

  // Handle task click - open the task detail dialog instead of navigating
  const viewTask = (task: Task) => {
    setSelectedTask(task)
    setIsTaskDetailOpen(true)
  }

  // Handle task update from the dialog
  const handleTaskUpdate = (taskId: string, updatedTask: any) => {
    updateTask(taskId, updatedTask)
  }

  if (!currentWorkspace) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Workspace Selected</AlertTitle>
            <AlertDescription>Please select or create a workspace to view your tasks.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>My Tasks</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search tasks..."
                className="w-[200px] pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Tabs defaultValue="active" onValueChange={(value) => setActiveTab(value as "active" | "completed")}>
              <TabsList className="mb-4">
                <TabsTrigger value="active">Active Tasks</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                {tasksDueSoon.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-2 flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-warning" />
                      Due Soon
                    </h3>

                    <div className="space-y-2">
                      {tasksDueSoon.map((task) => (
                        <div
                          key={task.id}
                          className="border rounded-lg p-3 hover:border-primary hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => viewTask(task)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ProgressIndicator status={task.status} />
                              <span className="font-medium">{task.title}</span>
                            </div>
                            <Badge variant="outline" className="text-warning">
                              {new Date(task.endDate) <= new Date()
                                ? "Overdue"
                                : `Due in ${Math.ceil((new Date(task.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days`}
                            </Badge>
                            {task.requiresApproval && task.status === "completed" && (
                              <Badge variant="outline" className="ml-2 text-warning">
                                <Clock className="h-3 w-3 mr-1" />
                                Awaiting Approval
                              </Badge>
                            )}
                          </div>

                          <div className="mt-2">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Progress</span>
                              <span>{task.completion}%</span>
                            </div>
                            <Progress value={task.completion} className="h-1.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-sm font-medium mb-2">All Active Tasks</h3>

                  {sortedTasks.length > 0 ? (
                    sortedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="border rounded-lg p-3 hover:border-primary hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => viewTask(task)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ProgressIndicator status={task.status} />
                            <span className="font-medium">{task.title}</span>
                          </div>
                          <Badge
                            variant={
                              task.status === "approved"
                                ? "success"
                                : task.status === "completed"
                                  ? task.requiresApproval
                                    ? "warning"
                                    : "success"
                                  : task.status === "in-progress"
                                    ? "default"
                                    : "outline"
                            }
                          >
                            {task.status === "completed" && task.requiresApproval
                              ? "Pending Approval"
                              : task.status.charAt(0).toUpperCase() + task.status.slice(1).replace("-", " ")}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            <span>
                              {task.assigneeIds?.length > 1
                                ? `You + ${task.assigneeIds.length - 1} others`
                                : "Only you"}
                            </span>
                          </div>
                          <span>Due {format(new Date(task.endDate), "MMM d, yyyy")}</span>
                        </div>

                        <div className="mt-2">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Progress</span>
                            <span>{task.completion}%</span>
                          </div>
                          <Progress value={task.completion} className="h-1.5" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-muted-foreground">No active tasks found</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="completed">
                {sortedTasks.length > 0 ? (
                  <div className="space-y-2">
                    {sortedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="border rounded-lg p-3 hover:border-primary hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => viewTask(task)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ProgressIndicator status={task.status} />
                            <span className="font-medium">{task.title}</span>
                          </div>
                          <Badge variant="success" className="bg-success/20 text-success">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {task.status === "approved" ? "Approved" : "Completed"}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                          <span>Completed on {format(new Date(), "MMM d, yyyy")}</span>
                          <span>Due {format(new Date(task.endDate), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No completed tasks found</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Task Detail Dialog */}
      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open={isTaskDetailOpen}
          onClose={() => setIsTaskDetailOpen(false)}
          onUpdate={handleTaskUpdate}
        />
      )}
    </>
  )
}
