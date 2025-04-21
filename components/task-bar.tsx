"use client"

import { differenceInDays, isBefore, isAfter, max, min, startOfDay, endOfDay } from "date-fns"
import { Progress } from "@/components/ui/progress"
import { ProgressIndicator } from "@/components/progress-indicator"
import type { Task, SubTask } from "@/lib/types"
import { Users } from "lucide-react"

interface TaskBarProps {
  task: Task | SubTask
  startDate: Date
  endDate: Date
  onClick: () => void
  isParent?: boolean
  columnWidth?: number
}

export default function TaskBar({
  task,
  startDate,
  endDate,
  onClick,
  isParent = false,
  columnWidth = 40,
}: TaskBarProps) {
  // Calculate position and width of the task bar
  const calculatePosition = () => {
    // Ensure task dates are within the visible range
    const taskStart = startOfDay(new Date(task.startDate))
    const taskEnd = endOfDay(new Date(task.endDate))

    // If task is completely outside the visible range, don't render
    if (isAfter(taskStart, endDate) || isBefore(taskEnd, startDate)) {
      return null
    }

    // Clamp task dates to visible range
    const visibleStart = max([taskStart, startDate])
    const visibleEnd = min([taskEnd, endDate])

    // Calculate days from start and task duration in days
    const daysFromStart = differenceInDays(visibleStart, startDate)

    // Calculate the width based on the difference between visible end and start
    // Add 1 because the end date is inclusive (a task that starts and ends on the same day should be 1 day wide)
    const visibleDuration = differenceInDays(visibleEnd, visibleStart) + 1

    // Calculate left position and width in pixels
    const left = daysFromStart * columnWidth
    const width = visibleDuration * columnWidth

    return { left: `${left}px`, width: `${width}px` }
  }

  const position = calculatePosition()

  // If task is not in the visible range, don't render
  if (!position) {
    return null
  }

  // Determine color based on status
  const getStatusColor = () => {
    switch (task.status) {
      case "completed":
        return "border-success text-success"
      case "in-progress":
        return "border-primary text-primary"
      case "pending":
        return "border-warning text-warning"
      case "approved":
        return "border-success text-success"
      default:
        return "border-muted text-muted-foreground"
    }
  }

  // Calculate completion percentage
  const completionPercentage = task.completion || 0

  // Check if task has multiple assignees
  const hasMultipleAssignees = "assigneeIds" in task && task.assigneeIds.length > 1

  // Calculate if the task bar is too narrow to show text
  // Minimum width for showing text (in pixels)
  const MIN_WIDTH_FOR_TEXT = 60
  const barWidth = Number.parseInt(position.width.replace("px", ""))
  const showText = barWidth >= MIN_WIDTH_FOR_TEXT

  return (
    <div
      className={`absolute rounded-md border-2 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
        isParent ? "h-12" : "h-8"
      } ${getStatusColor()}`}
      style={{
        left: position.left,
        width: position.width,
        top: isParent ? "8px" : "6px",
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <div className="h-full p-1.5 rounded-md bg-background overflow-hidden">
        <div className="flex items-center gap-1 mb-1">
          <ProgressIndicator status={task.status} size="sm" />
          {showText && <div className="text-xs font-medium truncate flex-1">{task.title}</div>}
          {hasMultipleAssignees && <Users className="h-3 w-3 opacity-80" />}
        </div>
        <div className="w-full overflow-hidden">
          <Progress value={completionPercentage} className="h-1.5" />
        </div>
      </div>
    </div>
  )
}
