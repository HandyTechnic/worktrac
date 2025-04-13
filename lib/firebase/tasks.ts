import { doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

export async function updateTask(taskId: string, updatedTask: any) {
  try {
    const taskRef = doc(db, "tasks", taskId)
    await updateDoc(taskRef, {
      ...updatedTask,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating task:", error)
    throw error
  }
}
