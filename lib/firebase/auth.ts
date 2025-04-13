import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
  type User,
} from "firebase/auth"
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  limit,
} from "firebase/firestore"
import { auth, db } from "@/lib/firebase/config"

// Default admin email
const DEFAULT_ADMIN_EMAIL = "haail.haleem@iasl.aero"

// User status enum - simplified to remove approval concept
export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

// Helper function to create user document
async function createUserDocument(uid: string, email: string, userData: any, isDefaultAdmin = false) {
  try {
    const userRef = doc(db, "users", uid)
    await setDoc(userRef, {
      email,
      ...userData,
      userRole: isDefaultAdmin ? "admin" : "user",
      status: UserStatus.ACTIVE, // All users are active by default
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log("User document created successfully")
    return true
  } catch (error) {
    console.error("Error creating user document:", error)
    return false
  }
}

export async function signUp(email: string, password: string, userData: any) {
  try {
    console.log("Starting user registration process")

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    console.log("Firebase Auth user created:", userCredential.user.uid)

    // Determine if this is the default admin
    const isDefaultAdmin = email === DEFAULT_ADMIN_EMAIL

    // Create user document in Firestore
    const documentCreated = await createUserDocument(userCredential.user.uid, email, userData, isDefaultAdmin)

    if (!documentCreated) {
      // If document creation fails, delete the auth user
      await userCredential.user.delete()
      throw new Error("Failed to create user document")
    }

    // Send verification email with custom redirect URL
    try {
      const verificationUrl = `${window.location.origin}/login?verified=true`
      await sendEmailVerification(userCredential.user, {
        url: verificationUrl,
        handleCodeInApp: true,
      })
      console.log("Verification email sent to:", email)
    } catch (verificationError) {
      console.error("Error sending verification email:", verificationError)
      // Don't throw here, we still want to return the user
    }

    return { user: userCredential.user, error: null }
  } catch (error: any) {
    console.error("Registration error:", error)
    let errorMessage = "Failed to create account."

    if (error.code === "auth/email-already-in-use") {
      errorMessage = "Email already in use. Please use a different email or try logging in."
    } else if (error.code === "auth/weak-password") {
      errorMessage = "Password is too weak. Please use a stronger password."
    } else if (error.code === "auth/unauthorized-continue-uri") {
      errorMessage = "Invalid verification redirect URL. Please contact support."
    }

    return { user: null, error: errorMessage }
  }
}

export async function signIn(email: string, password: string) {
  try {
    console.log("Attempting sign in for:", email)
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    console.log("Sign in successful:", userCredential.user.uid)

    // Check if email is verified
    if (!userCredential.user.emailVerified && email !== DEFAULT_ADMIN_EMAIL) {
      console.log("Email not verified, sending verification email")
      // Send a new verification email
      const verificationUrl = `${window.location.origin}/login?verified=true`
      await sendEmailVerification(userCredential.user, {
        url: verificationUrl,
        handleCodeInApp: true,
      })

      await firebaseSignOut(auth)
      return {
        user: null,
        error: "Please verify your email before logging in. A new verification link has been sent to your email.",
      }
    }

    // Get user document
    const userDoc = await getDoc(doc(db, "users", userCredential.user.uid))

    // If user document doesn't exist
    if (!userDoc.exists()) {
      console.log("No Firestore document found for user")
      // Only create document for default admin
      if (email === DEFAULT_ADMIN_EMAIL) {
        const documentCreated = await createUserDocument(
          userCredential.user.uid,
          email,
          {
            name: "Haail Haleem",
            role: "Administrator",
          },
          true,
        )

        if (!documentCreated) {
          await firebaseSignOut(auth)
          return { user: null, error: "Failed to create admin user document." }
        }

        return { user: userCredential.user, error: null }
      }

      await firebaseSignOut(auth)
      return { user: null, error: "User account not found. Please register first." }
    }

    const userData = userDoc.data()

    // Check if onboarding is completed
    if (!userData.hasCompletedOnboarding) {
      console.log("Onboarding not completed")
      // We'll let them in but the auth context will redirect them to onboarding
    }

    // Update last login timestamp
    await updateDoc(doc(db, "users", userCredential.user.uid), {
      lastLoginAt: serverTimestamp(),
    })

    console.log("All checks passed, allowing sign in")
    return { user: userCredential.user, error: null }
  } catch (error: any) {
    console.error("Sign in error:", error)
    let errorMessage = "Failed to sign in. Please check your credentials."

    if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
      errorMessage = "Invalid email or password. Please try again."
    } else if (error.code === "auth/too-many-requests") {
      errorMessage = "Too many failed login attempts. Please try again later."
    } else if (error.code === "auth/network-request-failed") {
      errorMessage = "Network error. Please check your internet connection."
    }

    return { user: null, error: errorMessage }
  }
}

export async function signOut() {
  try {
    console.log("Signing out user")
    await firebaseSignOut(auth)
    console.log("User signed out successfully")
    return { error: null }
  } catch (error: any) {
    console.error("Sign out error:", error.code, error.message)
    return { error: error.message }
  }
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  console.log("Setting up auth state change listener")
  return onAuthStateChanged(auth, callback)
}

export async function getCurrentUser() {
  const user = auth.currentUser
  if (!user) {
    console.log("No current user in auth")
    return null
  }

  console.log("Getting user document for:", user.uid)
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid))
    if (userDoc.exists()) {
      console.log("User document found in Firestore")
      const userData = userDoc.data()
      return {
        ...userData,
        id: user.uid,
        emailVerified: user.emailVerified,
      }
    } else {
      console.log("No user document found in Firestore")

      // Only create document for default admin
      if (user.email === DEFAULT_ADMIN_EMAIL) {
        const documentCreated = await createUserDocument(
          user.uid,
          user.email,
          {
            name: "Haail Haleem",
            role: "Administrator",
          },
          true,
        )

        if (documentCreated) {
          const newDoc = await getDoc(doc(db, "users", user.uid))
          return {
            ...newDoc.data(),
            id: user.uid,
            emailVerified: user.emailVerified,
          }
        }
      }

      return null
    }
  } catch (error) {
    console.error("Error getting user document:", error)
    return null
  }
}

