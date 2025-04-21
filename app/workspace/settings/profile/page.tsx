"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { updateWorkspace } from "@/lib/firebase/workspace"
import { Switch } from "@/components/ui/switch"

export default function WorkspaceProfilePage() {
  const { user, loading } = useAuth()
  const { currentWorkspace, refreshWorkspaces } = useWorkspace()
  const router = useRouter()
  const { toast } = useToast()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [showCompletedTasks, setShowCompletedTasks] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted) {
      return
    }

    // Set the correct tab value when on profile page
    const tabsList = document.querySelector('[role="tablist"]')
    if (tabsList) {
      const profileTab = tabsList.querySelector('[value="profile"]')
      if (profileTab) {
        ;(profileTab as HTMLElement).click()
      }
    }
  }, [hasMounted])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }

    if (currentWorkspace) {
      setName(currentWorkspace.name || "")
      setDescription(currentWorkspace.description || "")
      setShowCompletedTasks(currentWorkspace.settings?.showCompletedTasks !== false)
    }
  }, [currentWorkspace, loading, user, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!currentWorkspace) return

      await updateWorkspace(currentWorkspace.id, {
        name,
        description,
        settings: {
          ...currentWorkspace.settings,
          showCompletedTasks,
        },
      })

      // Refresh workspaces to get updated data
      await refreshWorkspaces()

      toast({
        title: "Workspace Updated",
        description: "Your workspace has been successfully updated.",
      })
    } catch (error) {
      console.error("Error updating workspace:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update workspace. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || !user || !currentWorkspace || !hasMounted) {
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
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Workspace Profile</h1>
        <p className="text-muted-foreground">Update your workspace information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Information</CardTitle>
          <CardDescription>Update your workspace details</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this workspace"
                className="min-h-[100px]"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showCompletedTasks">Show Completed Tasks</Label>
                <div className="text-sm text-muted-foreground">Display completed tasks in the Gantt chart view</div>
              </div>
              <Switch
                id="showCompletedTasks"
                checked={showCompletedTasks}
                onCheckedChange={(checked) => setShowCompletedTasks(checked)}
              />
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
