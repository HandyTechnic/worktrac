// lib/firebase/workspace-member.ts
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "./config"

// Check if a user is a member of a workspace
export async function isWorkspaceMember(userId: string, workspaceId: string): Promise<boolean> {
  try {
    const memberQuery = query(
      collection(db, "workspaceMembers"),
      where("userId", "==", userId),
      where("workspaceId", "==", workspaceId),
    )

    const memberDocs = await getDocs(memberQuery)
    return !memberDocs.empty
  } catch (error) {
    console.error("Error checking workspace membership:", error)
    return false
  }
}
