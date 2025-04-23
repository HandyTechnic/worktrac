"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import {
  format,
  addDays,
  subDays,
  eachDayOfInterval,
  isSameDay,
  isAfter,
  startOfDay,
  endOfDay,
  differenceInDays,
} from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, ChevronRight, Calendar, ZoomIn, ZoomOut, AlertCircle, Minus, PlusIcon } from "lucide-react"
import TaskBar from "@/components/task-bar"
import TaskDetailDialog from "@/components/task-detail-dialog"
import SubtaskDetailDialog from "@/components/subtask-detail-dialog"
import TaskCreationDialog from "@/components/task-creation-dialog"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import { ProgressIndicator } from "@/components/progress-indicator"
import type { Task, SubTask, StaffMember } from "@/lib/types"
import { cn, calculateTaskBurden, formatName } from "@/lib/utils"
import { useTasks } from "@/contexts/task-context"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { getAllUsers } from "@/lib/firebase/auth"
import { Slider } from "@/components/ui/slider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getWorkspaceMembers } from "@/lib/firebase/workspace"

// Constants for zoom levels
const MIN_ZOOM = 1 // Minimum zoom level (most zoomed out)
const MAX_ZOOM = 5 // Maximum zoom level (most zoomed in)
const DEFAULT_ZOOM = 3 // Default zoom level
const DAYS_PER_ZOOM = [60, 45, 30, 15, 7] // Days visible at each zoom level

