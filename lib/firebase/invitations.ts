import { collection, doc, setDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

// Create a task invitation
export async function createTaskInvitation(
  taskId: string,
  subtaskId: string | null,
  inviterId: string,
  inviteeId: string,
  workspaceId: string,
): Promise<string> {
  try {
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

    return invitationId
  } catch (error) {
    console.error("Error creating task invitation:", error)
    throw error
  }
}
