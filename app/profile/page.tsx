"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { updateUserProfile } from "@/lib/firebase/auth"
import { ArrowLeft } from "lucide-react"
import { formatName } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ProfilePage() {
  const { user, loading, setUser } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [name, setName] = useState("")
  const [fullName, setFullName] = useState("")
  const [preferredName, setPreferredName] = useState("")
  const [role, setRole] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nameOptions, setNameOptions] = useState<string[]>([])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }

    if (user) {
      // Set the name as the full name if it exists
      const currentName = user.name || ""
      setName(currentName)
      setFullName(currentName)
      setPreferredName(user.preferredName || "")
      setRole(user.role || "")

      // Generate name options from the full name
      if (currentName) {
        const nameParts = currentName.trim().split(/\s+/)
        setNameOptions(nameParts)
      }
    }
  }, [user, loading, router])

  const handleNameChange = (value: string) => {
    setName(value)
    setFullName(value)

    // Reset preferred name if it's not in the new full name
    if (value) {
      const nameParts = value.trim().split(/\s+/)
      setNameOptions(nameParts)

      // Check if current preferred name is still valid
      if (preferredName && !nameParts.includes(preferredName)) {
        setPreferredName("")
      }
    } else {
      setNameOptions([])
      setPreferredName("")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!user) return

      // Calculate formatted name
      const formattedName = formatName(fullName, preferredName)

      await updateUserProfile(user.id, {
        name: fullName,
        role,
        preferredName,
        fullName,
        formattedName,
      })

      // Update local user state
      setUser({
        ...user,
        name: fullName,
        role,
        preferredName,
        fullName,
        formattedName,
      })

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || !user) {
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
    <div className="container mx-auto p-4 max-w-[800px]">
      <Button variant="ghost" className="mb-6" onClick={() => router.push("/")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => handleNameChange(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredName">Preferred Name</Label>
              <Select value={preferredName} onValueChange={setPreferredName}>
                <SelectTrigger id="preferredName">
                  <SelectValue placeholder="Select preferred name" />
                </SelectTrigger>
                <SelectContent>
                  {nameOptions.map((namePart, index) => (
                    <SelectItem key={index} value={namePart}>
                      {namePart}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">This will be used for display in the people view</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="formattedName">Display Format</Label>
              <Input id="formattedName" value={formatName(fullName, preferredName)} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">This is how your name will appear in the people view</p>
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
              <Label htmlFor="userRole">System Role</Label>
              <Input
                id="userRole"
                value={user.userRole === "manager" ? "Manager" : "Team Member"}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">System role can only be changed by administrators</p>
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
