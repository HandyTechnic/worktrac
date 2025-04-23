"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { format, addDays, subDays, eachDayOfInterval, isSameDay, startOfDay, endOfDay } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Plus,
  ChevronRightIcon,
  Users,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  CalendarIcon,
  Minus,
  PlusIcon,
} from "lucide-react"
import TaskBar from "@/components/task-bar"
import TaskDetailDialog from "@/components/task-detail-dialog"
import SubtaskDetailDialog from "@/components/subtask-detail-dialog"
import TaskCreationDialog from "@/components/task-creation-dialog"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import { ProgressIndicator } from "@/components/progress-indicator"
import type { Task, SubTask } from "@/lib/types"
import { formatAssignees } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { useTasks } from "@/contexts/task-context"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { getAllUsers } from "@/lib/firebase/auth"
import { Slider } from "@/components/ui/slider"
import { updateSubtask } from "@/lib/firebase/subtasks"
import { syncTaskCompletionFromSubtasks } from "@/lib/firebase/db"

// Constants for zoom levels
const MIN_ZOOM = 1 // Minimum zoom level (most zoomed out)
const MAX_ZOOM = 5 // Maximum zoom level (most zoomed in)
const DEFAULT_ZOOM = 3 // Default zoom level
const DAYS_PER_ZOOM = [60, 45, 30, 15, 7] // Days visible at each zoom level

