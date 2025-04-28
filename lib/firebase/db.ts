import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  type DocumentData,
  type QuerySnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { Task } from "@/lib/types"
import { getSubtasksByParent, batchCreateSubtasks } from "@/lib/firebase/subtasks"

// Add this function to create a new document with auto-generated ID
export async function addDocument(collectionName: string, data: any) {
  try {
    const collectionRef = collection(db, collectionName)
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: serverTimestamp(),
    })
    console.log(`Document added to ${collectionName} with ID: ${docRef.id}`)
    return docRef
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error)
    throw error
  }
}

// Tasks
export async function getTasks(workspaceId: string) {
  try {
    console.log(`Getting tasks for workspace: ${workspaceId}`)
    const tasksRef = collection(db, "tasks")
    const q = query(tasksRef, where("workspaceId", "==", workspaceId), orderBy("startDate", "asc"))
    const snapshot = await getDocs(q)
    console.log(`Retrieved ${snapshot.docs.length} tasks`)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error("Error getting tasks:", error)
    return []
  }
}

// Add this function to create a task with subtasks
export async function createTaskWithSubtasks(
  taskData: Omit<Task, "id">,
  subtasksData?: Omit<Task, "id" | "parentId">[],
) {
  try {
    console.log("Creating new task with subtasks:", taskData.title)

    // First create the task without subtasks
    const taskWithoutSubtasks = {
      ...taskData,
      subtaskIds: [], // Initialize empty array for subtask IDs
    }

    // Remove the subtasks array if it exists
    if ("subtasks" in taskWithoutSubtasks) {
      delete taskWithoutSubtasks.subtasks
    }

    // Create the task
    const tasksRef = collection(db, "tasks")
    const docRef = await addDoc(tasksRef, {
      ...taskWithoutSubtasks,
      createdAt: serverTimestamp(),
    })

    const taskId = docRef.id
    console.log(`Task created with ID: ${taskId}`)

    // If there are subtasks, create them
    if (subtasksData && subtasksData.length > 0) {
      const subtaskIds = await batchCreateSubtasks(taskId, subtasksData)
      console.log(`Created ${subtaskIds.length} subtasks for task ${taskId}`)
    }

    return taskId
  } catch (error) {
    console.error("Error creating task with subtasks:", error)
    throw error
  }
}

// Update the getTask function to fetch subtasks separately
export async function getTask(taskId: string): Promise<Task | null> {
  try {
    console.log(`Getting task with ID: ${taskId}`)

    // Check if this is a subtask ID
    if (taskId.includes("-sub-")) {
      console.log(`This appears to be a legacy subtask ID: ${taskId}`)
      // For backward compatibility with old subtask IDs
      // You can implement legacy handling here if needed
      return null
    }

    const taskRef = doc(db, "tasks", taskId)
    const taskDoc = await getDoc(taskRef)

    if (!taskDoc.exists()) {
      console.log(`Task with ID ${taskId} not found`)
      return null
    }

    const taskData = taskDoc.data()

    // Fetch subtasks if the task has any subtaskIds
    let subtasks = []
    if (taskData.subtaskIds && taskData.subtaskIds.length > 0) {
      console.log(`Fetching ${taskData.subtaskIds.length} subtasks for task ${taskId}`)
      subtasks = await getSubtasksByParent(taskId)

      // Add the parentId to each subtask explicitly
      subtasks = subtasks.map((subtask) => ({
        ...subtask,
        parentId: taskId,
      }))

      console.log(`Successfully fetched ${subtasks.length} subtasks for task ${taskId}`)
    }

    // Return the task with its subtasks
    return {
      id: taskDoc.id,
      ...taskData,
      subtasks: subtasks || [],
    } as Task
  } catch (error) {
    console.error("Error getting task:", error)
    throw error
  }
}

export async function getTasksByUser(workspaceId: string, userId: string) {
  try {
    console.log(`Getting tasks for user ${userId} in workspace ${workspaceId}`)
    const tasksRef = collection(db, "tasks")
    const q = query(
      tasksRef,
      where("workspaceId", "==", workspaceId),
      where("assigneeIds", "array-contains", userId),
      orderBy("startDate", "asc"),
    )
    const snapshot = await getDocs(q)
    console.log(`Retrieved ${snapshot.docs.length} tasks for user`)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error("Error getting tasks by user:", error)
    return []
  }
}

