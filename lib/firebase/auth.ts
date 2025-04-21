import { sendPasswordResetEmail } from "firebase/auth"
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "./config"
import { auth } from "./config"

export async function getAllUsers() {
  try {
    const usersCollection = collection(db, "users")
    const usersSnapshot = await getDocs(usersCollection)

    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return users
  } catch (error) {
    console.error("Error getting all users:", error)
    throw error
  }
}

export async function getUser(userId: string) {
  try {
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      return {
        id: userDoc.id,
        ...userDoc.data(),
      }
    } else {
      return null
    }
  } catch (error) {
    console.error("Error getting user:", error)
    throw error
  }
}

export function subscribeToPendingUsers(callback: (users: any[]) => void) {
  const usersRef = collection(db, "users")
  const q = query(usersRef, where("status", "==", "pending"))

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    callback(users)
  })

  return unsubscribe
}

export async function updateUserProfile(userId: string, data: any) {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, data)
  } catch (error) {
    console.error("Error updating user profile:", error)
    throw error
  }
}

export async function sendPasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(auth, email)
    return { success: true }
  } catch (error: any) {
    let errorMessage = "Failed to send reset email."
    if (error.code === "auth/user-not-found") {
      errorMessage = "There is no user record corresponding to this email."
    }
    return { success: false, error: errorMessage }
  }
}

export async function approveUser(userId: string, role: string) {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      status: "approved",
      userRole: role,
    })
    return { success: true }
  } catch (error) {
    console.error("Error approving user:", error)
    return { success: false, error: "Failed to approve user." }
  }
}

export async function rejectUser(userId: string, reason: string) {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      status: "rejected",
      rejectionReason: reason,
    })
    return { success: true }
  } catch (error) {
    console.error("Error rejecting user:", error)
    return { success: false, error: "Failed to reject user." }
  }
}
