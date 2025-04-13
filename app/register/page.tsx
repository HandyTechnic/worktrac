"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Mail } from "lucide-react"

// Default admin email
const DEFAULT_ADMIN_EMAIL = "haail.haleem@iasl.aero"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState("")
  const [resendLoading, setResendLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/")
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate form
      if (password !== confirmPassword) {
        toast({
          title: "Passwords don't match",
          description: "Please make sure your passwords match.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      if (password.length < 6) {
        toast({
          title: "Password too short",
          description: "Password must be at least 6 characters long.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      console.log("Starting registration process...")

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      console.log("Firebase Auth user created:", userCredential.user.uid)

      // Determine if this is the default admin
      const isDefaultAdmin = email === DEFAULT_ADMIN_EMAIL

      // Create user document in Firestore
      try {
        const userRef = doc(db, "users", userCredential.user.uid)
        await setDoc(userRef, {
          email,
          name,
          role,
          userRole: isDefaultAdmin ? "admin" : "user",
          status: "active", // All users are active by default
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        console.log("User document created successfully")
      } catch (docError) {
        console.error("Error creating user document:", docError)
        toast({
          title: "Error",
          description: "Failed to create user profile. Please try again.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Send verification email with default Firebase settings
      try {
        await sendEmailVerification(userCredential.user)
        console.log("Verification email sent to:", email)

        // Set registered state
        setRegisteredEmail(email)
        setRegistered(true)
        toast({
          title: "Registration Successful",
          description: "Please check your email to verify your account.",
        })
      } catch (verificationError) {
        console.error("Error sending verification email:", verificationError)
        toast({
          title: "Warning",
          description: "Account created but verification email could not be sent. Please try again in a few minutes.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Registration error:", error)
      let errorMessage = "Failed to create account."

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email already in use. Please use a different email or try logging in."
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password."
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address. Please check and try again."
      }

      toast({
        title: "Registration Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!registeredEmail) return

    setResendLoading(true)

    try {
      // Get current user
      const currentUser = auth.currentUser

      if (!currentUser) {
        toast({
          title: "Error",
          description: "Unable to resend verification email. Please try again later.",
          variant: "destructive",
        })
        return
      }

      // Send verification email with default Firebase settings
      await sendEmailVerification(currentUser)

      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox for the verification link.",
      })
    } catch (error: any) {
      console.error("Error resending verification:", error)

      let errorMessage = "Failed to send verification email. Please try again later."
      if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many attempts. Please wait a few minutes before trying again."
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setResendLoading(false)
    }
  }

  if (authLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">WorkTrac</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>

        {registered ? (
          <CardContent className="space-y-6">
            <div className="bg-primary/10 rounded-lg p-6 text-center">
              <div className="bg-primary text-primary-foreground p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
                <Mail className="h-8 w-8" />
              </div>

              <h3 className="text-xl font-medium mb-2">Verify Your Email</h3>
              <p className="text-muted-foreground mb-4">We've sent a verification email to:</p>
              <p className="font-medium text-lg mb-4">{registeredEmail}</p>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Click the link in the email to verify your account.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  After verification, you'll be able to log in and create your workspace.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Button variant="outline" onClick={handleResendVerification} disabled={resendLoading} className="w-full">
                {resendLoading ? "Sending..." : "Resend Verification Email"}
              </Button>

              <Button variant="link" onClick={() => router.push("/login")} className="w-full">
                Return to Login
              </Button>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Job Title</Label>
                <Input
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Project Manager, Developer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Password must be at least 6 characters long</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Alert variant="default" className="bg-muted border-muted-foreground/20">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  After registration, you'll need to verify your email before you can log in.
                </AlertDescription>
              </Alert>
            </CardContent>

            <CardFooter className="flex flex-col space-y-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </Button>

              <div className="text-center text-sm">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}
