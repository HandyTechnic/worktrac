import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { Workspace, WorkspaceInvitation, WorkspaceRole } from "@/lib/types"
import { createNotification } from "@/lib/firebase/notifications"

// Create a new workspace
export async function createWorkspace(
  name: string,
  ownerId: string,
  description = "",
  settings: any = {},
): Promise<string> {
  try {
    console.log("Creating workspace with:", { name, ownerId, description })

    // Create workspace document
    const workspaceRef = doc(collection(db, "workspaces"))
    const workspaceId = workspaceRef.id

    await setDoc(workspaceRef, {
      id: workspaceId, // Include ID in the document
      name,
      description,
      ownerId,
      settings,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    console.log("Workspace document created with ID:", workspaceId)

    // Add owner as a member with owner role
    await addWorkspaceMember(workspaceId, ownerId, "owner")
    console.log("Owner added as workspace member")

    return workspaceId
  } catch (error) {
    console.error("Error creating workspace:", error)
    throw error
  }
}

// Add a member to a workspace
export async function addWorkspaceMember(workspaceId: string, userId: string, role: WorkspaceRole): Promise<string> {
  try {
    console.log(`Adding member to workspace: ${workspaceId}, userId: ${userId}, role: ${role}`)

    // Check if member already exists
    const existingMemberQuery = query(
      collection(db, "workspaceMembers"),
      where("workspaceId", "==", workspaceId),
      where("userId", "==", userId),
    )

    const existingMembers = await getDocs(existingMemberQuery)

    if (!existingMembers.empty) {
      console.log("Member already exists in workspace")
      return existingMembers.docs[0].id
    }

    const memberRef = doc(collection(db, "workspaceMembers"))
    const memberId = memberRef.id

    await setDoc(memberRef, {
      id: memberId,
      workspaceId,
      userId,
      role,
      joinedAt: serverTimestamp(),
    })

    console.log(`Member added with ID: ${memberId}`)
    return memberId
  } catch (error) {
    console.error("Error adding workspace member:", error)
    throw error
  }
}

// Get a workspace by ID
export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
  try {
    console.log(`Getting workspace: ${workspaceId}`)
    const workspaceRef = doc(db, "workspaces", workspaceId)
    const workspaceDoc = await getDoc(workspaceRef)

    if (!workspaceDoc.exists()) {
      console.log(`Workspace ${workspaceId} not found`)
      return null
    }

    const data = workspaceDoc.data()
    return {
      id: workspaceDoc.id,
      name: data.name,
      description: data.description || "",
      ownerId: data.ownerId,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      settings: data.settings || {},
    }
  } catch (error) {
    console.error("Error getting workspace:", error)
    throw error
  }
}

// Get all workspaces for a user
export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
  try {
    console.log("Getting workspaces for user:", userId)

    // First get all workspace memberships for the user
    const membershipQuery = query(collection(db, "workspaceMembers"), where("userId", "==", userId))
    const membershipDocs = await getDocs(membershipQuery)

    console.log("Found memberships:", membershipDocs.size)

    // Extract workspace IDs
    const workspaceIds = membershipDocs.docs.map((doc) => doc.data().workspaceId)

    if (workspaceIds.length === 0) {
      console.log("No workspace memberships found for user")
      return []
    }

    // Get all workspaces
    const workspaces: Workspace[] = []

    // We need to fetch each workspace individually since Firestore doesn't support
    // array contains queries with arrays from other documents
    for (const workspaceId of workspaceIds) {
      const workspace = await getWorkspace(workspaceId)
      if (workspace) {
        // Double-check that the user is actually a member of this workspace
        const isMember = await isWorkspaceMember(userId, workspaceId)
        if (isMember) {
          workspaces.push(workspace)
        } else {
          console.log(`User ${userId} is not a member of workspace ${workspaceId} despite having a membership record`)
        }
      } else {
        console.log(`Workspace ${workspaceId} not found despite user having a membership record`)
      }
    }

    console.log("Returning workspaces:", workspaces.length)
    return workspaces
  } catch (error) {
    console.error("Error getting user workspaces:", error)
    throw error
  }
}

// Get workspace members
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