export default function GanttChart() {
  const { toast } = useToast()
  const isMobile = useMobile()
  const [centerDate, setCenterDate] = useState(new Date())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedSubtask, setSelectedSubtask] = useState<SubTask | null>(null)
  const [showTaskCreation, setShowTaskCreation] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<string[]>([])
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM)
  const [staffMembers, setStaffMembers] = useState([])
  const containerRef = useRef<HTMLDivElement>(null)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false)

  const { tasks, loading, updateTask } = useTasks()
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()

  // Add this inside the component
  const showCompletedTasks = currentWorkspace?.settings?.showCompletedTasks !== false

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

  // Toggle task expansion
  const toggleTaskExpansion = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedTasks((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]))
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

    setSelectedSubtask(subtask)
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
    console.log(`Updating subtask ${subtaskId} with data:`, updatedData)
    try {
      // Directly update the subtask document without modifying the parent task
      await updateSubtask(subtaskId, updatedData)

      // Update the local state to reflect the changes
      if (tasks) {
        const updatedTasks = [...tasks].map((task) => {
          if (task.id === parentId && task.subtasks) {
            // Update the subtask in the local state
            const updatedSubtasks = task.subtasks.map((st) => (st.id === subtaskId ? { ...st, ...updatedData } : st))
            return { ...task, subtasks: updatedSubtasks }
          }
          return task
        })

        // No need to call setTasks as the real-time listener will update the state
        // This is just for immediate UI feedback before the listener fires

        // Optionally sync the parent task's completion based on subtasks
        await syncTaskCompletionFromSubtasks(parentId)
      }

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

  // Filter tasks based on user role
  const isManager = user?.userRole === "manager" || user?.userRole === "admin" || user?.userRole === "owner"

  // Then update the filteredTasks logic to respect this setting
  // No need to filter tasks here as it's already done in the TaskContext
  const filteredTasks = tasks || []

  const loadStaffMembers = async () => {
    try {
      const users = await getAllUsers()
      setStaffMembers(users)
    } catch (error) {
      console.error("Error loading staff members:", error)
    }
  }

  useEffect(() => {
    loadStaffMembers()
  }, [])

  // Scroll to today on initial load
  useEffect(() => {
    goToToday()
  }, [])

  if (!currentWorkspace) {
    return (
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
  }

  return (
    <Card className="overflow-hidden border-0 shadow-none">
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-2 border-b">
          <h2 className="text-lg font-semibold">Team Schedule</h2>
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
              <CalendarIcon className="h-4 w-4 mr-2" />
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
            <div className="grid grid-cols-[250px_1fr] border-b bg-card">
              <div className="p-3 font-medium border-r sticky left-0 bg-background z-10 flex items-center">
                <span className="text-sm">Task / Assignee</span>
              </div>
              <div className="grid" style={{ gridTemplateColumns: `repeat(${days.length}, ${columnWidth}px)` }}>
                {days.map((day) => (
                  <div
                    key={day.toString()}
                    className={cn(
                      "p-3 text-center text-xs font-medium border-r last:border-r-0",
                      isSameDay(day, new Date()) ? "bg-primary/10" : "",
                    )}
                  >
                    <div className="font-medium">{format(day, "EEE")}</div>
                    <div className="text-muted-foreground">{format(day, "MMM d")}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks with subtasks */}
            <div>
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading tasks...</p>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No tasks found. Click "New Task" to create one.
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div key={task.id} className="group">
                    {/* Parent task row */}
                    <div className="grid grid-cols-[250px_1fr] border-b hover:bg-muted/30 transition-colors">
                      <div
                        className="p-3 font-medium border-r flex items-center gap-2 sticky left-0 bg-background z-10 cursor-pointer"
                        onClick={() => openTaskDetail(task)}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-5 w-5 p-0 transition-transform",
                            expandedTasks.includes(task.id) && "rotate-90",
                          )}
                          onClick={(e) => toggleTaskExpansion(task.id, e)}
                          disabled={!task.subtasks || task.subtasks.length === 0}
                        >
                          {task.subtasks && task.subtasks.length > 0 && <ChevronRightIcon className="h-4 w-4" />}
                        </Button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <ProgressIndicator status={task.status} size="sm" />
                            <span className="font-medium truncate">{task.title}</span>
                          </div>

                          <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                            <Users className="h-3 w-3 mr-1" />
                            <span className="truncate">{formatAssignees(task.assigneeIds || [], staffMembers)}</span>
                          </div>
                        </div>
                      </div>

                      <div
                        className="relative h-16"
                        style={{
                          display: "grid",
                          gridTemplateColumns: `repeat(${days.length}, ${columnWidth}px)`,
                        }}
                      >
                        {days.map((day) => (
                          <div
                            key={day.toString()}
                            className={`border-r last:border-r-0 ${isSameDay(day, new Date()) ? "bg-muted/50" : ""}`}
                          ></div>
                        ))}

                        {/* Task bar */}
                        <TaskBar
                          task={task}
                          startDate={startDate}
                          endDate={endDate}
                          onClick={() => openTaskDetail(task)}
                          isParent={true}
                          columnWidth={columnWidth}
                          className="shadow-sm hover:shadow-md transition-shadow"
                        />
                      </div>
                    </div>

                    {/* Subtasks (if expanded) */}
                    {task.subtasks && task.subtasks.length > 0 && expandedTasks.includes(task.id) && (
                      <div className="relative">
                        {/* Vertical line from parent to subtasks */}
                        <div
                          className="absolute left-6 w-px bg-border"
                          style={{
                            top: "0",
                            height: `${task.subtasks.length * 48}px`,
                          }}
                        />

                        {task.subtasks.map((subtask, index) => {
                          // Log subtask info for debugging
                          console.log(`Rendering subtask ${subtask.id} for parent ${task.id}`, subtask)

                          return (
                            <div
                              key={subtask.id}
                              className="grid grid-cols-[250px_1fr] border-b last:border-b-0 bg-muted/5 relative"
                            >
                              {/* Horizontal line to subtask */}
                              <div className="absolute left-6 w-8 h-px bg-border" style={{ top: "24px" }} />

                              <div
                                className="p-3 font-medium border-r flex items-center gap-2 pl-16 sticky left-0 bg-background/95 z-10"
                                onClick={() => {
                                  // Always ensure the parentId is set correctly
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

                                  <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                                    <Users className="h-3 w-3 mr-1" />
                                    <span className="truncate">
                                      {formatAssignees(subtask.assigneeIds || [], staffMembers)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div
                                className="relative h-12"
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: `repeat(${days.length}, ${columnWidth}px)`,
                                }}
                              >
                                {days.map((day) => (
                                  <div
                                    key={day.toString()}
                                    className={`border-r last:border-r-0 ${
                                      isSameDay(day, new Date()) ? "bg-muted/50" : ""
                                    }`}
                                  ></div>
                                ))}

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
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Use separate dialogs for tasks and subtasks */}
      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open={taskDialogOpen}
          onClose={closeTaskDetail}
          onUpdate={handleTaskUpdate}
        />
      )}

      {selectedSubtask && (
        <SubtaskDetailDialog
          subtask={selectedSubtask}
          open={subtaskDialogOpen}
          onClose={closeSubtaskDetail}
          onUpdate={handleSubtaskUpdate}
        />
      )}

      {showTaskCreation && <TaskCreationDialog onClose={() => setShowTaskCreation(false)} />}
    </Card>
  )
}
