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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, ChevronRight, ChevronLeft } from "lucide-react"
import WorkspaceCreation from "@/components/workspace-creation"

const steps = [
  { id: "welcome", title: "Welcome" },
  { id: "profile", title: "Your Profile" },
  { id: "preferences", title: "Preferences" },
  { id: "workspace", title: "Workspace" },
  { id: "complete", title: "Complete" },
]

export default function OnboardingPage() {
  const { user, loading, setUser } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [currentStep, setCurrentStep] = useState(0)
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [department, setDepartment] = useState("")
  const [bio, setBio] = useState("")
  const [notificationPreference, setNotificationPreference] = useState("email")
  const [showCompletedTasks, setShowCompletedTasks] = useState(true)
  const [defaultView, setDefaultView] = useState("gantt")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      // Check if user has already completed onboarding
      if (user.hasCompletedOnboarding) {
        router.push("/")
        return
      }

      // Pre-fill form with existing user data
      setName(user.name || "")
      setRole(user.role || "")
      setDepartment(user.department || "")
      setBio(user.bio || "")
    }
  }, [user, loading, router])

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!user) return

    setIsSubmitting(true)

    try {
      const userData = {
        name,
        role,
        department,
        bio,
        preferences: {
          notifications: notificationPreference,
          showCompletedTasks,
          defaultView,
        },
        hasCompletedOnboarding: true,
        updatedAt: new Date().toISOString(),
      }

      await updateUserProfile(user.id, userData)

      // Update local user state
      setUser({ ...user, ...userData })

      setHasCompletedOnboarding(true)
      nextStep()

      toast({
        title: "Profile Updated",
        description: "Your profile has been set up successfully.",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Update Failed",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const goToDashboard = () => {
    // Force a full page reload to ensure all contexts are properly initialized
    window.location.href = "/"
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
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="border-b bg-background py-4">
        <div className="container flex items-center justify-between">
          <h1 className="text-2xl font-bold">WorkTrac</h1>
          <div className="text-sm text-muted-foreground">Welcome, {user.name || user.email}</div>
        </div>
      </header>

      <main className="flex-1 container py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Get Started with WorkTrac</h2>
            <Progress value={(currentStep / (steps.length - 1)) * 100} className="h-2" />

            <div className="flex justify-between mt-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`text-xs ${index <= currentStep ? "text-primary font-medium" : "text-muted-foreground"}`}
                >
                  {step.title}
                </div>
              ))}
            </div>
          </div>

          <Card>
            {currentStep === 0 && (
              <>
                <CardHeader>
                  <CardTitle>Welcome to WorkTrac!</CardTitle>
                  <CardDescription>Let's set up your account to get the most out of WorkTrac.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-medium mb-2">What is WorkTrac?</h3>
                    <p className="text-sm text-muted-foreground">
                      WorkTrac is a collaborative work management application that helps teams track tasks, manage
                      workloads, and visualize project timelines with an interactive Gantt chart.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium">In this setup, you'll:</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>Complete your profile information</li>
                      <li>Set your preferences for notifications and views</li>
                      <li>Create your first workspace</li>
                      <li>Get ready to collaborate with your team</li>
                    </ul>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={nextStep}>
                    Get Started <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </>
            )}

            {currentStep === 1 && (
              <>
                <CardHeader>
                  <CardTitle>Your Profile</CardTitle>
                  <CardDescription>
                    Tell us a bit about yourself. This information will be visible to your team members.
                  </CardDescription>
                </CardHeader>
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
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={prevStep}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button onClick={nextStep}>
                    Continue <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </>
            )}

            {currentStep === 2 && (
              <>
                <CardHeader>
                  <CardTitle>Your Preferences</CardTitle>
                  <CardDescription>Customize how WorkTrac works for you.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notifications">Notification Preferences</Label>
                    <Select value={notificationPreference} onValueChange={setNotificationPreference}>
                      <SelectTrigger id="notifications">
                        <SelectValue placeholder="Select notification preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email Only</SelectItem>
                        <SelectItem value="in-app">In-App Only</SelectItem>
                        <SelectItem value="both">Email & In-App</SelectItem>
                        <SelectItem value="none">No Notifications</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultView">Default View</Label>
                    <Select value={defaultView} onValueChange={setDefaultView}>
                      <SelectTrigger id="defaultView">
                        <SelectValue placeholder="Select default view" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gantt">Gantt Chart</SelectItem>
                        <SelectItem value="dashboard">Dashboard</SelectItem>
                        <SelectItem value="historical">Historical Tasks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="showCompleted"
                      checked={showCompletedTasks}
                      onCheckedChange={(checked) => setShowCompletedTasks(checked === true)}
                    />
                    <Label htmlFor="showCompleted">Show completed tasks in Gantt view</Label>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={prevStep}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Preferences"}
                  </Button>
                </CardFooter>
              </>
            )}

            {currentStep === 3 && (
              <>
                <CardHeader>
                  <CardTitle>Create Your Workspace</CardTitle>
                  <CardDescription>
                    Create a workspace to start managing tasks and collaborating with your team.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WorkspaceCreation />
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={prevStep}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                </CardFooter>
              </>
            )}

            {currentStep === 4 && (
              <>
                <CardHeader>
                  <CardTitle>Setup Complete!</CardTitle>
                  <CardDescription>You're all set to start using WorkTrac.</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-8">
                  <div className="bg-success/10 text-success rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-4">
                    <CheckCircle className="h-10 w-10" />
                  </div>

                  <h3 className="text-xl font-medium mb-2">Welcome to WorkTrac</h3>
                  <p className="text-muted-foreground mb-6">
                    Your account is now set up and ready to use. You can now start managing tasks and collaborating with
                    your team.
                  </p>

                  <Button onClick={goToDashboard} size="lg">
                    Go to Dashboard
                  </Button>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}
