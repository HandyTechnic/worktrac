"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useWorkspace } from "@/contexts/workspace-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Shield, Save, Loader2 } from "lucide-react"
import { updateWorkspace } from "@/lib/firebase/workspace"

export function WorkspacePermissions() {
  const { toast } = useToast()
  const { currentWorkspace, refreshWorkspaces } = useWorkspace()

  const [allowMembersToCreateTasks, setAllowMembersToCreateTasks] = useState(
    currentWorkspace?.settings?.permissions?.allowMembersToCreateTasks || false,
  )
  const [allowMembersToInvite, setAllowMembersToInvite] = useState(
    currentWorkspace?.settings?.permissions?.allowMembersToInvite || false,
  )
  const [requireApprovalForTasks, setRequireApprovalForTasks] = useState(
    currentWorkspace?.settings?.permissions?.requireApprovalForTasks || true,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!currentWorkspace) return

    setIsSubmitting(true)

    try {
      // Update workspace permissions
      await updateWorkspace(currentWorkspace.id, {
        settings: {
          ...currentWorkspace.settings,
          permissions: {
            allowMembersToCreateTasks,
            allowMembersToInvite,
            requireApprovalForTasks,
          },
        },
      })

      // Refresh workspace data
      await refreshWorkspaces()

      toast({
        title: "Permissions Updated",
        description: "Workspace permissions have been updated successfully.",
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

  if (!currentWorkspace) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Workspace Permissions</h2>
        <p className="text-sm text-muted-foreground">Configure what members can do in this workspace</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Shield className="h-4 w-4 mr-2 text-primary" />
              Permission Settings
            </CardTitle>
            <CardDescription>Control what actions different roles can perform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow-create-tasks">Allow Members to Create Tasks</Label>
                <p className="text-sm text-muted-foreground">When enabled, regular members can create new tasks</p>
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
                <p className="text-sm text-muted-foreground">
                  When enabled, regular members can invite others to tasks
                </p>
              </div>
              <Switch id="allow-invite" checked={allowMembersToInvite} onCheckedChange={setAllowMembersToInvite} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="require-approval">Require Manager Approval for Tasks</Label>
                <p className="text-sm text-muted-foreground">When enabled, completed tasks require manager approval</p>
              </div>
              <Switch
                id="require-approval"
                checked={requireApprovalForTasks}
                onCheckedChange={setRequireApprovalForTasks}
              />
            </div>

            <Button type="submit" className="mt-4" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Permissions
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

// Keep the default export for backward compatibility
export default WorkspacePermissions
