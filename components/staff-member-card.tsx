"use client"

import { Badge } from "@/components/ui/badge"
import { ProgressIndicator } from "@/components/progress-indicator"
import { format } from "date-fns"
import { Users } from "lucide-react"
import { memo } from "react"
import { calculateTaskBurden } from "@/lib/utils"

// Create a separate component for task items to improve performance
const TaskItem = memo(({ task, onClick }) => {
  const hasMultipleAssignees = task.assigneeIds.length > 1
  const taskBurden = calculateTaskBurden(task)
  const adjustedBurden = Number.parseFloat((taskBurden / task.assigneeIds.length).toFixed(1))

  return (
    <div
      className="flex items-start space-x-3 border-b pb-3 last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 rounded-md p-2"
      onClick={() => onClick(task)}
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
        {task.status === "completed" || task.status === "approved" ? (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <span>Completed: {format(new Date(task.endDate), "MMM d, yyyy")}</span>
          </div>
        ) : (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <span>Complexity: {task.complexity}/5</span>
            <span className="mx-1">•</span>
            <span>Workload: {task.workload}/5</span>
            <span className="mx-1">•</span>
            <span>Burden: {adjustedBurden}</span>
          </div>
        )}
      </div>
    </div>
  )
})

TaskItem.displayName = "TaskItem"

// Create a separate component for the staff member details
function StaffMemberCard({ staff, openTaskDetail }) {
  // Get burden color
  const getBurdenColor = (score) => {
    if (score < 4) return "text-success"
    if (score < 7) return "text-warning"
    return "text-destructive"
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>Current Burden</span>
          <span className={getBurdenColor(staff.burdenScore)}>{staff.burdenScore}/10</span>
        </div>
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full ${
              staff.burdenScore < 4 ? "bg-success" : staff.burdenScore < 7 ? "bg-warning" : "bg-destructive"
            }`}
            style={{ width: `${(staff.burdenScore / 10) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Average Task Burden: {staff.burdenScore} (Complexity + Workload)
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-2xl font-bold">{staff.totalTasks}</p>
          <p className="text-xs text-muted-foreground">Total Tasks</p>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-2xl font-bold">{staff.activeTasks.length}</p>
          <p className="text-xs text-muted-foreground">Active Tasks</p>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-2xl font-bold">{staff.completedTasks.length}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
      </div>

      {/* Active Tasks */}
      <div>
        <h3 className="font-medium mb-3">Active Tasks</h3>
        <div className="space-y-4">
          {staff.activeTasks.length > 0 ? (
            staff.activeTasks.map((task) => <TaskItem key={task.id} task={task} onClick={openTaskDetail} />)
          ) : (
            <p className="text-sm text-muted-foreground">No active tasks</p>
          )}
        </div>
      </div>

      {/* Completed Tasks */}
      <div>
        <h3 className="font-medium mb-3">Completed Tasks</h3>
        <div className="space-y-4">
          {staff.completedTasks.length > 0 ? (
            staff.completedTasks.map((task) => <TaskItem key={task.id} task={task} onClick={openTaskDetail} />)
          ) : (
            <p className="text-sm text-muted-foreground">No completed tasks</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(StaffMemberCard)
