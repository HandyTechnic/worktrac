"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { calculateTaskBurden } from "@/lib/utils"
import { getAllUsers } from "@/lib/firebase/auth"
import { useWorkspace } from "@/contexts/workspace-context"
import { useTasks } from "@/contexts/task-context"
import { getWorkspaceMembers } from "@/lib/firebase/workspace"
import { isAfter, isSameDay, startOfDay } from "date-fns"

export default function BurdenMatrix() {
  const [staffMembers, setStaffMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const { currentWorkspace } = useWorkspace()
  const { tasks } = useTasks()

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

  // Calculate burden score for each staff member
  const calculateBurdenScores = () => {
    if (!tasks) return []

    const today = startOfDay(new Date())

    console.log(`Calculating burden scores for ${staffMembers.length} staff members with ${tasks.length} total tasks`)

    return staffMembers.map((staff) => {
      // Get current and future tasks for this staff member
      const staffTasks = tasks.filter(
        (task) =>
          task.assigneeIds.includes(staff.id) &&
          task.status !== "approved" &&
          (isAfter(new Date(task.endDate), today) || isSameDay(new Date(task.endDate), today)),
      )

      console.log(`Staff ${staff.name} (${staff.id}) has ${staffTasks.length} active tasks`)

      // Log task details for debugging
      staffTasks.forEach((task) => {
        console.log(`Task ${task.id}: "${task.title}" - complexity: ${task.complexity}, workload: ${task.workload}`)
      })

      // Calculate average burden
      let totalBurden = 0

      staffTasks.forEach((task) => {
        // Ensure task has complexity and workload values
        if (typeof task.complexity !== "number" || typeof task.workload !== "number") {
          console.warn(`Task ${task.id} is missing complexity or workload values:`, task)
          return // Skip this task
        }

        const taskBurden = calculateTaskBurden(task)
        // Adjust burden for multi-assignee tasks
        const adjustedBurden = taskBurden / (task.assigneeIds.length || 1)
        totalBurden += adjustedBurden

        console.log(
          `Task ${task.id} burden: ${adjustedBurden.toFixed(1)} (${taskBurden} / ${task.assigneeIds.length} assignees)`,
        )
      })

      const burdenScore = staffTasks.length > 0 ? totalBurden / staffTasks.length : 0
      console.log(`Final burden score for ${staff.name}: ${burdenScore.toFixed(1)}`)

      return {
        ...staff,
        burdenScore,
        activeTasks: staffTasks,
      }
    })
  }

  const burdenScores = calculateBurdenScores()

  // Get color based on burden score
  const getBurdenColor = (score) => {
    if (score < 4) return "text-success"
    if (score < 7) return "text-warning"
    return "text-destructive"
  }

  // Get progress bar color
  const getProgressColor = (score) => {
    if (score < 4) return "bg-success"
    if (score < 7) return "bg-warning"
    return "bg-destructive"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Burden Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Burden Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        {burdenScores.length > 0 ? (
          <div className="space-y-6">
            {burdenScores.map((staff) => (
              <div key={staff.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {staff.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-medium">{staff.name}</span>
                      <p className="text-xs text-muted-foreground">{staff.role}</p>
                    </div>
                  </div>
                  <div className={`font-bold ${getBurdenColor(staff.burdenScore)}`}>
                    {staff.burdenScore.toFixed(1)}/10
                  </div>
                </div>

                <Progress
                  value={(staff.burdenScore / 10) * 100}
                  className="h-3"
                  indicatorClassName={getProgressColor(staff.burdenScore)}
                />

                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full ${
                        i < Math.floor(staff.burdenScore) ? getProgressColor(staff.burdenScore) : "bg-muted"
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  Burden is calculated as the average of complexity + workload across all assigned tasks
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No team members found or no tasks assigned</div>
        )}
      </CardContent>
    </Card>
  )
}