export default function PeopleGanttChart() {
  const { toast } = useToast()
  const isMobile = useMobile()
  const { user } = useAuth()
  const { currentWorkspace, userRole } = useWorkspace()

  // Check if user has permission to view this page
  const hasPermission = userRole === "owner" || userRole === "admin"

  // State variables, initialized to default values
  const [centerDate, setCenterDate] = useState(new Date())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedSubtask, setSelectedSubtask] = useState<SubTask | null>(null)
  const [showTaskCreation, setShowTaskCreation] = useState(false)
  const [expandedStaff, setExpandedStaff] = useState<string[]>([])
  const [expandedTasks, setExpandedTasks] = useState<{ [staffId: string]: string[] }>({})
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM)
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  const { tasks, loading, updateTask, deleteTask } = useTasks()
  const showCompletedTasks = currentWorkspace?.settings?.showCompletedTasks !== false

  // Check if user is a manager or owner
  const isManagerOrOwner = user?.userRole === "owner" || user?.userRole === "admin" || user?.userRole === "manager"

  // Calculate visible days based on zoom level
  const daysToShow = DAYS_PER_ZOOM[zoomLevel - 1]

  // Calculate start and end dates based on center date and zoom level
  const startDate = startOfDay(subDays(centerDate, Math.floor(daysToShow / 2)))
  const endDate = endOfDay(addDays(centerDate, Math.ceil(daysToShow / 2)))

  // Generate array of days for the header
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  // Calculate column width based on zoom level
  const getColumnWidth = () => {
    // Base width is 40px, increases with zoom level
    return 40 + zoomLevel * 10
  }

  const columnWidth = getColumnWidth()

  // Center on today
  const goToToday = () => {
    setCenterDate(new Date())
    // Scroll to center if container exists
    if (containerRef.current) {
      const container = containerRef.current
      const todayIndex = days.findIndex((day) => isSameDay(day, new Date()))
      if (todayIndex !== -1) {
        const leftPosition = 250 + todayIndex * columnWidth - container.clientWidth / 2 + columnWidth / 2
        container.scrollLeft = leftPosition > 0 ? leftPosition : 0
      }
    }
  }

  // Zoom in/out functions
  const zoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 1, MAX_ZOOM))
  }

  const zoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 1, MIN_ZOOM))
  }

  // Handle zoom slider change
  const handleZoomChange = (value: number[]) => {
    setZoomLevel(value[0])
  }

  // Toggle staff expansion
  const toggleStaffExpansion = (staffId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedStaff((prev) => (prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]))
  }

  // Toggle task expansion
  const toggleTaskExpansion = (staffId: string, taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedTasks((prev) => {
      const staffTasks = prev[staffId] || []
      const newStaffTasks = staffTasks.includes(taskId)
        ? staffTasks.filter((id) => id !== taskId)
        : [...staffTasks, taskId]

      return {
        ...prev,
        [staffId]: newStaffTasks,
      }
    })
  }

  // Open task detail dialog
  const openTaskDetail = (task: Task) => {
    console.log("Opening task detail for:", task.id, task.title)
    setSelectedTask(task)
    setTaskDialogOpen(true)
  }

  // Open subtask detail dialog
  const openSubtaskDetail = (subtask: SubTask) => {
    console.log("Opening subtask detail for:", subtask.id, subtask.title, "Parent ID:", subtask.parentId)

    // Ensure the subtask has a parentId
    if (!subtask.parentId) {
      console.error("Subtask is missing parentId:", subtask)
      toast({
        title: "Error",
        description: "Cannot open subtask details: missing parent task reference",
        variant: "destructive",
      })
      return
    }

    // Create a new object with the parentId explicitly set to ensure it's available
    const subtaskWithParent = {
      ...subtask,
      parentId: subtask.parentId,
    }

    setSelectedSubtask(subtaskWithParent)
    setSubtaskDialogOpen(true)
  }

  // Close task detail dialog
  const closeTaskDetail = () => {
    console.log("Closing task detail dialog")
    setTaskDialogOpen(false)
    setTimeout(() => {
      setSelectedTask(null)
    }, 300)
  }

  // Close subtask detail dialog
  const closeSubtaskDetail = () => {
    console.log("Closing subtask detail dialog")
    setSubtaskDialogOpen(false)
    setTimeout(() => {
      setSelectedSubtask(null)
    }, 300)
  }

  // Handle task update
  const handleTaskUpdate = async (taskId: string, updatedData: Partial<Task>) => {
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
  }

  // Handle subtask update
  const handleSubtaskUpdate = async (subtaskId: string, parentId: string, updatedData: Partial<SubTask>) => {
    console.log(`Updating subtask ${subtaskId} in parent ${parentId} with data:`, updatedData)
    try {
      console.log("Before updateTask call")
      // Find the parent task
      const parentTask = tasks?.find((task) => task.id === parentId)

      if (!parentTask) {
        throw new Error("Parent task not found")
      }

      // Find and update the subtask in the parent's subtasks array
      const updatedSubtasks = parentTask.subtasks.map((st) => (st.id === subtaskId ? { ...st, ...updatedData } : st))

      // Update the parent task with the new subtasks array
      await updateTask(parentId, { ...parentTask, subtasks: updatedSubtasks })
      console.log("After updateTask call")

      toast({
        title: "Subtask Updated",
        description: "Subtask has been successfully updated.",
      })

      closeSubtaskDetail()
    } catch (error) {
      console.error("Error updating subtask:", error)
      toast({
        title: "Error",
        description: "Failed to update subtask. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle task deletion
  const handleTaskDelete = async (taskId: string) => {
    if (isDeleting) return // Prevent multiple deletion attempts

    try {
      setIsDeleting(true)

      // First close the dialog to prevent UI from freezing
      closeTaskDetail()

      // Then delete the task
      await deleteTask(taskId)

      // Clean up any expanded state for this task
      setExpandedTasks((prev) => {
        const newState = { ...prev }

        // Remove this task from all staff expanded tasks
        Object.keys(newState).forEach((staffId) => {
          newState[staffId] = newState[staffId].filter((id) => id !== taskId)
        })

        return newState
      })

      toast({
        title: "Task Deleted",
        description: "Task has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting task:", error)
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle subtask deletion
  const handleSubtaskDelete = async (subtaskId: string, parentId: string) => {
    if (isDeleting) return // Prevent multiple deletion attempts

    try {
      setIsDeleting(true)

      // First close the dialog to prevent UI from freezing
      closeSubtaskDetail()

      // Find the parent task
      const parentTask = tasks?.find((task) => task.id === parentId)

      if (!parentTask) {
        throw new Error("Parent task not found")
      }

      // Remove the subtask from the parent's subtasks array
      const updatedSubtasks = parentTask.subtasks.filter((st) => st.id !== subtaskId)

      // Update the parent task with the new subtasks array
      await updateTask(parentId, { ...parentTask, subtasks: updatedSubtasks })

      toast({
        title: "Subtask Deleted",
        description: "Subtask has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting subtask:", error)
      toast({
        title: "Error",
        description: "Failed to delete subtask. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  // Format staff name for display
  const formatStaffName = (staff: StaffMember) => {
    // If we have a formatted name already, use it
    if (staff.formattedName) return staff.formattedName

    // Otherwise, format the name using the utility function
    return formatName(staff.name, staff.preferredName)
  }

  // Calculate burden for a staff member (only considering current and future tasks)
  const calculateStaffBurden = (staffId: string, staffTasks: Task[]): number => {
    const today = startOfDay(new Date())

    // Add debugging
    console.log(`Calculating burden for staff ${staffId} with ${staffTasks.length} tasks`)

    // Filter out past tasks
    const currentAndFutureTasks = staffTasks.filter((task) => {
      const taskEndDate = new Date(task.endDate)
      return isAfter(taskEndDate, today) || isSameDay(taskEndDate, today)
    })

    console.log(`Found ${currentAndFutureTasks.length} current/future tasks`)

    if (currentAndFutureTasks.length === 0) return 0

    // Calculate total burden
    let totalBurden = 0

    currentAndFutureTasks.forEach((task) => {
      // Check if complexity and workload are defined
      if (typeof task.complexity !== "number" || typeof task.workload !== "number") {
        console.warn(`Task ${task.id} is missing complexity or workload values:`, task)
        return // Skip this task
      }

      // Calculate task burden (complexity + workload)
      const taskBurden = calculateTaskBurden(task)
      console.log(`Task ${task.id} burden: ${taskBurden} (complexity: ${task.complexity}, workload: ${task.workload})`)

      // For multi-assignee tasks, divide the burden by the number of assignees
      const assigneeCount = task.assigneeIds?.length || 1
      const adjustedBurden = taskBurden / assigneeCount

      totalBurden += adjustedBurden
    })

    // Return average burden
    const averageBurden = totalBurden / currentAndFutureTasks.length
    console.log(`Final average burden: ${averageBurden}`)

    return Number.parseFloat(averageBurden.toFixed(1))
  }

  // Get earliest and latest dates for a staff member's tasks
  const getStaffTaskDateRange = (staffTasks: Task[]) => {
    if (!staffTasks || staffTasks.length === 0) {
      return { earliest: new Date(), latest: new Date() }
    }

    // Initialize with the first task's dates
    let earliest = startOfDay(new Date(staffTasks[0].startDate))
    let latest = endOfDay(new Date(staffTasks[0].endDate))

    staffTasks.forEach((task) => {
      const taskStart = startOfDay(new Date(task.startDate))
      const taskEnd = endOfDay(new Date(task.endDate))

      if (taskStart < earliest) earliest = taskStart
      if (taskEnd > latest) latest = taskEnd

      // Check subtasks too
      if (task.subtasks) {
        task.subtasks.forEach((subtask) => {
          const subtaskStart = startOfDay(new Date(subtask.startDate))
          const subtaskEnd = endOfDay(new Date(subtask.endDate))

          if (subtaskStart < earliest) earliest = subtaskStart
          if (subtaskEnd > latest) latest = subtaskEnd
        })
      }
    })

    return { earliest, latest }
  }

  // Group tasks by assignee - show all tasks for all staff members
  const getTasksByAssignee = () => {
    const tasksByAssignee = new Map<string, { tasks: Task[] }>()

    // Initialize with all staff members
    staffMembers.forEach((staff) => {
      tasksByAssignee.set(staff.id.toString(), { tasks: [] })
    })

    // Add all tasks to each assignee if they are assigned to that task
    if (tasks) {
      tasks.forEach((task) => {
        if (task.assigneeIds && task.assigneeIds.length > 0) {
          task.assigneeIds.forEach((assigneeId) => {
            const assigneeKey = assigneeId.toString()
            if (tasksByAssignee.has(assigneeKey)) {
              tasksByAssignee.get(assigneeKey)!.tasks.push(task)
            }
          })
        }
      })
    }

    return tasksByAssignee
  }

  const loadStaffMembers = async () => {
    try {
      if (!currentWorkspace) return

      // Get workspace members instead of all users
      const members = await getWorkspaceMembers(currentWorkspace.id)

      // Get user details for each member
      const users = await getAllUsers()

      // Combine member data with user data - only include users who are workspace members
      const membersWithDetails = members
        .map((member) => {
          const userData = users.find((u) => u.id === member.userId)
          if (!userData) return null

          // For demo purposes, let's assume some preferred names
          // In a real app, this would come from the user's profile
          let preferredName
          if (userData.name === "Haail Hassan Haleem") {
            preferredName = "Haail"
          } else if (userData.name === "Mohamed Zaid Asad") {
            preferredName = "Zaid"
          }

          return {
            ...userData,
            id: member.userId, // Ensure the ID is set correctly
            preferredName,
            formattedName: formatName(userData.name, preferredName),
          }
        })
        .filter(Boolean) // Remove any null entries

      // Show all staff members regardless of user role
      setStaffMembers(membersWithDetails)

      // Initialize expanded tasks for each staff member
      const initialExpandedTasks: { [staffId: string]: string[] } = {}
      membersWithDetails.forEach((user) => {
        initialExpandedTasks[user.id.toString()] = []
      })
      setExpandedTasks(initialExpandedTasks)

      // All staff members are collapsed by default
      setExpandedStaff([])
    } catch (error) {
      console.error("Error loading staff members:", error)
      toast({
        title: "Error",
        description: "Failed to load team members. Please try again.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    loadStaffMembers()
  }, [currentWorkspace, user])

  // Scroll to today on initial load
  useEffect(() => {
    goToToday()
  }, [])

  let content

  if (!hasPermission) {
    content = (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to view the team schedule by person. This view is restricted to workspace owners
              and administrators.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  } else if (!currentWorkspace) {
    content = (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Workspace Selected</AlertTitle>
            <AlertDescription>Please select or create a workspace to view and manage tasks.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  } else {
    const tasksByAssignee = getTasksByAssignee()

    // Get color based on burden score
    const getBurdenColor = (score) => {
      if (score < 4) return "text-success"
      if (score >= 7) return "text-destructive"
      return "text-warning"
    }

    // Get burden bar width and color
    const getBurdenBarStyle = (score) => {
      // Calculate width as percentage of max (10)
      const widthPercent = Math.min(100, (score / 10) * 100)

      let bgColor = "bg-success"
      if (score >= 7) bgColor = "bg-destructive"
      else if (score >= 4) bgColor = "bg-warning"

      return { width: `${widthPercent}%`, className: bgColor }
    }

    // Then update the filteredTasks logic to respect this setting
    // No need to filter tasks here as it's already done in the TaskContext
    const filteredTasks = tasks || []

    content = (
      <Card className="overflow-hidden border-0 shadow-none">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-2 border-b">
            <h2 className="text-lg font-semibold">Team Schedule by Person</h2>
            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <div className="flex items-center gap-2 mr-2">
                <Button variant="outline" size="icon" onClick={zoomOut} disabled={zoomLevel <= MIN_ZOOM}>
                  <ZoomOut className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-2 w-40">
                  <Minus className="h-3 w-3 text-muted-foreground" />
                  <Slider value={[zoomLevel]} min={MIN_ZOOM} max={MAX_ZOOM} step={1} onValueChange={handleZoomChange} />
                  <PlusIcon className="h-3 w-3 text-muted-foreground" />
                </div>

                <Button variant="outline" size="icon" onClick={zoomIn} disabled={zoomLevel >= MAX_ZOOM}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              {/* Today button */}
              <Button variant="outline" onClick={goToToday}>
                <Calendar className="h-4 w-4 mr-2" />
                Today
              </Button>

              <Button size="sm" onClick={() => setShowTaskCreation(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Task
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto w-full max-h-[calc(100vh-250px)] overflow-y-auto" ref={containerRef}>
            <div className="min-w-[800px]">
              {/* Header with days */}
              <div className="grid grid-cols-[250px_1fr] border-b">
                <div className="p-3 font-medium border-r flex items-center gap-2 sticky left-0 bg-background z-10">
                  Team Member
                </div>
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(${days.length}, ${columnWidth}px)`,
                    minHeight: "56px", // Ensure consistent height
                  }}
                >
                  {days.map((day) => (
                    <div
                      key={day.toString()}
                      className={`p-3 text-center text-sm font-medium border-r last:border-r-0 ${
                        isSameDay(day, new Date()) ? "bg-muted" : ""
                      }`}
                    >
                      <div>{format(day, "EEE")}</div>
                      <div>{format(day, "MMM d")}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Staff members with their tasks */}
              <div className="divide-y divide-border">
                {loading || isDeleting ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">{isDeleting ? "Deleting task..." : "Loading tasks..."}</p>
                  </div>
                ) : staffMembers.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No team members found.</div>
                ) : (
                  staffMembers
                    .map((staff) => {
                      const staffId = staff.id.toString()
                      const staffData = tasksByAssignee.get(staffId)
                      const hasAssignedWork = staffData && staffData.tasks.length > 0

                      // Calculate staff burden
                      const staffBurden = hasAssignedWork ? calculateStaffBurden(staffId, staffData!.tasks) : 0
                      const burdenBarStyle = getBurdenBarStyle(staffBurden)

                      // Format the staff name
                      const displayName = formatStaffName(staff)

                      return (
                        <div key={staffId} className="group">
                          {/* Staff member row */}
                          <div className="grid grid-cols-[250px_1fr] border-b">
                            <div className="p-3 font-medium border-r flex items-center gap-2 sticky left-0 bg-background z-10">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-5 w-5 p-0 transition-transform",
                                  expandedStaff.includes(staffId) && "rotate-90",
                                )}
                                onClick={(e) => toggleStaffExpansion(staffId, e)}
                                disabled={!hasAssignedWork}
                              >
                                {hasAssignedWork && <ChevronRight className="h-4 w-4" />}
                              </Button>

                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback>{getInitials(staff.name)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col w-full min-w-0">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="font-medium truncate">{displayName}</span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{staff.name}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <div className="flex items-center justify-between">
                                    <div className="text-xs text-muted-foreground">
                                      Burden:{" "}
                                      <span className={`font-medium ${getBurdenColor(staffBurden)}`}>
                                        {staffBurden.toFixed(1)}
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {staffData?.tasks.length || 0} task
                                      {(staffData?.tasks.length || 0) !== 1 ? "s" : ""}
                                    </div>
                                  </div>
                                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                                    <div
                                      className={`h-full ${burdenBarStyle.className} rounded-full`}
                                      style={{ width: burdenBarStyle.width }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="relative h-16">
                              <div
                                className="grid absolute inset-0"
                                style={{
                                  gridTemplateColumns: `repeat(${days.length}, ${columnWidth}px)`,
                                }}
                              >
                                {days.map((day) => (
                                  <div
                                    key={day.toString()}
                                    className={`border-r last:border-r-0 h-full ${
                                      isSameDay(day, new Date()) ? "bg-muted/50" : ""
                                    }`}
                                  ></div>
                                ))}
                              </div>

                              {/* Summary task bar when collapsed */}
                              {hasAssignedWork && !expandedStaff.includes(staffId) && (
                                <div
                                  className="absolute h-6 rounded-sm bg-primary/20 border border-primary/30 top-5 flex items-center justify-center text-xs font-medium"
                                  style={{
                                    left: `${Math.max(
                                      0,
                                      differenceInDays(getStaffTaskDateRange(staffData!.tasks).earliest, startDate) *
                                        columnWidth,
                                    )}px`,
                                    width: `${Math.max(
                                      columnWidth,
                                      (differenceInDays(
                                        getStaffTaskDateRange(staffData!.tasks).latest,
                                        getStaffTaskDateRange(staffData!.tasks).earliest,
                                      ) +
                                        1) *
                                        columnWidth,
                                    )}px`,
                                  }}
                                >
                                  {staffData!.tasks.length} task{staffData!.tasks.length !== 1 ? "s" : ""}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Tasks for this staff member (if expanded) */}
                          {hasAssignedWork && expandedStaff.includes(staffId) && (
                            <div className="divide-y divide-border/50">
                              {staffData!.tasks.map((task) => (
                                <div key={`task-${task.id}`} className="bg-muted/5">
                                  <div className="grid grid-cols-[250px_1fr]">
                                    <div
                                      className="p-3 pl-16 font-medium border-r flex items-center gap-2 sticky left-0 bg-background/95 z-10"
                                      onClick={() => openTaskDetail(task)}
                                    >
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                          "h-5 w-5 p-0 transition-transform",
                                          expandedTasks[staffId]?.includes(task.id) && "rotate-90",
                                        )}
                                        onClick={(e) => toggleTaskExpansion(staffId, task.id, e)}
                                        disabled={!task.subtasks || task.subtasks.length === 0}
                                      >
                                        {task.subtasks && task.subtasks.length > 0 && (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                      </Button>

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1">
                                          <ProgressIndicator status={task.status} size="sm" />
                                          <span className="text-sm truncate">{task.title}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          Burden: {(task.complexity + task.workload).toFixed(1)}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="relative h-12">
                                      <div
                                        className="grid absolute inset-0"
                                        style={{
                                          gridTemplateColumns: `repeat(${days.length}, ${columnWidth}px)`,
                                        }}
                                      >
                                        {days.map((day) => (
                                          <div
                                            key={day.toString()}
                                            className={`border-r last:border-r-0 h-full ${
                                              isSameDay(day, new Date()) ? "bg-muted/50" : ""
                                            }`}
                                          ></div>
                                        ))}
                                      </div>

                                      {/* Task bar */}
                                      <TaskBar
                                        task={task}
                                        startDate={startDate}
                                        endDate={endDate}
                                        onClick={() => openTaskDetail(task)}
                                        isParent={true}
                                        columnWidth={columnWidth}
                                      />
                                    </div>
                                  </div>

                                  {/* Subtasks for this task (if expanded) */}
                                  {task.subtasks && expandedTasks[staffId]?.includes(task.id) && (
                                    <div className="divide-y divide-border/50">
                                      {task.subtasks.map((subtask) => (
                                        <div key={`subtask-${subtask.id}`} className="bg-muted/10">
                                          <div className="grid grid-cols-[250px_1fr]">
                                            <div
                                              className="p-3 pl-24 font-medium border-r flex items-center gap-2 sticky left-0 bg-background/95 z-10"
                                              onClick={() => {
                                                // Ensure parentId is set
                                                const subtaskWithParent = {
                                                  ...subtask,
                                                  parentId: task.id,
                                                }
                                                openSubtaskDetail(subtaskWithParent)
                                              }}
                                            >
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1">
                                                  <ProgressIndicator status={subtask.status} size="sm" />
                                                  <span className="text-sm truncate">{subtask.title}</span>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="relative h-10">
                                              <div
                                                className="grid absolute inset-0"
                                                style={{
                                                  gridTemplateColumns: `repeat(${days.length}, ${columnWidth}px)`,
                                                }}
                                              >
                                                {days.map((day) => (
                                                  <div
                                                    key={day.toString()}
                                                    className={`border-r last:border-r-0 h-full ${
                                                      isSameDay(day, new Date()) ? "bg-muted/50" : ""
                                                    }`}
                                                  ></div>
                                                ))}
                                              </div>

                                              {/* Subtask bar */}
                                              <TaskBar
                                                task={subtask}
                                                startDate={startDate}
                                                endDate={endDate}
                                                onClick={() => {
                                                  const subtaskWithParent = {
                                                    ...subtask,
                                                    parentId: task.id,
                                                  }
                                                  openSubtaskDetail(subtaskWithParent)
                                                }}
                                                isParent={false}
                                                columnWidth={columnWidth}
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                    .filter(Boolean) // Filter out null values (staff with no tasks)
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {content}

      {/* Task and subtask dialogs */}
      {selectedTask && !isDeleting && (
        <TaskDetailDialog
          task={selectedTask}
          open={taskDialogOpen}
          onClose={closeTaskDetail}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}

      {selectedSubtask && !isDeleting && (
        <SubtaskDetailDialog
          subtask={selectedSubtask}
          open={subtaskDialogOpen}
          onClose={closeSubtaskDetail}
          onUpdate={handleSubtaskUpdate}
          onDelete={handleSubtaskDelete}
        />
      )}

      {showTaskCreation && <TaskCreationDialog onClose={() => setShowTaskCreation(false)} />}
    </>
  )
}
