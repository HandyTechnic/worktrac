"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { subscribeToTasks, createTask, updateTask, deleteTask as deleteTaskFromDB } from "@/lib/firebase/db"
import type { Task } from "@/lib/types"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { getWorkspaceMembers } from "@/lib/firebase/workspace"
import { sendNotification } from "@/lib/notification-service"
import { createTaskInvitation } from "@/lib/firebase/task-invitations"

const TaskContext = createContext<
  | {
      tasks: Task[] | null
      loading: boolean
      addTask: (task: Omit<Task, "id">) => Promise<string | undefined>
      updateTask: (taskId: string, taskData: Partial<Task>) => Promise<void>
      deleteTask: (taskId: string) => Promise<void>
    }
  | undefined
>(undefined)

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { userRole } = useWorkspace()

  useEffect(() => {
    if (!user) {
      setTasks(null)
      setLoading(false)
      return
    }

    // If no workspace is selected, don't try to load tasks
    if (!currentWorkspace) {
      console.log("No workspace selected, tasks will not be loaded")
      setTasks([]) // Set to empty array instead of null to avoid rendering issues
      setLoading(false)
      return
    }

    console.log(`Loading tasks for workspace: ${currentWorkspace.id}`)

    const unsubscribe = subscribeToTasks(
      currentWorkspace.id,
      (snapshot) => {
        const allTasks: Task[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[]
        console.log(`Loaded ${allTasks.length} tasks from Firebase`)

        // Filter tasks based on user permissions
        let filteredTasks: Task[]

        // Owners, admins, and managers see all tasks
        if (userRole === "owner" || userRole === "admin" || userRole === "manager") {
          filteredTasks = allTasks
        } else {
          // Regular members only see tasks they're assigned to
          filteredTasks = allTasks.filter((task) => {
            // Include task if user is directly assigned
            if (task.assigneeIds?.includes(user.id)) {
              return true
            }

            // Include task if user is assigned to any subtask
            if (task.subtasks && task.subtasks.some((subtask) => subtask.assigneeIds?.includes(user.id))) {
              return true
            }

            return false
          })
        }

        setTasks(filteredTasks)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching tasks:", error)
        setTasks([]) // Set to empty array on error
        setLoading(false)
      },
    )

    return () => {
      console.log("Unsubscribing from tasks")
      unsubscribe()
    }
  }, [user, currentWorkspace, userRole])

  // Update the addTask function to check permissions
  const addTask = useCallback(
    async (task: Omit<Task, "id">) => {
      if (!currentWorkspace) {
        console.error("Workspace is not available.")
        return
      }

      // Check if user has permission to create tasks
      const isManager = userRole === "owner" || userRole === "admin" || userRole === "manager"
      const workspaceSettings = currentWorkspace.settings || {}
      const allowMembersToCreateTasks = workspaceSettings.permissions?.allowMembersToCreateTasks || false

      if (!isManager && !allowMembersToCreateTasks) {
        console.error("You don't have permission to create tasks.")
        return
      }

      try {
        // For regular members, ensure they can only assign themselves initially
        const taskWithPermissions = { ...task }

        if (!isManager) {
          // Regular members can only assign themselves initially
          taskWithPermissions.assigneeIds = [user?.id]

          // For subtasks, apply the same permission logic
          if (taskWithPermissions.subtasks && taskWithPermissions.subtasks.length > 0) {
            taskWithPermissions.subtasks = taskWithPermissions.subtasks.map((subtask) => ({
              ...subtask,
              assigneeIds: [user?.id],
            }))
          }
        }

        // Ensure the task has the current workspace ID
        const taskWithWorkspace = {
          ...taskWithPermissions,
          workspaceId: currentWorkspace.id,
        }

        const taskId = await createTask(taskWithWorkspace)
        console.log(`Created task with ID: ${taskId}`)

        // If not a manager and trying to assign others, send invitations
        if (!isManager && task.assigneeIds && task.assigneeIds.length > 0) {
          const invitationAssignees = task.assigneeIds.filter((id) => id !== user?.id)

          for (const assigneeId of invitationAssignees) {
            try {
              await createTaskInvitation(
                taskId,
                null, // No subtask
                user?.id,
                assigneeId,
                currentWorkspace.id,
              )

              // Send notification
              await sendNotification({
                userId: assigneeId as string,
                type: "task_invitation",
                title: "Task Invitation",
                message: `${user?.name || "A team member"} has invited you to join a task: "${task.title}"`,
                actionUrl: `/task/${taskId}`,
                relatedId: taskId,
                metadata: {
                  taskId,
                  inviterId: user?.id,
                  taskTitle: task.title,
                },
              })
            } catch (error) {
              console.error(`Error inviting user ${assigneeId} to task:`, error)
            }
          }
        }

        return taskId
      } catch (error) {
        console.error("Error adding task:", error)
      }
    },
    [currentWorkspace, userRole, user?.id, user?.name],
  )

  // Update the handleUpdateTask function to check permissions
  const handleUpdateTask = useCallback(
    async (taskId: string, taskData: Partial<Task>) => {
      try {
        // Get the current task data
        const taskRef = doc(db, "tasks", taskId)
        const taskDoc = await getDoc(taskRef)

        if (!taskDoc.exists()) {
          throw new Error("Task not found")
        }

        const currentTask = taskDoc.data() as Task

        // Check permissions for updating tasks
        if (userRole !== "owner" && !currentTask.assigneeIds?.includes(user?.id)) {
          throw new Error("You don't have permission to update this task")
        }

        // If this is a status change to "completed", check if we need to notify managers
        if (taskData.status === "completed" && currentTask.status !== "completed") {
          // If task requires approval, create a notification for managers
          if (currentTask.requiresApproval) {
            // Get workspace members with manager role or higher
            const workspaceMembers = await getWorkspaceMembers(currentTask.workspaceId)
            const managerMembers = workspaceMembers.filter((member) =>
              ["manager", "admin", "owner"].includes(member.role),
            )

            // Notify all managers
            for (const manager of managerMembers) {
              await sendNotification({
                userId: manager.userId,
                type: "task_approval_request",
                title: "Task Approval Required",
                message: `The task "${currentTask.title}" has been completed and requires your approval.`,
                actionUrl: `/task/${taskId}`,
                relatedId: taskId,
                metadata: {
                  taskId,
                  creatorId: currentTask.creatorId,
                  creatorName: user?.name || "Unknown",
                },
              })
            }
          } else {
            // If no approval required, notify the creator if they're not the one completing it
            if (currentTask.creatorId !== user?.id) {
              await sendNotification({
                userId: currentTask.creatorId,
                type: "task_completed",
                title: "Task Completed",
                message: `The task "${currentTask.title}" has been marked as completed.`,
                actionUrl: `/task/${taskId}`,
                relatedId: taskId,
                metadata: {
                  taskId,
                  completedBy: user?.id,
                  completedByName: user?.name || "Unknown",
                },
              })
            }
          }
        }

        // If this is a status change to "approved" or "rejected"
        if (
          (taskData.status === "approved" || taskData.status === "rejected") &&
          currentTask.status !== taskData.status
        ) {
          // Notify all assignees
          for (const assigneeId of currentTask.assigneeIds) {
            if (assigneeId !== user?.id) {
              await sendNotification({
                userId: assigneeId as string,
                type: taskData.status === "approved" ? "task_approved" : "task_rejected",
                title: taskData.status === "approved" ? "Task Approved" : "Task Rejected",
                message:
                  taskData.status === "approved"
                    ? `The task "${currentTask.title}" has been approved.`
                    : `The task "${currentTask.title}" has been rejected and needs revision.`,
                actionUrl: `/task/${taskId}`,
                relatedId: taskId,
                metadata: {
                  taskId,
                  approvedBy: user?.id,
                  approvedByName: user?.name || "Unknown",
                },
              })
            }
          }
        }

        // If this is a comment/update being added
        if (taskData.updates && currentTask.updates && taskData.updates.length > currentTask.updates.length) {
          // Get the new update
          const newUpdate = taskData.updates[taskData.updates.length - 1]

          // Notify all assignees except the commenter
          for (const assigneeId of currentTask.assigneeIds) {
            if (assigneeId !== newUpdate.userId) {
              await sendNotification({
                userId: assigneeId as string,
                type: "comment_added",
                title: "New Comment",
                message: `${user?.name || "A team member"} added a comment to the task "${currentTask.title}".`,
                actionUrl: `/task/${taskId}?tab=updates`,
                relatedId: taskId,
                metadata: {
                  taskId,
                  commenterId: user?.id,
                  commenterName: user?.name || "Unknown",
                },
              })
            }
          }

          // Also notify the task creator if they're not the commenter and not already in assignees
          if (currentTask.creatorId !== newUpdate.userId && !currentTask.assigneeIds.includes(currentTask.creatorId)) {
            await sendNotification({
              userId: currentTask.creatorId,
              type: "comment_added",
              title: "New Comment",
              message: `${user?.name || "A team member"} added a comment to the task "${currentTask.title}".`,
              actionUrl: `/task/${taskId}?tab=updates`,
              relatedId: taskId,
              metadata: {
                taskId,
                commenterId: user?.id,
                commenterName: user?.name || "Unknown",
              },
            })
          }
        }

        // Perform the actual update
        await updateTask(taskId, taskData)
        console.log(`Updated task with ID: ${taskId}`)
      } catch (error) {
        console.error("Error updating task:", error)
        throw error
      }
    },
    [user, userRole],
  )

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await deleteTaskFromDB(taskId)
      console.log(`Deleted task with ID: ${taskId}`)
    } catch (error) {
      console.error("Error deleting task:", error)
    }
  }, [])

  const value = {
    tasks,
    loading,
    addTask,
    updateTask: handleUpdateTask,
    deleteTask: handleDeleteTask,
  }

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>
}

export const useTasks = () => {
  const context = useContext(TaskContext)
  if (!context) {
    throw new Error("useTasks must be used within a TaskProvider")
  }
  return context
}
