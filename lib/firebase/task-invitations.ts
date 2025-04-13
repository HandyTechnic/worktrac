import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { TaskInvitation } from "@/lib/types"
import { updateTask } from "./db"
import { createNotification } from "./notifications"
import { getUser } from "./auth"

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

    // Get task details
    const taskRef = doc(db, "tasks", taskId)
    const taskDoc = await getDoc(taskRef)

    if (!taskDoc.exists()) {
      throw new Error("Task not found")
    }

    const task = taskDoc.data()

    // Permission check: Only allow invitations if the inviter is assigned to the task
    // or is a manager/admin/owner
    const inviterRef = doc(db, "users", inviterId)
    const inviterDoc = await getDoc(inviterRef)

    if (!inviterDoc.exists()) {
      throw new Error("Inviter not found")
    }

    const inviterData = inviterDoc.data()
    const isManager =
      inviterData.userRole === "manager" || inviterData.userRole === "admin" || inviterData.userRole === "owner"

    // If not a manager, check if inviter is assigned to the task
    if (!isManager && !task.assigneeIds?.includes(inviterId)) {
      throw new Error("You don't have permission to invite others to this task")
    }

    // Get inviter details
    const inviter = await getUser(inviterId)

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

    // Create notification for invitee
    await createNotification({
      userId: inviteeId,
      type: subtaskId ? "subtask_invitation" : "task_invitation",
      title: subtaskId ? "Subtask Invitation" : "Task Invitation",
      message: `${inviter.name} has invited you to join ${subtaskId ? "a subtask" : `the task "${task.title}"`}`,
      actionUrl: `/task/${taskId}`,
      relatedId: invitationId,
      metadata: {
        taskId,
        subtaskId,
        inviterId,
        taskTitle: task.title,
      },
    })

    return invitationId
  } catch (error) {
    console.error("Error creating task invitation:", error)
    throw error
  }
}

// Get task invitations for a user
export async function getTaskInvitations(userId: string, workspaceId: string): Promise<TaskInvitation[]> {
  try {
    const invitationsQuery = query(
      collection(db, "taskInvitations"),
      where("inviteeId", "==", userId),
      where("status", "==", "pending"),
      where("workspaceId", "==", workspaceId),
      orderBy("createdAt", "desc"),
    )

    const invitationDocs = await getDocs(invitationsQuery)

    return invitationDocs.docs.map((doc) => ({
      id: doc.id,
      taskId: doc.data().taskId,
      subtaskId: doc.data().subtaskId,
      inviterId: doc.data().inviterId,
      inviteeId: doc.data().inviteeId,
      status: doc.data().status,
      createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : new Date(),
      respondedAt: doc.data().respondedAt instanceof Timestamp ? doc.data().respondedAt.toDate() : undefined,
    }))
  } catch (error) {
    console.error("Error getting task invitations:", error)
    throw error
  }
}

// Accept task invitation
export async function acceptTaskInvitation(invitationId: string): Promise<void> {
  try {
    const invitationRef = doc(db, "taskInvitations", invitationId)
    const invitationDoc = await getDoc(invitationRef)

    if (!invitationDoc.exists()) {
      throw new Error("Invitation not found")
    }

    const invitation = invitationDoc.data()

    if (invitation.status !== "pending") {
      throw new Error("Invitation is no longer pending")
    }

    // Update invitation status
    await updateDoc(invitationRef, {
      status: "accepted",
      respondedAt: serverTimestamp(),
    })

    // Add user to task assignees
    const taskRef = doc(db, "tasks", invitation.taskId)
    const taskDoc = await getDoc(taskRef)

    if (!taskDoc.exists()) {
      throw new Error("Task not found")
    }

    const task = taskDoc.data()
    const invitee = await getUser(invitation.inviteeId)
    const inviter = await getUser(invitation.inviterId)

    if (invitation.subtaskId) {
      // Add user to subtask assignees
      const subtasks = task.subtasks || []
      const updatedSubtasks = subtasks.map((subtask) => {
        if (subtask.id === invitation.subtaskId) {
          return {
            ...subtask,
            assigneeIds: [...new Set([...subtask.assigneeIds, invitation.inviteeId])],
          }
        }
        return subtask
      })

      await updateTask(invitation.taskId, { subtasks: updatedSubtasks })

      // Find the subtask
      const subtask = subtasks.find((st) => st.id === invitation.subtaskId)

      // Create notification for inviter
      await createNotification({
        userId: invitation.inviterId,
        type: "task_invitation",
        title: "Invitation Accepted",
        message: `${invitee.name} has accepted your invitation to join the subtask "${subtask?.title || "Unknown"}"`,
        actionUrl: `/task/${invitation.taskId}`,
        relatedId: invitation.taskId,
        metadata: {
          taskId: invitation.taskId,
          subtaskId: invitation.subtaskId,
          inviteeId: invitation.inviteeId,
        },
      })
    } else {
      // Add user to task assignees
      const assigneeIds = task.assigneeIds || []
      await updateTask(invitation.taskId, {
        assigneeIds: [...new Set([...assigneeIds, invitation.inviteeId])],
      })

      // Create notification for inviter
      await createNotification({
        userId: invitation.inviterId,
        type: "task_invitation",
        title: "Invitation Accepted",
        message: `${invitee.name} has accepted your invitation to join the task "${task.title}"`,
        actionUrl: `/task/${invitation.taskId}`,
        relatedId: invitation.taskId,
        metadata: {
          taskId: invitation.taskId,
          inviteeId: invitation.inviteeId,
        },
      })
    }
  } catch (error) {
    console.error("Error accepting task invitation:", error)
    throw error
  }
}

// Decline task invitation
export async function declineTaskInvitation(invitationId: string): Promise<void> {
  try {
    const invitationRef = doc(db, "taskInvitations", invitationId)
    const invitationDoc = await getDoc(invitationRef)

    if (!invitationDoc.exists()) {
      throw new Error("Invitation not found")
    }

    const invitation = invitationDoc.data()

    await updateDoc(invitationRef, {
      status: "declined",
      respondedAt: serverTimestamp(),
    })

    // Get task and user details
    const taskRef = doc(db, "tasks", invitation.taskId)
    const taskDoc = await getDoc(taskRef)

    if (!taskDoc.exists()) {
      throw new Error("Task not found")
    }

    const task = taskDoc.data()
    const invitee = await getUser(invitation.inviteeId)

    // Create notification for inviter
    await createNotification({
      userId: invitation.inviterId,
      type: "task_invitation",
      title: "Invitation Declined",
      message: `${invitee.name} has declined your invitation to join the task "${task.title}"`,
      actionUrl: `/task/${invitation.taskId}`,
      relatedId: invitation.taskId,
      metadata: {
        taskId: invitation.taskId,
        subtaskId: invitation.subtaskId,
        inviteeId: invitation.inviteeId,
      },
    })
  } catch (error) {
    console.error("Error declining task invitation:", error)
    throw error
  }
}
