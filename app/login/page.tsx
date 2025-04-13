"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { signInWithEmailAndPassword, sendEmailVerification, applyActionCode } from "firebase/auth"
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase/config"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle } from "lucide-react"

// Default admin email
const DEFAULT_ADMIN_EMAIL = "haail.haleem@iasl.aero"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()

  // Check for verification parameters
  useEffect(() => {
    const oobCode = searchParams.get("oobCode")
    const mode = searchParams.get("mode")
    const isVerified = searchParams.get("verified") === "true"

    if (isVerified) {
      setVerified(true)
      toast({
        title: "Email Verified",
        description: "Your email has been verified. You can now log in.",
      })
    }

    if (oobCode && mode === "verifyEmail") {
      setVerifying(true)

      applyActionCode(auth, oobCode)
        .then(() => {
          setVerified(true)

          toast({
            title: "Email Verified",
            description: "Your email has been verified. You can now log in.",
          })
          setVerifying(false)

          // Update the URL to remove the oobCode
          const url = new URL(window.location.href)
          url.searchParams.delete("oobCode")
          url.searchParams.delete("mode")
          url.searchParams.set("verified", "true")
          window.history.replaceState({}, "", url.toString())
        })
        .catch((error) => {
          console.error("Verification error:", error)
          toast({
            title: "Verification Failed",
            description: "Failed to verify email. Please try again or request a new verification link.",
            variant: "destructive",
          })
          setVerifying(false)
        })
    }
  }, [searchParams, toast])

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
      console.log("Attempting to sign in with:", email)
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

        toast({
          title: "Email Not Verified",
          description:
            "Please verify your email before logging in. A new verification link has been sent to your email.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Get user document
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid))

      // If user document doesn't exist
      if (!userDoc.exists()) {
        console.log("No Firestore document found for user")
        // Only create document for default admin
        if (email === DEFAULT_ADMIN_EMAIL) {
          try {
            const userRef = doc(db, "users", userCredential.user.uid)
            await setDoc(userRef, {
              email,
              name: "Haail Haleem",
              role: "Administrator",
              userRole: "admin",
              status: "active",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
            console.log("Admin user document created successfully")
          } catch (error) {
            console.error("Error creating admin document:", error)
            toast({
              title: "Error",
              description: "Failed to create admin user document.",
              variant: "destructive",
            })
            setLoading(false)
            return
          }
        } else {
          toast({
            title: "Account Not Found",
            description: "Your account was not found. Please register first.",
            variant: "destructive",
          })
          setLoading(false)
          return
        }
      } else {
        // Update last login timestamp
        try {
          await updateDoc(doc(db, "users", userCredential.user.uid), {
            lastLoginAt: serverTimestamp(),
          })
        } catch (error) {
          console.error("Error updating last login:", error)
          // Non-critical error, continue
        }
      }

      console.log("All checks passed, redirecting to home")
      router.push("/")
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

      toast({
        title: "Login Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">WorkTrac</CardTitle>
            <CardDescription>Verifying your email</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Please wait while we verify your email address...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">WorkTrac</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>

        {verified && (
          <CardContent className="pt-0 pb-4">
            <Alert className="bg-success/10 text-success border-success/20">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Email Verified</AlertTitle>
              <AlertDescription>Your email has been verified successfully. You can now log in.</AlertDescription>
            </Alert>
          </CardContent>
        )}

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/reset-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center text-sm">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Register
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