export async function updateUserProfile(userId: string, userData: any) {
  try {
    console.log("Updating user profile for:", userId)
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp(),
    })
    console.log("User profile updated successfully")
    return { success: true, error: null }
  } catch (error) {
    console.error("Error updating user profile:", error)
    return { success: false, error: error.message }
  }
}

export async function sendPasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/login`,
      handleCodeInApp: true,
    })
    return { success: true, error: null }
  } catch (error: any) {
    console.error("Password reset error:", error)
    let errorMessage = "Failed to send password reset email."

    if (error.code === "auth/user-not-found") {
      errorMessage = "No account found with this email address."
    }

    return { success: false, error: errorMessage }
  }
}

export async function resendVerificationEmail(email?: string) {
  // If email is provided, try to sign in to send verification
  if (email) {
    try {
      // Create a temporary password for verification purposes
      const tempPassword = "temporary" + Math.random().toString(36).substring(2, 10)

      // Try to create a user with this email (will fail if user exists, which is what we want)
      try {
        await createUserWithEmailAndPassword(auth, email, tempPassword)
        // If we get here, the user didn't exist, so we should return an error
        await firebaseSignOut(auth)
        return { success: false, error: "No account exists with this email." }
      } catch (error: any) {
        // If error is "email-already-in-use", that's good - the user exists
        if (error.code !== "auth/email-already-in-use") {
          return { success: false, error: "Failed to verify email exists." }
        }
      }

      // Now we know the user exists, send a password reset email instead
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: true,
      })

      return {
        success: true,
        error: null,
        message: "A password reset email has been sent. Please use it to verify your account and set a new password.",
      }
    } catch (error) {
      console.error("Error sending verification email:", error)
      return { success: false, error: "Failed to send verification email. Please try again later." }
    }
  }

  // If no email provided, use the current user
  const user = auth.currentUser
  if (!user) {
    return { success: false, error: "No user is currently logged in." }
  }

  try {
    await sendEmailVerification(user, {
      url: `${window.location.origin}/login?verified=true`,
      handleCodeInApp: true,
    })
    return { success: true, error: null }
  } catch (error) {
    console.error("Error sending verification email:", error)
    return { success: false, error: "Failed to send verification email. Please try again later." }
  }
}

export async function verifyEmail(actionCode: string) {
  try {
    await applyActionCode(auth, actionCode)
    return { success: true, error: null }
  } catch (error) {
    console.error("Error verifying email:", error)
    return { success: false, error: "Invalid or expired verification link. Please request a new one." }
  }
}

export async function resetPassword(actionCode: string, newPassword: string) {
  try {
    // Verify the password reset code
    await verifyPasswordResetCode(auth, actionCode)

    // Confirm the password reset
    await confirmPasswordReset(auth, actionCode, newPassword)

    return { success: true, error: null }
  } catch (error) {
    console.error("Error resetting password:", error)
    return { success: false, error: "Invalid or expired reset link. Please request a new one." }
  }
}

export async function getAllUsers(limitCount = 50) {
  try {
    const usersRef = collection(db, "users")
    const q = query(usersRef, orderBy("createdAt", "desc"), limit(limitCount))

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting all users:", error)
    return []
  }
}

export function subscribeToAllUsers(callback: (users: any[]) => void, limitCount = 50) {
  const usersRef = collection(db, "users")
  const q = query(usersRef, orderBy("createdAt", "desc"), limit(limitCount))

  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : new Date(),
    }))
    callback(users)
  })
}

export function subscribeToPendingUsers(callback: (users: any[]) => void) {
  const usersRef = collection(db, "users")
  const q = query(usersRef, where("status", "==", "pending"), orderBy("createdAt", "desc"))

  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : new Date(),
    }))
    callback(users)
  })
}

export async function approveUser(userId: string, role: string) {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      status: "approved",
      userRole: role,
    })
    return { success: true, error: null }
  } catch (error) {
    console.error("Error approving user:", error)
    return { success: false, error: error.message }
  }
}

export async function rejectUser(userId: string, reason: string) {
  try {
    const userRef = doc(db, "users", userId)
    await updateDoc(userRef, {
      status: "rejected",
      rejectionReason: reason,
    })
    return { success: true, error: null }
  } catch (error) {
    console.error("Error rejecting user:", error)
    return { success: false, error: error.message }
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
    return null
  }
}
