"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { updateWorkspace } from "@/lib/firebase/workspace"

export default function WorkspacePermissionsPage() {
  const { user, loading } = useAuth()
  const { currentWorkspace, refreshWorkspaces } = useWorkspace()
  const router = useRouter()
  const { toast } = useToast()

  const [allowMembersToCreateTasks, setAllowMembersToCreateTasks] = useState(false)
  const [allowMembersToInvite, setAllowMembersToInvite] = useState(false)
  const [requireApprovalForTasks, setRequireApprovalForTasks] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted) {
      return
    }

    // Set the correct tab value when on permissions page
    const tabsList = document.querySelector('[role="tablist"]')
    if (tabsList) {
      const permissionsTab = tabsList.querySelector('[value="permissions"]')
      if (permissionsTab) {
        ;(permissionsTab as HTMLElement).click()
      }
    }
  }, [hasMounted])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }

    if (currentWorkspace) {
      setAllowMembersToCreateTasks(currentWorkspace.settings?.permissions?.allowMembersToCreateTasks || false)
      setAllowMembersToInvite(currentWorkspace.settings?.permissions?.allowMembersToInvite || false)
      setRequireApprovalForTasks(currentWorkspace.settings?.requireApprovalForTasks || true)
    }
  }, [currentWorkspace, loading, user, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!currentWorkspace) return

      await updateWorkspace(currentWorkspace.id, {
        settings: {
          ...currentWorkspace.settings,
          allowMembersToCreateTasks: allowMembersToCreateTasks,
          allowMembersToInvite: allowMembersToInvite,
          requireApprovalForTasks: requireApprovalForTasks,
        },
      })

      // Refresh workspaces to get updated data
      await refreshWorkspaces()

      toast({
        title: "Permissions Updated",
        description: "Workspace permissions have been successfully updated.",
      })
    } catch (error) {
      console.error("Error updating permissions:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update workspace permissions. Please try again.",
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
        <h1 className="text-3xl font-bold">Workspace Permissions</h1>
        <p className="text-muted-foreground">Configure access controls for workspace members</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Member Permissions</CardTitle>
          <CardDescription>Control what actions different roles can perform</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow-create-tasks">Allow Members to Create Tasks</Label>
                <div className="text-sm text-muted-foreground">When enabled, regular members can create new tasks</div>
              </div>
              <Switch
                id="allow-create-tasks"
                checked={allowMembersToCreateTasks}
                onCheckedChange={setAllowMembersToCreateTasks}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow-invite">Allow Members to Invite Others</Label>
                <div className="text-sm text-muted-foreground">
                  When enabled, regular members can invite others to tasks
                </div>
              </div>
              <Switch id="allow-invite" checked={allowMembersToInvite} onCheckedChange={setAllowMembersToInvite} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="require-approval">Require Manager Approval for Tasks</Label>
                <div className="text-sm text-muted-foreground">
                  When enabled, completed tasks require manager approval
                </div>
              </div>
              <Switch
                id="require-approval"
                checked={requireApprovalForTasks}
                onCheckedChange={setRequireApprovalForTasks}
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