// Update workspace
export async function updateWorkspace(workspaceId: string, data: Partial<Workspace>): Promise<void> {
  try {
    const workspaceRef = doc(db, "workspaces", workspaceId)

    // Remove id from data as it's not stored in the document
    const { id, ...updateData } = data

    await updateDoc(workspaceRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating workspace:", error)
    throw error
  }
}

// Update workspace member role
export async function updateWorkspaceMemberRole(memberId: string, newRole: WorkspaceRole): Promise<void> {
  try {
    const memberRef = doc(db, "workspaceMembers", memberId)
    await updateDoc(memberRef, {
      role: newRole,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating member role:", error)
    throw error
  }
}

// Remove workspace member
export async function removeWorkspaceMember(memberId: string): Promise<void> {
  try {
    const memberRef = doc(db, "workspaceMembers", memberId)
    await deleteDoc(memberRef)
  } catch (error) {
    console.error("Error removing workspace member:", error)
    throw error
  }
}

// Create workspace invitation
export async function createWorkspaceInvitation(
  email: string,
  workspaceId: string,
  role: WorkspaceRole,
  invitedBy: string,
): Promise<string> {
  try {
    // Check if invitation already exists
    const existingQuery = query(
      collection(db, "workspaceInvitations"),
      where("email", "==", email),
      where("workspaceId", "==", workspaceId),
      where("status", "==", "pending"),
    )
    const existingDocs = await getDocs(existingQuery)

    if (!existingDocs.empty) {
      // Return existing invitation ID
      return existingDocs.docs[0].id
    }

    // Create new invitation
    const invitationRef = doc(collection(db, "workspaceInvitations"))
    const invitationId = invitationRef.id

    // Set expiration to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await setDoc(invitationRef, {
      id: invitationId,
      email,
      workspaceId,
      role,
      invitedBy,
      status: "pending",
      createdAt: serverTimestamp(),
      expiresAt,
    })

    return invitationId
  } catch (error) {
    console.error("Error creating workspace invitation:", error)
    throw error
  }
}

// Get pending invitations for a workspace
export async function getWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
  try {
    const invitationsQuery = query(
      collection(db, "workspaceInvitations"),
      where("workspaceId", "==", workspaceId),
      where("status", "==", "pending"),
    )
    const invitationDocs = await getDocs(invitationsQuery)

    return invitationDocs.docs.map((doc) => ({
      id: doc.id,
      email: doc.data().email,
      workspaceId: doc.data().workspaceId,
      role: doc.data().role,
      invitedBy: doc.data().invitedBy,
      status: doc.data().status,
      createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : new Date(),
      expiresAt: doc.data().expiresAt instanceof Timestamp ? doc.data().expiresAt.toDate() : new Date(),
    }))
  } catch (error) {
    console.error("Error getting workspace invitations:", error)
    throw error
  }
}

// Get invitations for a user by email
export async function getUserInvitations(email: string): Promise<WorkspaceInvitation[]> {
  try {
    console.log(`Getting invitations for email: ${email}`)
    const invitationsQuery = query(
      collection(db, "workspaceInvitations"),
      where("email", "==", email),
      where("status", "==", "pending"),
    )
    const invitationDocs = await getDocs(invitationsQuery)

    console.log(`Found ${invitationDocs.size} invitations`)

    return invitationDocs.docs.map((doc) => ({
      id: doc.id,
      email: doc.data().email,
      workspaceId: doc.data().workspaceId,
      role: doc.data().role,
      invitedBy: doc.data().invitedBy,
      status: doc.data().status,
      createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : new Date(),
      expiresAt: doc.data().expiresAt instanceof Timestamp ? doc.data().expiresAt.toDate() : new Date(),
    }))
  } catch (error) {
    console.error("Error getting user invitations:", error)
    throw error
  }
}

// Accept workspace invitation
export async function acceptWorkspaceInvitation(invitationId: string, userId: string): Promise<string> {
  try {
    console.log(`Accepting invitation ${invitationId} for user ${userId}`)

    const invitationRef = doc(db, "workspaceInvitations", invitationId)
    const invitationDoc = await getDoc(invitationRef)

    if (!invitationDoc.exists()) {
      console.error("Invitation not found")
      throw new Error("Invitation not found")
    }

    const invitation = invitationDoc.data()

    if (invitation.status !== "pending") {
      console.error("Invitation is no longer pending")
      throw new Error("Invitation is no longer pending")
    }

    // Get workspace details
    const workspaceRef = doc(db, "workspaces", invitation.workspaceId)
    const workspaceDoc = await getDoc(workspaceRef)

    if (!workspaceDoc.exists()) {
      console.error("Workspace not found")
      throw new Error("Workspace not found")
    }

    const workspace = workspaceDoc.data()
    console.log(`Found workspace: ${workspace.name}`)

    // Update invitation status
    await updateDoc(invitationRef, {
      status: "accepted",
      acceptedAt: serverTimestamp(),
    })
    console.log("Updated invitation status to accepted")

    // Add user to workspace
    const memberId = await addWorkspaceMember(invitation.workspaceId, userId, invitation.role)
    console.log(`Added user to workspace with member ID: ${memberId}`)

    return memberId
  } catch (error) {
    console.error("Error accepting workspace invitation:", error)
    throw error
  }
}

