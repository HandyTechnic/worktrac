"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase/config"
import type { StaffMember } from "@/lib/types"
import { useRouter, usePathname } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

type AuthContextType = {
  user: StaffMember | null
  loading: boolean
  setUser: (user: StaffMember | null) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  signOut: async () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<StaffMember | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

  const DEFAULT_ADMIN_EMAIL = "haail.haleem@iasl.aero"

  useEffect(() => {
    console.log("Setting up auth state listener")
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser ? "User logged in" : "No user")

      if (firebaseUser) {
        try {
          // Check if we're on the registration page - if so, don't redirect
          const isOnRegisterPage = pathname === "/register"

          if (isOnRegisterPage) {
            console.log("On register page, not enforcing verification")
            setLoading(false)
            return
          }

          // Check email verification unless it's the default admin
          if (!firebaseUser.emailVerified && firebaseUser.email !== DEFAULT_ADMIN_EMAIL) {
            console.log("Email not verified")

            // Don't sign out, just show a message if on login page
            if (pathname === "/login") {
              toast({
                title: "Email Not Verified",
                description: "Please verify your email before logging in.",
                variant: "destructive",
              })
            } else {
              // If not on login page, redirect to login
              router.push("/login")
            }

            setLoading(false)
            return
          }

          // Get the user data from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
          console.log("User data from Firestore:", userDoc.exists() ? "Found" : "Not found")

          if (userDoc.exists()) {
            const userData = userDoc.data()

            // Set user data
            const userWithId = {
              ...userData,
              id: firebaseUser.uid,
              emailVerified: firebaseUser.emailVerified,
            } as StaffMember

            setUser(userWithId)

            // Check if user needs to complete onboarding
            if (!userData.hasCompletedOnboarding && pathname !== "/onboarding") {
              console.log("User needs to complete onboarding, redirecting")
              router.push("/onboarding")
              setLoading(false)
              return
            }

            // If user has completed onboarding but is on the onboarding page, redirect to home
            if (userData.hasCompletedOnboarding && pathname === "/onboarding") {
              console.log("User already completed onboarding, redirecting to home")
              router.push("/")
            }
          } else {
            // If no user data in Firestore, show message
            console.log("No user data found in Firestore")

            // Only create document for default admin
            if (firebaseUser.email === DEFAULT_ADMIN_EMAIL) {
              // This will be handled by the signIn function
              console.log("Default admin, will create document on sign in")
            } else {
              // For non-admin users, show error
              if (pathname === "/login") {
                toast({
                  title: "Account Not Found",
                  description: "Your account was not found. Please register first.",
                  variant: "destructive",
                })
              } else {
                // If not on login page, redirect to login
                router.push("/login")
              }
            }
          }
        } catch (error) {
          console.error("Error getting user data:", error)

          if (pathname === "/login") {
            toast({
              title: "Error",
              description: "An error occurred while getting your account data.",
              variant: "destructive",
            })
          } else if (pathname !== "/register") {
            // If not on login or register page, redirect to login
            router.push("/login")
          }
        }
      } else {
        console.log("No user")
        setUser(null)

        // Only redirect to login if not already on an auth page
        const authPages = ["/login", "/register", "/reset-password"]
        if (!authPages.includes(pathname)) {
          router.push("/login")
        }
      }
      setLoading(false)
    })

    return () => {
      console.log("Cleaning up auth state listener")
      unsubscribe()
    }
  }, [router, pathname, toast])

  const signOut = async () => {
    try {
      console.log("Signing out user")
      await auth.signOut()
      setUser(null)
      // The onAuthStateChanged listener will handle the redirect
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
    }
  }

  return <AuthContext.Provider value={{ user, loading, setUser, signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
