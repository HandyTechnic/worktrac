"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { useWorkspace } from "@/contexts/workspace-context"
import { updateWorkspace } from "@/lib/firebase/workspace"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, Loader2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"

export function WorkspaceProfile() {
  const { toast } = useToast()
  const { currentWorkspace, refreshWorkspaces } = useWorkspace()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [showCompletedTasks, setShowCompletedTasks] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load current workspace data
  useEffect(() => {
    if (currentWorkspace) {
      setName(currentWorkspace.name || "")
      setDescription(currentWorkspace.description || "")
      setShowCompletedTasks(currentWorkspace.settings?.showCompletedTasks !== false)
    }
  }, [currentWorkspace])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!currentWorkspace) return

    setIsSubmitting(true)

    try {
      // Update workspace data
      await updateWorkspace(currentWorkspace.id, {
        name,
        description,
        settings: {
          ...currentWorkspace.settings,
          showCompletedTasks,
        },
      })

      // Refresh workspace data
      await refreshWorkspaces()

      toast({
        title: "Workspace Updated",
        description: "Your workspace settings have been updated successfully.",
      })
    } catch (error) {
      console.error("Error updating workspace:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update workspace settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!currentWorkspace) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Workspace Profile</h2>
        <p className="text-sm text-muted-foreground">Manage your workspace details and settings</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
            <CardDescription>Update your workspace name and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter workspace name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter workspace description"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Display Settings</CardTitle>
            <CardDescription>Configure how tasks are displayed in the workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-completed">Show Completed Tasks</Label>
                <p className="text-sm text-muted-foreground">Display completed tasks in the Gantt chart view</p>
              </div>
              <Switch id="show-completed" checked={showCompletedTasks} onCheckedChange={setShowCompletedTasks} />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}

// Keep the default export for backward compatibility
export default WorkspaceProfile
