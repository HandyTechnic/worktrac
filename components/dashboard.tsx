"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Plus, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { calculateTaskBurden } from "@/lib/utils"
import { ProgressIndicator } from "@/components/progress-indicator"
import { addDays } from "date-fns"
import TaskCreationDialog from "@/components/task-creation-dialog"
import ManagerApproval from "@/components/manager-approval"
import ManagerApprovalDashboard from "@/components/manager-approval-dashboard"
import { useAuth } from "@/contexts/auth-context"
import { useTasks } from "@/contexts/task-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { getAllUsers } from "@/lib/firebase/auth"
import { getWorkspaceMembers } from "@/lib/firebase/workspace"
import { TelegramConnectionWidget } from "./telegram-connection-widget"

export default function Dashboard() {
  const [showTaskCreation, setShowTaskCreation] = useState(false)
  const [staffMembers, setStaffMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const { user } = useAuth()
  const { tasks } = useTasks()
  const { currentWorkspace, userRole } = useWorkspace()

  const isManager = userRole === "manager" || userRole === "admin" || userRole === "owner"

  useEffect(() => {
    const loadMembers = async () => {
      if (!currentWorkspace) return

      try {
        setLoading(true)
        // Get workspace members
        const members = await getWorkspaceMembers(currentWorkspace.id)

        // Get user details
        const users = await getAllUsers()

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

        setStaffMembers(membersWithDetails)
      } catch (error) {
        console.error("Error loading staff members:", error)
      } finally {
        setLoading(false)
      }
    }

    loadMembers()
  }, [currentWorkspace])

  // Calculate task statistics
  const totalTasks = tasks?.length || 0
  const completedTasks = tasks?.filter((task) => task.status === "completed" || task.status === "approved").length || 0
  const inProgressTasks = tasks?.filter((task) => task.status === "in-progress").length || 0
  const pendingTasks = tasks?.filter((task) => task.status === "pending").length || 0
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Get staff with highest burden
  const staffBurdens = staffMembers.map((staff) => {
    // Calculate burden for each staff member using their tasks
    const staffTasks = tasks?.filter((task) => task.assigneeIds.includes(staff.id)) || []

    // Calculate total burden
    let totalBurden = 0
    let activeTaskCount = 0

    staffTasks.forEach((task) => {
      if (task.status !== "approved" && task.status !== "completed") {
        const taskBurden = calculateTaskBurden(task)
        // Adjust burden for multi-assignee tasks
        const adjustedBurden = taskBurden / task.assigneeIds.length
        totalBurden += adjustedBurden
        activeTaskCount++
      }
    })

    // Calculate average burden
    const burdenScore = activeTaskCount > 0 ? Number.parseFloat((totalBurden / activeTaskCount).toFixed(1)) : 0

    return {
      ...staff,
      burdenScore,
      activeTaskCount,
    }
  })

  const sortedStaff = [...staffBurdens].sort((a, b) => b.burdenScore - a.burdenScore)

  // Get upcoming deadlines (next 3 days)
  const today = new Date()
  const threeDaysLater = addDays(today, 3)

  const upcomingDeadlines = tasks
    ? tasks
        .filter((task) => {
          const endDate = new Date(task.endDate)
          return endDate >= today && endDate <= threeDaysLater && task.status !== "approved"
        })
        .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
        .slice(0, 3)
    : []

  // Calculate average task burden
  const taskBurdens = tasks
    ? tasks.map((task) => ({
        ...task,
        burden: calculateTaskBurden(task),
      }))
    : []

  const averageBurden =
    taskBurdens.length > 0
      ? Number.parseFloat((taskBurdens.reduce((sum, task) => sum + task.burden, 0) / taskBurdens.length).toFixed(1))
      : 0

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full">
      {/* Manager Approval Dashboard */}
      {isManager && <ManagerApprovalDashboard />}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tasks</CardDescription>
            <CardTitle className="text-3xl">{totalTasks}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Completion Rate</span>
              <span>{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-1 mt-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl">{completedTasks}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center pt-2">
            <CheckCircle className="h-4 w-4 text-success mr-1" />
            <span className="text-xs text-muted-foreground">
              {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% of all tasks
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-3xl">{inProgressTasks}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center pt-2">
            <Clock className="h-4 w-4 text-primary mr-1" />
            <span className="text-xs text-muted-foreground">
              {totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0}% of all tasks
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl">{pendingTasks}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center pt-2">
            <AlertCircle className="h-4 w-4 text-warning mr-1" />
            <span className="text-xs text-muted-foreground">
              {totalTasks > 0 ? Math.round((pendingTasks / totalTasks) * 100) : 0}% of all tasks
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Team Workload</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowTaskCreation(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Task
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedStaff.slice(0, 5).map((staff) => (
                <div key={staff.id} className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {staff.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{staff.name}</p>
                    <div className="flex items-center">
                      <Progress
                        value={(staff.burdenScore / 10) * 100}
                        className="h-2 flex-1"
                        indicatorClassName={
                          staff.burdenScore < 3 ? "bg-success" : staff.burdenScore < 7 ? "bg-warning" : "bg-destructive"
                        }
                      />
                      <span className="ml-2 text-sm font-medium">{staff.burdenScore}/10</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span>Average Team Burden:</span>
                <span className="font-medium">{averageBurden}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Burden = Complexity × Workload</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingDeadlines.length > 0 ? (
                upcomingDeadlines.map((task) => {
                  const assignees = task.assigneeIds.map((id) => staffMembers.find((s) => s.id === id)).filter(Boolean)

                  const endDate = new Date(task.endDate)
                  const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

                  return (
                    <div key={task.id} className="flex items-start space-x-3">
                      <ProgressIndicator status={task.status} className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{task.title}</p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <span>{assignees.length > 0 ? assignees[0]?.name : "Unassigned"}</span>
                          {assignees.length > 1 && <span className="ml-1">+{assignees.length - 1} more</span>}
                          <span className="mx-1">•</span>
                          <span className={daysLeft <= 1 ? "text-destructive font-medium" : ""}>
                            {daysLeft === 0 ? "Due today" : daysLeft === 1 ? "Due tomorrow" : `Due in ${daysLeft} days`}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming deadlines in the next 3 days</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <TelegramConnectionWidget />
      </div>

      <ManagerApproval compact={true} />

      {showTaskCreation && <TaskCreationDialog onClose={() => setShowTaskCreation(false)} />}
    </div>
  )
}
