"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Bell, Moon } from "lucide-react"
import { TelegramConnection } from "@/components/telegram-connection"
import { TelegramTestNotification } from "@/components/telegram-test-notification"
import { NotificationPreferencesForm } from "@/components/notification-preferences-form"

export default function ProfilePage() {
  const { user, loading, setUser } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const searchParams = useSearchParams()
  const tab = searchParams.get("tab") || "profile"

  const [name, setName] = useState("")
  const [fullName, setFullName] = useState("")
  const [preferredName, setPreferredName] = useState("")
  const [role, setRole] = useState("")
  const [department, setDepartment] = useState("")
  const [bio, setBio] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nameOptions, setNameOptions] = useState<string[]>([])
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted) {
      return
    }

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
      setDepartment(user.department || "")
      setBio(user.bio || "")

      // Generate name options from the full name
      if (currentName) {
        const nameParts = currentName.trim().split(/\s+/)
        setNameOptions(nameParts)
      }
    }
  }, [user, loading, router, hasMounted])

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
        department,
        bio,
      })

      // Update local user state
      setUser({
        ...user,
        name: fullName,
        role,
        preferredName,
        fullName,
        formattedName,
        department,
        bio,
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

  if (loading || !user || !hasMounted) {
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

      <div className="flex items-center mb-6">
        <User className="h-6 w-6 text-primary mr-2" />
        <h1 className="text-2xl font-bold">User Settings</h1>
      </div>

      <Tabs defaultValue={tab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
          <TabsTrigger value="profile" onClick={() => router.push("/profile")}>
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" onClick={() => router.push("/profile?tab=notifications")}>
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" onClick={() => router.push("/profile?tab=appearance")}>
            <Moon className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
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
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Engineering, Marketing"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us a bit about yourself"
                    rows={3}
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
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notification Preferences Form */}
              <NotificationPreferencesForm />

              {/* Telegram Connection */}
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Telegram Notifications</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your Telegram account to receive notifications via Telegram
                </p>
                <TelegramConnection />
              </div>

              {/* Test Notification */}
              <div className="mt-6">
                <TelegramTestNotification />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize how the application looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Dark Mode</h3>
                    <p className="text-sm text-muted-foreground">Use dark theme</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Coming Soon
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
