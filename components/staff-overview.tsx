"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { calculateTaskBurden } from "@/lib/utils"
import { ProgressIndicator } from "@/components/progress-indicator"
import { format, isAfter, isSameDay, startOfDay } from "date-fns"
import { Users } from "lucide-react"
import { useTasks } from "@/contexts/task-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { getAllUsers } from "@/lib/firebase/auth"
import { getWorkspaceMembers } from "@/lib/firebase/workspace"
import TaskDetailDialog from "@/components/task-detail-dialog"
import { useToast } from "@/hooks/use-toast"

export default function StaffOverview() {
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [staffMembers, setStaffMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState(null)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)

  // Use a ref to track if we've already loaded staff members
  const hasLoadedRef = useRef(false)

  const { toast } = useToast()
  const { tasks, updateTask } = useTasks()
  const { currentWorkspace } = useWorkspace()

  // Load staff members only once when the component mounts or workspace changes
  useEffect(() => {
    const loadMembers = async () => {
      if (!currentWorkspace) return

      // Skip if we've already loaded for this workspace
      if (hasLoadedRef.current && staffMembers.length > 0) {
        console.log("Staff members already loaded, skipping redundant fetch")
        return
      }

      try {
        console.log("Loading staff members for workspace:", currentWorkspace.id)
        setLoading(true)

        // Get workspace members
        const members = await getWorkspaceMembers(currentWorkspace.id)
        console.log(`Loaded ${members.length} workspace members`)

        // Get user details
        const users = await getAllUsers()
        console.log(`Loaded ${users.length} user details`)

        // Combine data
        const membersWithDetails = members
          .map((member) => {
            const userData = users.find((u) => u.id === member.userId)
            if (!userData) return null

            return {
              id: member.userId,
              name: userData.name || "Unknown",
              role: userData.role || "Team Member",
              userRole: member.role,
            }
          })
          .filter(Boolean)

        console.log(`Processed ${membersWithDetails.length} staff members with details`)
        setStaffMembers(membersWithDetails)

        if (membersWithDetails.length > 0 && !selectedStaff) {
          setSelectedStaff(membersWithDetails[0].id)
        }

        // Mark as loaded
        hasLoadedRef.current = true
      } catch (error) {
        console.error("Error loading staff members:", error)
        toast({
          title: "Error",
          description: "Failed to load staff members. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadMembers()
  }, [currentWorkspace, toast])

  // Handle staff selection without triggering data reload
  const handleStaffSelect = useCallback((staffId) => {
    console.log(`Selecting staff member: ${staffId}`)
    setSelectedStaff(staffId)
  }, [])

  // Memoize staff burden calculations to prevent recalculation on every render
  const staffWithBurden = useMemo(() => {
    if (!tasks || !staffMembers.length) return []

    console.log(`Calculating burden for ${staffMembers.length} staff members with ${tasks.length} tasks`)
    const today = startOfDay(new Date())

    return staffMembers.map((staff) => {
      // Get current and future tasks for this staff member
      const activeTasks = tasks.filter(
        (task) =>
          task.assigneeIds?.includes(staff.id) &&
          task.status !== "approved" &&
          (isAfter(new Date(task.endDate), today) || isSameDay(new Date(task.endDate), today)),
      )

      const completedTasks = tasks.filter(
        (task) => task.assigneeIds?.includes(staff.id) && (task.status === "completed" || task.status === "approved"),
      )

      // Calculate average burden
      let totalBurden = 0

      activeTasks.forEach((task) => {
        // Ensure task has complexity and workload values
        if (typeof task.complexity !== "number" || typeof task.workload !== "number") {
          return // Skip this task
        }

        const taskBurden = calculateTaskBurden(task)
        // Adjust burden for multi-assignee tasks
        const adjustedBurden = taskBurden / (task.assigneeIds?.length || 1)
        totalBurden += adjustedBurden
      })

      const burdenScore = activeTasks.length > 0 ? Number.parseFloat((totalBurden / activeTasks.length).toFixed(1)) : 0

      return {
        ...staff,
        burdenScore,
        activeTasks,
        completedTasks,
        totalTasks: activeTasks.length + completedTasks.length,
        totalBurden,
      }
    })
  }, [tasks, staffMembers])

  // Memoize current staff to prevent unnecessary recalculations
  const currentStaff = useMemo(
    () => staffWithBurden.find((staff) => staff.id === selectedStaff),
    [staffWithBurden, selectedStaff],
  )

  // Task dialog handlers
  const openTaskDetail = useCallback((task) => {
    console.log(`Opening task detail for task: ${task.id}`)
    setSelectedTask(task)
    setTaskDialogOpen(true)
  }, [])

  const closeTaskDetail = useCallback(() => {
    setTaskDialogOpen(false)
    setTimeout(() => {
      setSelectedTask(null)
    }, 300)
  }, [])

  // Get burden color
  const getBurdenColor = useCallback((score) => {
    if (score < 4) return "text-success"
    if (score < 7) return "text-warning"
    return "text-destructive"
  }, [])

  // Handle task update
  const handleTaskUpdate = useCallback(
    async (taskId, updatedData) => {
      try {
        await updateTask(taskId, updatedData)
        toast({
          title: "Task Updated",
          description: "Task has been successfully updated.",
        })
        closeTaskDetail()
      } catch (error) {
        console.error("Error updating task:", error)
        toast({
          title: "Error",
          description: "Failed to update task. Please try again.",
          variant: "destructive",
        })
      }
    },
    [updateTask, toast, closeTaskDetail],
  )

  if (loading && staffMembers.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {staffWithBurden.map((staff) => (
              <button
                key={staff.id}
                className={`w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors ${
                  staff.id === selectedStaff ? "bg-muted" : ""
                }`}
                onClick={() => handleStaffSelect(staff.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{staff.name}</p>
                    <p className="text-xs text-muted-foreground">{staff.role}</p>
                  </div>
                </div>
                <div className={`font-bold ${getBurdenColor(staff.burdenScore)}`}>{staff.burdenScore}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {currentStaff && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{currentStaff.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{currentStaff.role}</p>
              </div>
              <Badge
                className={`${
                  currentStaff.burdenScore < 4
                    ? "bg-success/20 text-success"
                    : currentStaff.burdenScore < 7
                      ? "bg-warning/20 text-warning"
                      : "bg-destructive/20 text-destructive"
                }`}
              >
                Burden: {currentStaff.burdenScore}/10
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Current Burden</span>
                  <span className={getBurdenColor(currentStaff.burdenScore)}>{currentStaff.burdenScore}/10</span>
                </div>
                <Progress
                  value={(currentStaff.burdenScore / 10) * 100}
                  className="h-2"
                  indicatorClassName={
                    currentStaff.burdenScore < 4
                      ? "bg-success"
                      : currentStaff.burdenScore < 7
                        ? "bg-warning"
                        : "bg-destructive"
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Average Task Burden: {currentStaff.burdenScore} (Complexity + Workload)
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-2xl font-bold">{currentStaff.totalTasks}</p>
                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-2xl font-bold">{currentStaff.activeTasks.length}</p>
                  <p className="text-xs text-muted-foreground">Active Tasks</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-2xl font-bold">{currentStaff.completedTasks.length}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>

              <Tabs defaultValue="active">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="active">Active Tasks</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4 pt-4">
                  {currentStaff.activeTasks.length > 0 ? (
                    currentStaff.activeTasks.map((task) => {
                      const hasMultipleAssignees = task.assigneeIds?.length > 1
                      const taskBurden = calculateTaskBurden(task)
                      const adjustedBurden = Number.parseFloat(
                        (taskBurden / (task.assigneeIds?.length || 1)).toFixed(1),
                      )

                      return (
                        <div
                          key={task.id}
                          className="flex items-start space-x-3 border-b pb-3 last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 rounded-md p-2"
                          onClick={() => openTaskDetail(task)}
                        >
                          <ProgressIndicator status={task.status} className="mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium">{task.title}</span>
                              {hasMultipleAssignees && (
                                <Badge variant="outline" className="text-xs py-0 h-5">
                                  <Users className="h-3 w-3 mr-1" />
                                  {task.assigneeIds.length}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                              <span>Complexity: {task.complexity}/5</span>
                              <span className="mx-1">•</span>
                              <span>Workload: {task.workload}/5</span>
                              <span className="mx-1">•</span>
                              <span>Burden: {adjustedBurden}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No active tasks</p>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="space-y-4 pt-4">
                  {currentStaff.completedTasks.length > 0 ? (
                    currentStaff.completedTasks.map((task) => {
                      const hasMultipleAssignees = task.assigneeIds?.length > 1

                      return (
                        <div
                          key={task.id}
                          className="flex items-start space-x-3 border-b pb-3 last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 rounded-md p-2"
                          onClick={() => openTaskDetail(task)}
                        >
                          <ProgressIndicator status={task.status} className="mt-0.5" />
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium">{task.title}</span>
                              {hasMultipleAssignees && (
                                <Badge variant="outline" className="text-xs py-0 h-5">
                                  <Users className="h-3 w-3 mr-1" />
                                  {task.assigneeIds.length}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                              <span>Completed: {format(new Date(task.endDate), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No completed tasks</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Task dialog */}
      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open={taskDialogOpen}
          onClose={closeTaskDetail}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  )
}
