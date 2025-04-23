import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  runTransaction,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { SubTask } from "@/lib/types"

// Collection references
const subtasksCollection = collection(db, "subtasks")
const tasksCollection = collection(db, "tasks")

/**
 * Create a new subtask
 */
export async function createSubtask(subtaskData: Omit<SubTask, "id">): Promise<string> {
  try {
    // Validate required fields
    if (!subtaskData.parentId) {
      throw new Error("Parent task ID is required")
    }

    // Generate a unique ID for the subtask
    const subtaskRef = doc(subtasksCollection)
    const subtaskId = subtaskRef.id

    // Get a reference to the parent task
    const parentTaskRef = doc(tasksCollection, subtaskData.parentId)

    // Use a transaction to ensure both operations succeed or fail together
    await runTransaction(db, async (transaction) => {
      // Check if parent task exists
      const parentTaskDoc = await transaction.get(parentTaskRef)
      if (!parentTaskDoc.exists()) {
        throw new Error(`Parent task with ID ${subtaskData.parentId} not found`)
      }

      // Create the subtask document
      transaction.set(subtaskRef, {
        ...subtaskData,
        id: subtaskId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // Update the parent task's subtaskIds array
      const parentData = parentTaskDoc.data()
      const subtaskIds = parentData.subtaskIds || []

      transaction.update(parentTaskRef, {
        subtaskIds: [...subtaskIds, subtaskId],
        updatedAt: serverTimestamp(),
      })
    })

    console.log(`Subtask created with ID: ${subtaskId}`)
    return subtaskId
  } catch (error) {
    console.error("Error creating subtask:", error)
    throw error
  }
}

/**
 * Get a subtask by ID
 */
export async function getSubtask(subtaskId: string): Promise<SubTask | null> {
  try {
    const subtaskRef = doc(subtasksCollection, subtaskId)
    const subtaskDoc = await getDoc(subtaskRef)

    if (!subtaskDoc.exists()) {
      console.log(`Subtask with ID ${subtaskId} not found`)
      return null
    }

    return { ...subtaskDoc.data(), id: subtaskDoc.id } as SubTask
  } catch (error) {
    console.error(`Error getting subtask ${subtaskId}:`, error)
    throw error
  }
}

/**
 * Get all subtasks for a parent task
 */
export async function getSubtasksByParent(parentId: string): Promise<SubTask[]> {
  try {
    const q = query(subtasksCollection, where("parentId", "==", parentId), orderBy("startDate", "asc"))

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as SubTask)
  } catch (error) {
    console.error(`Error getting subtasks for parent ${parentId}:`, error)
    throw error
  }
}

/**
 * Update a subtask
 */
export async function updateSubtask(subtaskId: string, updatedData: Partial<SubTask>): Promise<void> {
  try {
    // Validate the subtask ID
    if (!subtaskId) {
      throw new Error("Subtask ID is required")
    }

    const subtaskRef = doc(subtasksCollection, subtaskId)

    // Check if subtask exists
    const subtaskDoc = await getDoc(subtaskRef)
    if (!subtaskDoc.exists()) {
      throw new Error(`Subtask with ID ${subtaskId} not found`)
    }

    // Validate critical fields if they're being updated
    if (updatedData.parentId && typeof updatedData.parentId !== "string") {
      throw new Error("Invalid parentId provided")
    }

    // Update the subtask
    await updateDoc(subtaskRef, {
      ...updatedData,
      updatedAt: serverTimestamp(),
    })

    console.log(`Subtask ${subtaskId} updated successfully`)
  } catch (error) {
    console.error(`Error updating subtask ${subtaskId}:`, error)
    throw error
  }
}

/**
 * Delete a subtask
 */
export async function deleteSubtask(subtaskId: string): Promise<void> {
  try {
    const subtaskRef = doc(subtasksCollection, subtaskId)

    // Get the subtask to find its parent
    const subtaskDoc = await getDoc(subtaskRef)
    if (!subtaskDoc.exists()) {
      throw new Error(`Subtask with ID ${subtaskId} not found`)
    }

    const subtaskData = subtaskDoc.data()
    const parentId = subtaskData.parentId

    if (!parentId) {
      throw new Error(`Subtask ${subtaskId} has no parent ID`)
    }

    const parentTaskRef = doc(tasksCollection, parentId)

    // Use a transaction to ensure both operations succeed or fail together
    await runTransaction(db, async (transaction) => {
      // Check if parent task exists
      const parentTaskDoc = await transaction.get(parentTaskRef)
      if (!parentTaskDoc.exists()) {
        throw new Error(`Parent task with ID ${parentId} not found`)
      }

      // Delete the subtask
      transaction.delete(subtaskRef)

      // Update the parent task's subtaskIds array
      const parentData = parentTaskDoc.data()
      const subtaskIds = parentData.subtaskIds || []
      const updatedSubtaskIds = subtaskIds.filter((id) => id !== subtaskId)

      transaction.update(parentTaskRef, {
        subtaskIds: updatedSubtaskIds,
        updatedAt: serverTimestamp(),
      })
    })

    console.log(`Subtask ${subtaskId} deleted successfully`)
  } catch (error) {
    console.error(`Error deleting subtask ${subtaskId}:`, error)
    throw error
  }
}

/**
 * Batch create multiple subtasks
 */
export async function batchCreateSubtasks(
  parentId: string,
  subtasks: Omit<SubTask, "id" | "parentId">[],
): Promise<string[]> {
  try {
    if (!parentId) {
      throw new Error("Parent task ID is required")
    }

    if (!subtasks.length) {
      return []
    }

    const parentTaskRef = doc(tasksCollection, parentId)
    const batch = writeBatch(db)
    const subtaskIds: string[] = []

    // First check if parent exists
    const parentTaskDoc = await getDoc(parentTaskRef)
    if (!parentTaskDoc.exists()) {
      throw new Error(`Parent task with ID ${parentId} not found`)
    }

    // Create each subtask
    for (const subtaskData of subtasks) {
      const subtaskRef = doc(subtasksCollection)
      const subtaskId = subtaskRef.id
      subtaskIds.push(subtaskId)

      batch.set(subtaskRef, {
        ...subtaskData,
        id: subtaskId,
        parentId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }

    // Update parent task with new subtask IDs
    const parentData = parentTaskDoc.data()
    const existingSubtaskIds = parentData.subtaskIds || []

    batch.update(parentTaskRef, {
      subtaskIds: [...existingSubtaskIds, ...subtaskIds],
      updatedAt: serverTimestamp(),
    })

    // Commit the batch
    await batch.commit()

    console.log(`Created ${subtaskIds.length} subtasks for parent ${parentId}`)
    return subtaskIds
  } catch (error) {
    console.error(`Error batch creating subtasks for parent ${parentId}:`, error)
    throw error
  }
}

/**
 * Get subtasks by assignee
 */
export async function getSubtasksByAssignee(userId: string): Promise<SubTask[]> {
  try {
    const q = query(subtasksCollection, where("assigneeIds", "array-contains", userId), orderBy("startDate", "asc"))

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as SubTask)
  } catch (error) {
    console.error(`Error getting subtasks for user ${userId}:`, error)
    throw error
  }
}

/**
 * Update subtask status and completion
 */
export async function updateSubtaskStatusAndCompletion(
  subtaskId: string,
  status: string,
  completion: number,
): Promise<void> {
  try {
    const subtaskRef = doc(subtasksCollection, subtaskId)

    // Validate the status and completion
    if (!["pending", "in-progress", "completed", "approved", "rejected"].includes(status)) {
      throw new Error(`Invalid status: ${status}`)
    }

    if (completion < 0 || completion > 100) {
      throw new Error(`Invalid completion percentage: ${completion}`)
    }

    await updateDoc(subtaskRef, {
      status,
      completion,
      updatedAt: serverTimestamp(),
    })

    console.log(`Updated status of subtask ${subtaskId} to ${status} (${completion}%)`)

    // Get the subtask to find its parent
    const subtaskDoc = await getDoc(subtaskRef)
    if (subtaskDoc.exists()) {
      const subtaskData = subtaskDoc.data()
      if (subtaskData.parentId) {
        // Optionally sync the parent task's completion
        // This is commented out to avoid circular dependencies
        // You can uncomment and import the function if needed
        // await syncTaskCompletionFromSubtasks(subtaskData.parentId)
      }
    }
  } catch (error) {
    console.error(`Error updating subtask ${subtaskId} status:`, error)
    throw error
  }
}

/**
 * Helper function to convert Firestore timestamps to ISO strings
 */
export function normalizeSubtaskDates(subtask: any): SubTask {
  const normalized = { ...subtask }

  // Convert Firestore timestamps to ISO strings
  if (normalized.createdAt && normalized.createdAt instanceof Timestamp) {
    normalized.createdAt = normalized.createdAt.toDate().toISOString()
  }

  if (normalized.updatedAt && normalized.updatedAt instanceof Timestamp) {
    normalized.updatedAt = normalized.updatedAt.toDate().toISOString()
  }

  return normalized as SubTask
}
