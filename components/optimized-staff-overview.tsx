"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { calculateTaskBurden } from "@/lib/utils"
import { isAfter, isSameDay, startOfDay } from "date-fns"
import { useTasks } from "@/contexts/task-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { getAllUsers } from "@/lib/firebase/auth"
import { getWorkspaceMembers } from "@/lib/firebase/workspace"
import TaskDetailDialog from "@/components/task-detail-dialog"
import { useToast } from "@/hooks/use-toast"
import StaffList from "./staff-list"
import StaffMemberCard from "./staff-member-card"
import type { StaffMember } from "@/lib/types"

export default function OptimizedStaffOverview() {
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState(null)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)

  const { toast } = useToast()
  const { tasks, updateTask } = useTasks()
  const { currentWorkspace } = useWorkspace()

  // Use a ref to track if we've already loaded staff members
  const hasLoadedRef = useRef(false)

  // Load staff members only when the component mounts or workspace changes
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
              ...userData,
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

  // Memoize staff with burden calculations
  const staffWithBurden = useMemo(() => {
    if (!tasks || !staffMembers.length) return []

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

  // Memoize the current staff selection
  const currentStaff = useMemo(
    () => staffWithBurden.find((staff) => staff.id === selectedStaff),
    [staffWithBurden, selectedStaff],
  )

  // Memoize event handlers
  const handleStaffSelect = useCallback((staffId) => {
    setSelectedStaff(staffId)
  }, [])

  const openTaskDetail = useCallback((task) => {
    setSelectedTask(task)
    setTaskDialogOpen(true)
  }, [])

  const closeTaskDetail = useCallback(() => {
    setTaskDialogOpen(false)
    setTimeout(() => {
      setSelectedTask(null)
    }, 300)
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

  // Get burden color
  const getBurdenColor = useCallback((score) => {
    if (score < 4) return "text-success"
    if (score < 7) return "text-warning"
    return "text-destructive"
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <StaffList staffMembers={staffWithBurden} selectedStaff={selectedStaff} onSelectStaff={handleStaffSelect} />
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
            <StaffMemberCard staff={currentStaff} openTaskDetail={openTaskDetail} />
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
