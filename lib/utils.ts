import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { isAfter, isSameDay, startOfDay } from "date-fns"
import { tasks } from "./data"
import type { Task } from "./types"
import { format as dateFnsFormat } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Calculate task burden (complexity + workload)
export function calculateTaskBurden(task: Task): number {
  // The issue might be here - let's ensure we're handling undefined or null values
  if (!task || typeof task.complexity !== "number" || typeof task.workload !== "number") {
    console.warn("Invalid task data for burden calculation:", task)
    return 0
  }
  return Number.parseFloat((task.complexity + task.workload).toFixed(1))
}

/**
 * Formats a name according to the specified format:
 * - If preferredName exists, use it as the first name
 * - Add initials of other names
 *
 * Example:
 * - Full name: "Haail Hassan Haleem", preferred: "Haail" -> "Haail H.H."
 * - Full name: "Mohamed Zaid Asad", preferred: "Zaid" -> "M. Zaid A."
 */
export function formatName(fullName: string, preferredName?: string): string {
  if (!fullName) return ""

  // Split the full name into parts
  const nameParts = fullName.trim().split(/\s+/)

  // If there's only one part, return it
  if (nameParts.length <= 1) return fullName

  // Find the preferred name in the parts, or use the first name
  const preferredIndex = preferredName
    ? nameParts.findIndex((part) => part.toLowerCase() === preferredName.toLowerCase())
    : 0

  // If preferred name not found in the full name, use first name
  const firstNameIndex = preferredIndex >= 0 ? preferredIndex : 0

  // Start with the preferred/first name
  let formattedName = nameParts[firstNameIndex]

  // Add initials for other parts
  nameParts.forEach((part, index) => {
    if (index !== firstNameIndex && part.length > 0) {
      // Add initial with period
      formattedName += ` ${part[0]}.`
    }
  })

  return formattedName
}

// Also check the calculateBurdenScore function
export function calculateBurdenScore(staffId: number | string): number {
  // Get all active tasks for this staff member from the tasks context
  const staffTasks = tasks.filter((task) => task.assigneeIds.includes(staffId) && task.status !== "approved")

  // Filter out past tasks
  const today = startOfDay(new Date())
  const currentAndFutureTasks = staffTasks.filter((task) => {
    const taskEndDate = new Date(task.endDate)
    return isAfter(taskEndDate, today) || isSameDay(taskEndDate, today)
  })

  // If no tasks, return 0
  if (currentAndFutureTasks.length === 0) {
    return 0
  }

  // Calculate total burden score
  let totalBurden = 0

  currentAndFutureTasks.forEach((task) => {
    // Calculate task burden (complexity + workload)
    const taskBurden = calculateTaskBurden(task)

    // For multi-assignee tasks, divide the burden by the number of assignees
    const assigneeCount = task.assigneeIds.length || 1 // Ensure we don't divide by zero
    const adjustedBurden = taskBurden / assigneeCount

    // Add to total burden
    totalBurden += adjustedBurden
  })

  // Calculate average burden (sum of burdens divided by number of tasks)
  const averageBurden = totalBurden / currentAndFutureTasks.length

  // Since complexity and workload are each 1-5, their sum is 2-10, which is already on our desired scale
  return Number.parseFloat(averageBurden.toFixed(1))
}

// Get tasks for a specific user
export function getUserTasks(userId: string | number) {
  return tasks.filter((task) => task.assigneeIds.includes(userId))
}

// Get historical tasks for a user (or all if manager)
export function getHistoricalTasks(userId: string | number, isManager: boolean) {
  if (isManager) {
    return tasks.filter((task) => task.status === "approved")
  }
  return tasks.filter((task) => task.status === "approved" && task.assigneeIds.includes(userId))
}

// Format assignee names as a string
export function formatAssignees(assigneeIds: (string | number)[], staffMembers = [], maxDisplay = 2) {
  if (!assigneeIds || assigneeIds.length === 0) return "No assignees"

  const assignees = assigneeIds.map((id) => {
    const staff = staffMembers.find((s) => s.id === id)
    return staff ? staff.name : "Unknown"
  })

  if (assignees.length <= maxDisplay) {
    return assignees.join(", ")
  }

  return `${assignees.slice(0, maxDisplay).join(", ")} +${assignees.length - maxDisplay}`
}

export const format = dateFnsFormat
