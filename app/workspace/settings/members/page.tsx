"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, MoreHorizontal, UserPlus, Mail } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import InviteMemberDialog from "@/components/invite-member-dialog"
import { Badge } from "@/components/ui/badge"
import { getWorkspaceMembers, updateWorkspaceMemberRole, removeWorkspaceMember } from "@/lib/firebase/workspace"
import { useToast } from "@/hooks/use-toast"

export default function WorkspaceMembersPage() {
  const { user, loading } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const router = useRouter()
  const { toast } = useToast()

  const [members, setMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted) {
      return
    }

    // Set the correct tab value when on members page
    const tabsList = document.querySelector('[role="tablist"]')
    if (tabsList) {
      const membersTab = tabsList.querySelector('[value="members"]')
      if (membersTab) {
        ;(membersTab as HTMLElement).click()
      }
    }
  }, [hasMounted])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }

    if (currentWorkspace) {
      loadMembers()
    }
  }, [currentWorkspace, loading, user, router])

  const loadMembers = async () => {
    if (!currentWorkspace) return

    setIsLoading(true)
    try {
      const workspaceMembers = await getWorkspaceMembers(currentWorkspace.id)
      setMembers(workspaceMembers)
    } catch (error) {
      console.error("Error loading workspace members:", error)
      toast({
        title: "Error",
        description: "Failed to load workspace members.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRoleChange = async (memberId, newRole) => {
    if (!currentWorkspace) return

    try {
      await updateWorkspaceMemberRole(currentWorkspace.id, memberId, newRole)
      toast({
        title: "Role Updated",
        description: "Member role has been updated successfully.",
      })
      loadMembers()
    } catch (error) {
      console.error("Error updating member role:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update member role. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!currentWorkspace) return

    try {
      await removeWorkspaceMember(currentWorkspace.id, memberId)
      toast({
        title: "Member Removed",
        description: "Member has been removed from the workspace.",
      })
      loadMembers()
    } catch (error) {
      console.error("Error removing member:", error)
      toast({
        title: "Removal Failed",
        description: "Failed to remove member. Please try again.",
        variant: "destructive",
      })
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workspace Members</h1>
          <p className="text-muted-foreground">Manage members and their roles</p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>People with access to this workspace</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No members yet</p>
                  <p className="text-sm">Invite people to collaborate in this workspace</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowInviteDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Invite Member
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between py-4">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>{member.name?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          <div className="text-sm text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            member.role === "owner" ? "default" : member.role === "admin" ? "outline" : "secondary"
                          }
                        >
                          {member.role}
                        </Badge>
                        {member.id !== user.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleRoleChange(member.id, "admin")}>
                                Make Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRoleChange(member.id, "member")}>
                                Make Member
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleRemoveMember(member.id)}
                              >
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <InviteMemberDialog
            workspaceId={currentWorkspace.id}
            onSuccess={() => {
              setShowInviteDialog(false)
              loadMembers()
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
