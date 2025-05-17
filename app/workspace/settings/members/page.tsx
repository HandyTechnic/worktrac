"use client"

import { useState, useEffect } from "react"
import { useWorkspace } from "@/contexts/workspace-context"
import { getWorkspaceMembers, getWorkspaceInvitations } from "@/lib/firebase/workspace"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import InviteMemberDialog from "@/components/invite-member-dialog"
import { useAuth } from "@/contexts/auth-context"

export default function WorkspaceMembersPage() {
  const [members, setMembers] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const { currentWorkspace } = useWorkspace()
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    async function loadData() {
      if (!currentWorkspace?.id) {
        console.log("No workspace ID available")
        setLoading(false)
        return
      }

      try {
        console.log("Loading workspace members for workspace:", currentWorkspace.id)
        const [membersData, invitationsData] = await Promise.all([
          getWorkspaceMembers(currentWorkspace.id),
          getWorkspaceInvitations(currentWorkspace.id),
        ])

        console.log("Loaded members:", membersData.length)
        console.log("Loaded invitations:", invitationsData.length)

        setMembers(membersData)
        setInvitations(invitationsData)
      } catch (error) {
        console.error("Error loading workspace members:", error)
        toast({
          title: "Error",
          description: "Failed to load workspace members.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [currentWorkspace, toast])

  const handleInviteSuccess = () => {
    // Reload invitations
    if (currentWorkspace?.id) {
      getWorkspaceInvitations(currentWorkspace.id)
        .then((data) => setInvitations(data))
        .catch((error) => {
          console.error("Error reloading invitations:", error)
        })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full max-w-sm" />
        <Skeleton className="h-8 w-full max-w-md" />
        <Skeleton className="h-8 w-full max-w-lg" />
      </div>
    )
  }

  if (!currentWorkspace) {
    return <div>No workspace selected</div>
  }

  // Debug workspace ID
  console.log("Current workspace ID:", currentWorkspace.id)
  console.log("Current user:", user)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Workspace Members</h2>
        <Button onClick={() => setInviteDialogOpen(true)}>Invite Member</Button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Members ({members.length})</h3>
        {members.length === 0 ? (
          <p className="text-muted-foreground">No members found.</p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <p className="font-medium">{member.userId}</p>
                  <p className="text-sm text-muted-foreground">Role: {member.role}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Pending Invitations ({invitations.length})</h3>
        {invitations.length === 0 ? (
          <p className="text-muted-foreground">No pending invitations.</p>
        ) : (
          <div className="space-y-2">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <p className="font-medium">{invitation.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Role: {invitation.role} | Invited by: {invitation.invitedBy}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Expires: {invitation.expiresAt.toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        workspaceId={currentWorkspace.id}
        onSuccess={handleInviteSuccess}
      />
    </div>
  )
}