export async function createTask(taskData: Omit<Task, "id">) {
  try {
    console.log("Creating new task:", taskData.title)
    const tasksRef = collection(db, "tasks")
    const docRef = await addDoc(tasksRef, {
      ...taskData,
      createdAt: serverTimestamp(),
    })
    console.log(`Task created with ID: ${docRef.id}`)
    return docRef.id
  } catch (error) {
    console.error("Error creating task:", error)
    throw error
  }
}

// Replace the updateTask function with this refactored version
export async function updateTask(taskId: string, updatedTask: any, createIfNotExists = false) {
  try {
    console.log(`Updating task with ID: ${taskId}`, createIfNotExists ? "(create if not exists)" : "")

    // Remove subtasks from the task data to prevent circular updates
    const taskDataWithoutSubtasks = { ...updatedTask }
    delete taskDataWithoutSubtasks.subtasks

    // Update the task document
    const taskRef = doc(db, "tasks", taskId)

    if (createIfNotExists) {
      // Use set with merge option to create if not exists
      await setDoc(
        taskRef,
        {
          ...taskDataWithoutSubtasks,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
      console.log(`Task ${taskId} created or updated successfully`)
    } else {
      // Use regular update
      await updateDoc(taskRef, {
        ...taskDataWithoutSubtasks,
        updatedAt: serverTimestamp(),
      })
      console.log(`Task ${taskId} updated successfully`)
    }

    return taskId
  } catch (error) {
    console.error("Error updating task:", error)
    throw error
  }
}

// Add this new function to sync task completion based on subtasks
export async function syncTaskCompletionFromSubtasks(taskId: string): Promise<void> {
  try {
    // Get all subtasks for this task
    const subtasks = await getSubtasksByParent(taskId)

    if (!subtasks || subtasks.length === 0) {
      return // No subtasks to sync from
    }

    // Calculate average completion
    const totalCompletion = subtasks.reduce((sum, subtask) => sum + (subtask.completion || 0), 0)
    const averageCompletion = Math.round(totalCompletion / subtasks.length)

    // Determine task status based on subtasks
    let taskStatus = "pending"
    const allCompleted = subtasks.every((subtask) => subtask.status === "completed")
    const anyInProgress = subtasks.some((subtask) => subtask.status === "in-progress")

    if (allCompleted) {
      taskStatus = "completed"
    } else if (anyInProgress) {
      taskStatus = "in-progress"
    }

    // Update only the task's completion and status
    const taskRef = doc(db, "tasks", taskId)
    await updateDoc(taskRef, {
      completion: averageCompletion,
      status: taskStatus,
      updatedAt: serverTimestamp(),
    })

    console.log(`Synced task ${taskId} completion (${averageCompletion}%) and status (${taskStatus}) from subtasks`)
  } catch (error) {
    console.error(`Error syncing task completion from subtasks:`, error)
    throw error
  }
}

// Update the deleteTask function to also delete subtasks
export async function deleteTask(taskId: string) {
  try {
    console.log(`Deleting task with ID: ${taskId}`)

    // Get the task to check for subtasks
    const taskRef = doc(db, "tasks", taskId)
    const taskDoc = await getDoc(taskRef)

    if (!taskDoc.exists()) {
      console.log(`Task ${taskId} not found, nothing to delete`)
      return
    }

    const taskData = taskDoc.data()

    // Delete all subtasks first
    if (taskData.subtaskIds && taskData.subtaskIds.length > 0) {
      const batch = writeBatch(db)

      for (const subtaskId of taskData.subtaskIds) {
        const subtaskRef = doc(db, "subtasks", subtaskId)
        batch.delete(subtaskRef)
      }

      await batch.commit()
      console.log(`Deleted ${taskData.subtaskIds.length} subtasks for task ${taskId}`)
    }

    // Now delete the task itself
    await deleteDoc(taskRef)
    console.log(`Task ${taskId} deleted successfully`)
  } catch (error) {
    console.error("Error deleting task:", error)
    throw error
  }
}

// Add this function to your db.ts file to handle subtasks specifically
export async function getSubtaskById(subtaskId: string, parentTaskId: string) {
  try {
    console.log(`Fetching subtask ${subtaskId} from parent ${parentTaskId}`)

    // First get the parent task
    const taskDoc = await getDoc(doc(db, "tasks", parentTaskId))

    if (!taskDoc.exists()) {
      console.error(`Parent task ${parentTaskId} not found`)
      return null
    }

    const taskData = taskDoc.data()

    // Find the subtask in the parent's subtasks array
    const subtask = taskData.subtasks?.find((st: any) => st.id === subtaskId)

    if (!subtask) {
      console.error(`Subtask ${subtaskId} not found in parent task`)
      return null
    }

    // Return the subtask with its parent ID for reference
    return {
      ...subtask,
      parentId: parentTaskId,
    }
  } catch (error) {
    console.error("Error fetching subtask:", error)
    throw error
  }
}

// Real-time updates
// Modify the subscribeToTasks function to filter tasks at the data retrieval level
export function subscribeToTasks(
  workspaceId: string,
  callback: (snapshot: QuerySnapshot<DocumentData>) => void,
  errorCallback: (error: Error) => void,
  userId?: string, // Add userId parameter to filter tasks
) {
  try {
    console.log(`Subscribing to tasks for workspace: ${workspaceId}${userId ? ` and user: ${userId}` : ""}`)
    const tasksRef = collection(db, "tasks")

    // Create base query with workspace filter
    let q = query(tasksRef, where("workspaceId", "==", workspaceId), orderBy("startDate", "asc"))

    // If userId is provided and not an admin/owner, filter tasks at the database level
    if (userId) {
      // We can't directly filter for subtasks at the Firestore level, so we'll do that in memory
      q = query(
        tasksRef,
        where("workspaceId", "==", workspaceId),
        where("assigneeIds", "array-contains", userId),
        orderBy("startDate", "asc"),
      )
    }

    return onSnapshot(
      q,
      (snapshot) => {
        console.log(`Received task update with ${snapshot.docs.length} tasks`)
        callback(snapshot)
      },
      (error) => {
        console.error("Error in task subscription:", error)
        errorCallback(error)
      },
    )
  } catch (error) {
    console.error("Error setting up task subscription:", error)
    errorCallback(error as Error)
    // Return a no-op unsubscribe function
    return () => {}
  }
}

// Files
export async function getTaskFiles(taskId: string) {
  try {
    const filesRef = collection(db, "tasks", taskId, "files")
    const snapshot = await getDocs(filesRef)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error("Error getting task files:", error)
    return []
  }
}

export async function addTaskFile(taskId: string, fileData: any) {
  try {
    const filesRef = collection(db, "tasks", taskId, "files")
    const docRef = await addDoc(filesRef, {
      ...fileData,
      uploadedAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error adding task file:", error)
    throw error
  }
}

export async function deleteTaskFile(taskId: string, fileId: string) {
  try {
    const fileRef = doc(db, "tasks", taskId, "files", fileId)
    await deleteDoc(fileRef)
  } catch (error) {
    console.error("Error deleting task file:", error)
    throw error
  }
}

// Task Invitations
export async function createTaskInvitation(
  taskId: string,
  subtaskId: string | null,
  inviterId: string,
  inviteeId: string,
  workspaceId: string,
): Promise<string> {
  try {
    console.log(`Creating task invitation for task ${taskId}, invitee: ${inviteeId}`)
    // Check if invitation already exists
    const existingQuery = query(
      collection(db, "taskInvitations"),
      where("taskId", "==", taskId),
      where("inviteeId", "==", inviteeId),
      where("status", "==", "pending"),
      ...(subtaskId ? [where("subtaskId", "==", subtaskId)] : []),
    )

    const existingDocs = await getDocs(existingQuery)

    if (!existingDocs.empty) {
      // Return existing invitation ID
      console.log(`Invitation already exists with ID: ${existingDocs.docs[0].id}`)
      return existingDocs.docs[0].id
    }

    // Create new invitation
    const invitationRef = doc(collection(db, "taskInvitations"))
    const invitationId = invitationRef.id

    await setDoc(invitationRef, {
      id: invitationId,
      taskId,
      subtaskId: subtaskId || null,
      inviterId,
      inviteeId,
      workspaceId,
      status: "pending",
      createdAt: serverTimestamp(),
    })

    console.log(`Created new invitation with ID: ${invitationId}`)
    return invitationId
  } catch (error) {
    console.error("Error creating task invitation:", error)
    throw error
  }
}

// Get workspace members - using existing imports from above
export async function getWorkspaceMembers(workspaceId: string) {
  try {
    const q = query(collection(db, "workspaceMembers"), where("workspaceId", "==", workspaceId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting workspace members:", error)
    throw error
  }
}
