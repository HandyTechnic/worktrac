"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useWorkspace } from "@/contexts/workspace-context"
import { useAuth } from "@/contexts/auth-context"
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  subscribeToTasks,
  createTaskWithSubtasks,
} from "@/lib/firebase/db"
import type { Task } from "@/lib/types"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

type TaskContextType = {
  tasks: Task[]
  myTasks: Task[]
  managedTasks: Task[]
  loading: boolean
  error: Error | null
  getTaskById: (id: string) => Promise<Task | null>
  createNewTask: (taskData: Omit<Task, "id">) => Promise<string>
  createTaskWithSubtasks: (
    taskData: Omit<Task, "id">,
    subtasksData?: Omit<Task, "id" | "parentId">[],
  ) => Promise<string>
  updateTask: (id: string, taskData: Partial<Task>) => Promise<string>
  removeTask: (id: string) => Promise<void>
  refreshTasks: () => Promise<void>
  getFilteredTasks: (filterOptions?: {
    showCompleted?: boolean
    onlyAssignedToMe?: boolean
    onlyManagedByMe?: boolean
  }) => Task[]
}

const TaskContext = createContext<TaskContextType>({
  tasks: [],
  myTasks: [],
  managedTasks: [],
  loading: false,
  error: null,
  getTaskById: async () => null,
  createNewTask: async () => "",
  createTaskWithSubtasks: async () => "",
  updateTask: async () => "",
  removeTask: async () => {},
  refreshTasks: async () => {},
  getFilteredTasks: () => [],
})

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const { currentWorkspace, userRole } = useWorkspace()
  const { user } = useAuth()

  // Use refs to track the current workspace ID and subscription
  const currentWorkspaceIdRef = useRef<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const currentUserRoleRef = useRef<string | null>(null)

  // Reset tasks when workspace changes
  useEffect(() => {
    if (currentWorkspaceIdRef.current !== currentWorkspace?.id) {
      console.log(`Workspace changed from ${currentWorkspaceIdRef.current} to ${currentWorkspace?.id}, resetting tasks`)
      setTasks([])

      // Clean up previous subscription if it exists
      if (unsubscribeRef.current) {
        console.log("Unsubscribing from tasks due to workspace change")
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }

      // Update the current workspace ID ref
      currentWorkspaceIdRef.current = currentWorkspace?.id || null
    }
  }, [currentWorkspace])

  // Reset tasks when user role changes
  useEffect(() => {
    if (currentUserRoleRef.current !== userRole) {
      console.log(`User role changed from ${currentUserRoleRef.current} to ${userRole}, resetting tasks`)
      setTasks([])

      // Update the current user role ref
      currentUserRoleRef.current = userRole

      // Clean up previous subscription if it exists
      if (unsubscribeRef.current) {
        console.log("Unsubscribing from tasks due to role change")
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [userRole])

  // Setup task subscription when workspace or user role changes
  useEffect(() => {
    if (!currentWorkspace || !user) {
      return
    }

    const workspaceId = currentWorkspace.id
    const userId = user.id

    // Skip if we're already subscribed to this workspace with the same role
    if (
      currentWorkspaceIdRef.current === workspaceId &&
      currentUserRoleRef.current === userRole &&
      unsubscribeRef.current
    ) {
      console.log(
        `Already subscribed to tasks for workspace: ${workspaceId} with role: ${userRole}, skipping redundant subscription`,
      )
      return
    }

    setLoading(true)
    console.log(`Loading tasks for workspace: ${workspaceId}, user: ${userId}, role: ${userRole}`)

    try {
      // Check if user is admin or owner to determine filtering approach
      const isAdmin = userRole === "admin" || userRole === "owner"

      // Subscribe to tasks - pass userId for filtering if not admin/owner
      console.log(
        `Subscribing to tasks for workspace: ${workspaceId}${!isAdmin ? ` with user filtering for: ${userId}` : ""}`,
      )
      const unsubscribe = subscribeToTasks(
        workspaceId,
        async (snapshot) => {
          try {
            console.log(`Received task update with ${snapshot.docs.length} tasks`)

            // Process tasks with their subtasks
            let tasksWithSubtasks = await Promise.all(
              snapshot.docs.map(async (doc) => {
                const taskData = doc.data()
                const taskId = doc.id

                // Fetch complete task with subtasks
                const completeTask = await getTask(taskId)
                return completeTask || { id: taskId, ...taskData }
              }),
            )

            // If not admin/owner, we need to also fetch tasks where user is assigned to subtasks
            if (!isAdmin) {
              // Get all tasks to check for subtask assignments
              const allTasksSnapshot = await getDocs(
                query(collection(db, "tasks"), where("workspaceId", "==", workspaceId)),
              )

              const additionalTasks = await Promise.all(
                allTasksSnapshot.docs
                  .filter((doc) => !snapshot.docs.some((d) => d.id === doc.id)) // Filter out tasks we already have
                  .map(async (doc) => {
                    const taskData = doc.data()
                    const taskId = doc.id

                    // Fetch complete task with subtasks
                    const completeTask = await getTask(taskId)
                    return completeTask || { id: taskId, ...taskData }
                  }),
              )

              // Filter additional tasks to only include those where user is assigned to a subtask
              const tasksWithUserSubtasks = additionalTasks.filter((task) =>
                task.subtasks?.some((subtask) => subtask.assigneeIds?.includes(userId)),
              )

              // Combine with directly assigned tasks
              tasksWithSubtasks = [...tasksWithSubtasks, ...tasksWithUserSubtasks]
            }

            console.log(`Loaded ${tasksWithSubtasks.length} tasks with subtasks from Firebase`)
            setTasks(tasksWithSubtasks as Task[])
            setLoading(false)
          } catch (err) {
            console.error("Error processing tasks:", err)
            setError(err as Error)
            setLoading(false)
          }
        },
        (err) => {
          console.error("Task subscription error:", err)
          setError(err)
          setLoading(false)
        },
        !isAdmin ? userId : undefined, // Only pass userId for filtering if not admin/owner
      )

      // Store the unsubscribe function
      unsubscribeRef.current = unsubscribe
    } catch (err) {
      console.error("Error setting up task subscription:", err)
      setError(err as Error)
      setLoading(false)
    }

    // Cleanup function
    return () => {
      // We don't unsubscribe here to prevent the subscription from being torn down
      // when components using this context remount. Instead, we manage the subscription
      // based on workspace changes.
    }
  }, [currentWorkspace, user, userRole])

  // Ensure we clean up on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        console.log("Final cleanup: Unsubscribing from tasks")
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [])

  // Memoize task operations to prevent unnecessary re-renders
  const getTaskById = useCallback(async (id: string): Promise<Task | null> => {
    try {
      return await getTask(id)
    } catch (err) {
      console.error("Error getting task:", err)
      setError(err as Error)
      return null
    }
  }, [])

  const createNewTask = useCallback(async (taskData: Omit<Task, "id">): Promise<string> => {
    try {
      return await createTask(taskData)
    } catch (err) {
      console.error("Error creating task:", err)
      setError(err as Error)
      return ""
    }
  }, [])

  const createNewTaskWithSubtasks = useCallback(
    async (taskData: Omit<Task, "id">, subtasksData?: Omit<Task, "id" | "parentId">[]): Promise<string> => {
      try {
        return await createTaskWithSubtasks(taskData, subtasksData)
      } catch (err) {
        console.error("Error creating task with subtasks:", err)
        setError(err as Error)
        return ""
      }
    },
    [],
  )

  const updateExistingTask = useCallback(async (id: string, taskData: Partial<Task>): Promise<string> => {
    try {
      return await updateTask(id, taskData)
    } catch (err) {
      console.error("Error updating task:", err)
      setError(err as Error)
      return ""
    }
  }, [])

  const removeTask = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteTask(id)
    } catch (err) {
      console.error("Error deleting task:", err)
      setError(err as Error)
    }
  }, [])

  const refreshTasks = useCallback(async (): Promise<void> => {
    if (!currentWorkspace || !user) return

    try {
      setLoading(true)

      // Check if user is admin or owner
      const isAdmin = userRole === "admin" || userRole === "owner"

      if (isAdmin) {
        // Admins and owners can see all tasks
        const fetchedTasks = await getTasks(currentWorkspace.id)

        // Process tasks with their subtasks
        const tasksWithSubtasks = await Promise.all(
          fetchedTasks.map(async (task) => {
            const completeTask = await getTask(task.id)
            return completeTask || task
          }),
        )

        setTasks(tasksWithSubtasks as Task[])
      } else {
        // For regular users and managers, only get their tasks
        const directTasks = await getDocs(
          query(
            collection(db, "tasks"),
            where("workspaceId", "==", currentWorkspace.id),
            where("assigneeIds", "array-contains", user.id),
          ),
        )

        // Get all tasks to check for subtask assignments and tasks created by managers
        const allTasksSnapshot = await getDocs(
          query(collection(db, "tasks"), where("workspaceId", "==", currentWorkspace.id)),
        )

        // Process direct tasks
        const directTasksWithSubtasks = await Promise.all(
          directTasks.docs.map(async (doc) => {
            const completeTask = await getTask(doc.id)
            return completeTask || { id: doc.id, ...doc.data() }
          }),
        )

        // Process all tasks to find ones with subtasks assigned to user or created by manager
        const additionalTasks = await Promise.all(
          allTasksSnapshot.docs
            .filter((doc) => !directTasks.docs.some((d) => d.id === doc.id)) // Filter out tasks we already have
            .map(async (doc) => {
              const taskData = doc.data()
              const taskId = doc.id

              // Fetch complete task with subtasks
              const completeTask = await getTask(taskId)
              return completeTask || { id: taskId, ...taskData }
            }),
        )

        // Filter additional tasks based on user role
        let filteredAdditionalTasks = []

        if (userRole === "manager") {
          // Managers can see tasks they created or have subtasks assigned to them
          filteredAdditionalTasks = additionalTasks.filter(
            (task) =>
              task.creatorId === user.id || task.subtasks?.some((subtask) => subtask.assigneeIds?.includes(user.id)),
          )
        } else {
          // Regular users can only see tasks with subtasks assigned to them
          filteredAdditionalTasks = additionalTasks.filter((task) =>
            task.subtasks?.some((subtask) => subtask.assigneeIds?.includes(user.id)),
          )
        }

        // Combine all tasks
        setTasks([...directTasksWithSubtasks, ...filteredAdditionalTasks] as Task[])
      }
    } catch (err) {
      console.error("Error refreshing tasks:", err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace, user, userRole])

  // Improve the getFilteredTasks function for additional client-side filtering
  const getFilteredTasks = useCallback(
    (filterOptions = {}) => {
      const { showCompleted = true, onlyAssignedToMe = false, onlyManagedByMe = false } = filterOptions

      if (!user || !tasks.length) return []

      return tasks.filter((task) => {
        // Filter by completion status if needed
        if (!showCompleted && (task.status === "completed" || task.status === "approved")) {
          return false
        }

        // Check if user is directly assigned to the task
        const isDirectlyAssigned = task.assigneeIds?.includes(user.id)

        // Check if user is assigned to any subtask
        const isAssignedToSubtask = task.subtasks?.some((subtask) => subtask.assigneeIds?.includes(user.id))

        // Check if user created the task
        const isTaskCreator = task.creatorId === user.id

        // Filter by assignment to current user if requested
        if (onlyAssignedToMe) {
          return isDirectlyAssigned || isAssignedToSubtask
        }

        // Filter by tasks managed by current user if requested
        if (onlyManagedByMe) {
          return isTaskCreator
        }

        // Apply role-based filtering
        const isAdmin = userRole === "admin" || userRole === "owner"
        const isManager = userRole === "manager"

        if (isAdmin) {
          // Admins and owners can see all tasks in the workspace
          return true
        } else if (isManager) {
          // Managers can see tasks they created or are assigned to
          return isTaskCreator || isDirectlyAssigned || isAssignedToSubtask
        } else {
          // Regular users can only see tasks they're directly assigned to or subtasks they're part of
          return isDirectlyAssigned || isAssignedToSubtask
        }
      })
    },
    [tasks, user, userRole],
  )

  // Create memoized filtered task lists
  const myTasks = useMemo(() => {
    return getFilteredTasks({ onlyAssignedToMe: true })
  }, [getFilteredTasks])

  const managedTasks = useMemo(() => {
    return getFilteredTasks({ onlyManagedByMe: true })
  }, [getFilteredTasks])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      tasks,
      myTasks,
      managedTasks,
      loading,
      error,
      getTaskById,
      createNewTask,
      createTaskWithSubtasks: createNewTaskWithSubtasks,
      updateTask: updateExistingTask,
      removeTask,
      refreshTasks,
      getFilteredTasks,
    }),
    [
      tasks,
      myTasks,
      managedTasks,
      loading,
      error,
      getTaskById,
      createNewTask,
      createNewTaskWithSubtasks,
      updateExistingTask,
      removeTask,
      refreshTasks,
      getFilteredTasks,
    ],
  )

  return <TaskContext.Provider value={contextValue}>{children}</TaskContext.Provider>
}

export const useTasks = () => useContext(TaskContext)