// Decline workspace invitation
export async function declineWorkspaceInvitation(invitationId: string): Promise<void> {
  try {
    const invitationRef = doc(db, "workspaceInvitations", invitationId)
    await updateDoc(invitationRef, {
      status: "declined",
      respondedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error declining workspace invitation:", error)
    throw error
  }
}

// Subscribe to user workspaces
export function subscribeToUserWorkspaces(userId: string, callback: (workspaces: Workspace[]) => void) {
  console.log("Setting up workspace subscription for user:", userId)

  const membershipsQuery = query(collection(db, "workspaceMembers"), where("userId", "==", userId))

  return onSnapshot(
    membershipsQuery,
    async (snapshot) => {
      try {
        console.log("Workspace membership snapshot received, docs:", snapshot.docs.length)

        const workspaceIds = snapshot.docs.map((doc) => doc.data().workspaceId)

        if (workspaceIds.length === 0) {
          console.log("No workspace memberships found")
          callback([])
          return
        }

        const workspaces: Workspace[] = []

        for (const workspaceId of workspaceIds) {
          try {
            const workspace = await getWorkspace(workspaceId)
            if (workspace) {
              workspaces.push(workspace)
            } else {
              console.log(`Workspace ${workspaceId} not found despite user having a membership record`)
            }
          } catch (workspaceError) {
            console.error(`Error fetching workspace ${workspaceId}:`, workspaceError)
          }
        }

        console.log("Returning workspaces from subscription:", workspaces.length)
        callback(workspaces)
      } catch (error) {
        console.error("Error in workspace subscription:", error)
        callback([])
      }
    },
    (error) => {
      console.error("Workspace subscription error:", error)
      callback([])
    },
  )
}

// Get user's role in a workspace
export async function getUserWorkspaceRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
  try {
    const memberQuery = query(
      collection(db, "workspaceMembers"),
      where("userId", "==", userId),
      where("workspaceId", "==", workspaceId),
    )

    const memberDocs = await getDocs(memberQuery)

    if (memberDocs.empty) {
      return null
    }

    return memberDocs.docs[0].data().role as WorkspaceRole
  } catch (error) {
    console.error("Error getting user workspace role:", error)
    throw error
  }
}

// Check if user is a member of a workspace
export async function isWorkspaceMember(userId: string, workspaceId: string): Promise<boolean> {
  try {
    const role = await getUserWorkspaceRole(userId, workspaceId)
    return role !== null
  } catch (error) {
    console.error("Error checking workspace membership:", error)
    throw error
  }
}

// Update the inviteToWorkspace function to create notifications

export async function inviteToWorkspace(
  workspaceId: string,
  email: string,
  role: WorkspaceRole,
  invitedBy: string,
): Promise<string> {
  try {
    // Get workspace details first
    const workspaceRef = doc(db, "workspaces", workspaceId)
    const workspaceDoc = await getDoc(workspaceRef)

    if (!workspaceDoc.exists()) {
      throw new Error("Workspace not found")
    }

    const workspace = workspaceDoc.data()

    // Check if user with email exists
    const userQuery = query(collection(db, "users"), where("email", "==", email))
    const userSnapshot = await getDocs(userQuery)

    let userId = null

    if (!userSnapshot.empty) {
      userId = userSnapshot.docs[0].id

      // Check if user is already a member
      const memberQuery = query(
        collection(db, "workspaceMembers"),
        where("workspaceId", "==", workspaceId),
        where("userId", "==", userId),
      )

      const memberSnapshot = await getDocs(memberQuery)

      if (!memberSnapshot.empty) {
        throw new Error("User is already a member of this workspace")
      }
    }

    // Create invitation
    const invitationRef = doc(collection(db, "workspaceInvitations"))
    const invitationId = invitationRef.id

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

    await setDoc(invitationRef, {
      id: invitationId,
      email,
      workspaceId,
      workspaceName: workspace.name,
      role,
      invitedBy,
      status: "pending",
      createdAt: serverTimestamp(),
      expiresAt,
    })

    // Get inviter details
    const inviterRef = doc(db, "users", invitedBy)
    const inviterDoc = await getDoc(inviterRef)

    if (!inviterDoc.exists()) {
      throw new Error("Inviter not found")
    }

    const inviter = inviterDoc.data()

    // If user exists, create a notification
    if (userId) {
      await createNotification({
        userId,
        type: "workspace_invitation",
        title: "Workspace Invitation",
        message: `${inviter.name} has invited you to join the workspace "${workspace.name}" as a ${role}.`,
        actionUrl: "/workspaces",
        relatedId: invitationId,
        metadata: {
          workspaceId,
          workspaceName: workspace.name,
          inviterId: invitedBy,
          inviterName: inviter.name,
          role,
        },
      })
    }

    return invitationId
  } catch (error) {
    console.error("Error inviting to workspace:", error)
    throw error
  }
}
