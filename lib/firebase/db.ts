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
} from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { Task } from "@/lib/types"

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

export async function getTask(taskId: string): Promise<Task | null> {
  try {
    console.log(`Getting task with ID: ${taskId}`)
    const taskRef = doc(db, "tasks", taskId)
    const taskDoc = await getDoc(taskRef)

    if (!taskDoc.exists()) {
      console.log(`Task with ID ${taskId} not found`)
      return null
    }

    // Check if this is a subtask by looking for a "-sub-" in the ID
    // Safely check if taskId is defined and is a string before using indexOf
    const isSubtask = taskId && typeof taskId === "string" && taskId.indexOf("-sub-") !== -1

    if (isSubtask) {
      // This is a subtask, we need to extract the parent ID and get the subtask from it
      const parentId = taskId.split("-sub-")[0]
      console.log(`This appears to be a subtask. Parent task ID: ${parentId}`)

      // Get the parent task
      const parentTaskRef = doc(db, "tasks", parentId)
      const parentTaskDoc = await getDoc(parentTaskRef)

      if (!parentTaskDoc.exists()) {
        console.log(`Parent task with ID ${parentId} not found`)
        return null
      }

      const parentTask = parentTaskDoc.data()

      // Find the subtask in the parent's subtasks array
      if (parentTask.subtasks && Array.isArray(parentTask.subtasks)) {
        const subtask = parentTask.subtasks.find((st: any) => st.id === taskId)

        if (subtask) {
          // Return the subtask with additional parent info
          return {
            ...subtask,
            parentId,
            id: taskId,
          } as Task
        }
      }

      console.log(`Subtask with ID ${taskId} not found in parent task`)
      return null
    }

    return { id: taskDoc.id, ...taskDoc.data() } as Task
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

// Update the updateTask function to handle subtasks properly
export async function updateTask(taskId: string, updatedTask: any, createIfNotExists = false) {
  try {
    console.log(`Updating task with ID: ${taskId}`, createIfNotExists ? "(create if not exists)" : "")

    // Check if this is a subtask by looking for a parentId or "-sub-" in the ID
    const isSubtask = updatedTask.parentId || (taskId && taskId.includes("-sub-"))

    if (isSubtask) {
      console.log("This is a subtask. Finding parent task to update subtask within it.")

      // Get the parent ID
      const parentId = updatedTask.parentId || taskId.split("-sub-")[0]
      console.log(`Parent task ID: ${parentId}`)

      // Get the parent task
      const parentTaskRef = doc(db, "tasks", parentId)
      const parentTaskDoc = await getDoc(parentTaskRef)

      if (!parentTaskDoc.exists()) {
        throw new Error(`Parent task with ID ${parentId} not found`)
      }

      const parentTask = { id: parentTaskDoc.id, ...parentTaskDoc.data() } as Task

      // Find and update the subtask within the parent task
      if (parentTask.subtasks && parentTask.subtasks.length > 0) {
        const subtaskIndex = parentTask.subtasks.findIndex((st) => st.id === taskId)

        if (subtaskIndex !== -1) {
          console.log(`Found subtask at index ${subtaskIndex}. Updating it.`)

          // Update the subtask in the parent's subtasks array
          parentTask.subtasks[subtaskIndex] = {
            ...parentTask.subtasks[subtaskIndex],
            ...updatedTask,
            id: taskId, // Ensure ID is preserved
            parentId: parentId, // Ensure parent ID is preserved
            updatedAt: new Date().toISOString(),
          }

          // Update the parent task with the modified subtasks array
          await updateDoc(parentTaskRef, {
            subtasks: parentTask.subtasks,
            updatedAt: serverTimestamp(),
          })

          console.log(`Subtask ${taskId} updated successfully within parent task ${parentId}`)
          return taskId
        } else {
          console.warn(`Subtask with ID ${taskId} not found in parent task ${parentId}`)

          // If we're creating if not exists, add it as a new subtask
          if (createIfNotExists) {
            console.log(`Adding subtask ${taskId} to parent task ${parentId}`)

            // Ensure the subtask has the correct ID and parentId
            const newSubtask = {
              ...updatedTask,
              id: taskId,
              parentId: parentId,
              updatedAt: new Date().toISOString(),
            }

            // Add the subtask to the parent's subtasks array
            parentTask.subtasks.push(newSubtask)

            // Update the parent task with the modified subtasks array
            await updateDoc(parentTaskRef, {
              subtasks: parentTask.subtasks,
              updatedAt: serverTimestamp(),
            })

            console.log(`Subtask ${taskId} added to parent task ${parentId}`)
            return taskId
          }

          throw new Error(`Subtask with ID ${taskId} not found in parent task ${parentId}`)
        }
      } else {
        console.warn(`Parent task ${parentId} has no subtasks array`)

        // If we're creating if not exists and the parent has no subtasks array, create it
        if (createIfNotExists) {
          console.log(`Creating subtasks array for parent task ${parentId}`)

          // Ensure the subtask has the correct ID and parentId
          const newSubtask = {
            ...updatedTask,
            id: taskId,
            parentId: parentId,
            updatedAt: new Date().toISOString(),
          }

          // Update the parent task with the new subtasks array
          await updateDoc(parentTaskRef, {
            subtasks: [newSubtask],
            updatedAt: serverTimestamp(),
          })

          console.log(`Subtask ${taskId} added to parent task ${parentId}`)
          return taskId
        }

        throw new Error(`Parent task ${parentId} has no subtasks array`)
      }
    } else {
      // This is a regular task, update it normally
      console.log(`Updating regular task ${taskId}`)
      const taskRef = doc(db, "tasks", taskId)

      if (createIfNotExists) {
        // Use set with merge option to create if not exists
        await setDoc(
          taskRef,
          {
            ...updatedTask,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
        console.log(`Task ${taskId} created or updated successfully`)
      } else {
        // Use regular update
        await updateDoc(taskRef, {
          ...updatedTask,
          updatedAt: serverTimestamp(),
        })
        console.log(`Task ${taskId} updated successfully`)
      }

      return taskId
    }
  } catch (error) {
    console.error("Error updating task:", error)
    throw error
  }
}

export async function deleteTask(taskId: string) {
  try {
    console.log(`Deleting task with ID: ${taskId}`)
    const taskRef = doc(db, "tasks", taskId)
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

// Add this function to update a specific subtask
export async function updateSubtask(parentTaskId: string, subtaskId: string, updatedData: any) {
  try {
    console.log(`Updating subtask ${subtaskId} in parent ${parentTaskId}`)

    // Get the parent task
    const taskDoc = await getDoc(doc(db, "tasks", parentTaskId))

    if (!taskDoc.exists()) {
      throw new Error(`Parent task ${parentTaskId} not found`)
    }

    const taskData = taskDoc.data()

    // Find the subtask index
    const subtaskIndex = taskData.subtasks?.findIndex((st: any) => st.id === subtaskId)

    if (subtaskIndex === -1 || subtaskIndex === undefined) {
      throw new Error(`Subtask ${subtaskId} not found in parent task`)
    }

    // Create a new subtasks array with the updated subtask
    const updatedSubtasks = [...taskData.subtasks]
    updatedSubtasks[subtaskIndex] = {
      ...updatedSubtasks[subtaskIndex],
      ...updatedData,
    }

    // Update the parent task with the new subtasks array
    await updateDoc(doc(db, "tasks", parentTaskId), {
      subtasks: updatedSubtasks,
    })

    console.log(`Subtask ${subtaskId} updated successfully`)
    return true
  } catch (error) {
    console.error("Error updating subtask:", error)
    throw error
  }
}

// Real-time updates
export function subscribeToTasks(
  workspaceId: string,
  callback: (snapshot: QuerySnapshot<DocumentData>) => void,
  errorCallback: (error: Error) => void,
) {
  try {
    console.log(`Subscribing to tasks for workspace: ${workspaceId}`)
    const tasksRef = collection(db, "tasks")
    const q = query(tasksRef, where("workspaceId", "==", workspaceId), orderBy("startDate", "asc"))

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
