"use client"

import { Label } from "@/components/ui/label"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useWorkspace } from "@/contexts/workspace-context"
import { useAuth } from "@/contexts/auth-context"
import {
  getWorkspaceMembers,
  getWorkspaceInvitations,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
} from "@/lib/firebase/workspace"
import { getAllUsers } from "@/lib/firebase/auth"
import type { WorkspaceMember, WorkspaceInvitation, WorkspaceRole } from "@/lib/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, UserPlus, MoreHorizontal, Clock, X, Shield, User, Users } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import InviteMemberDialog from "@/components/invite-member-dialog"

export function WorkspaceMembers() {
  const { toast } = useToast()
  const { user } = useAuth()
  const { currentWorkspace, userRole, refreshWorkspaceMembers } = useWorkspace()

  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showChangeRoleDialog, setShowChangeRoleDialog] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [selectedMember, setSelectedMember] = useState<WorkspaceMember | null>(null)
  const [newRole, setNewRole] = useState<WorkspaceRole>("member")

  // Load workspace members and invitations
  useEffect(() => {
    if (!currentWorkspace) return

    const loadData = async () => {
      setLoading(true)
      try {
        // Get all workspace members
        const workspaceMembers = await getWorkspaceMembers(currentWorkspace.id)
        setMembers(workspaceMembers)

        // Get all pending invitations
        const pendingInvitations = await getWorkspaceInvitations(currentWorkspace.id)
        setInvitations(pendingInvitations)

        // Get all users for member details
        const allUsers = await getAllUsers()
        setUsers(allUsers)
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

  // Filter members based on search term
  const filteredMembers = members.filter((member) => {
    const userData = users.find((u) => u.id === member.userId)
    if (!userData) return false

    return (
      userData.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userData.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userData.role?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  // Get user data for a member
  const getMemberUser = (userId: string) => {
    return users.find((u) => u.id === userId) || null
  }

  // Check if current user can manage this member
  const canManageMember = (member: WorkspaceMember) => {
    if (!user) return false

    // Can't manage yourself
    if (member.userId === user.id) return false

    // Owners can manage everyone
    if (userRole === "owner") return true

    // Admins can manage everyone except owners
    if (userRole === "admin") return member.role !== "owner"

    // Managers can only manage members
    if (userRole === "manager") return member.role === "member"

    // Regular members can't manage anyone
    return false
  }

  // Handle changing a member's role
  const handleChangeRole = async () => {
    if (!selectedMember) return

    try {
      await updateWorkspaceMemberRole(selectedMember.id, newRole)

      toast({
        title: "Role Updated",
        description: "The member's role has been updated successfully.",
      })

      // Update local state
      setMembers((prev) => prev.map((m) => (m.id === selectedMember.id ? { ...m, role: newRole } : m)))

      setShowChangeRoleDialog(false)
      refreshWorkspaceMembers()
    } catch (error) {
      console.error("Error updating member role:", error)
      toast({
        title: "Error",
        description: "Failed to update member role. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle removing a member
  const handleRemoveMember = async () => {
    if (!selectedMember) return

    try {
      await removeWorkspaceMember(selectedMember.id)

      toast({
        title: "Member Removed",
        description: "The member has been removed from the workspace.",
      })

      // Update local state
      setMembers((prev) => prev.filter((m) => m.id !== selectedMember.id))

      setShowRemoveDialog(false)
      refreshWorkspaceMembers()
    } catch (error) {
      console.error("Error removing member:", error)
      toast({
        title: "Error",
        description: "Failed to remove member. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Get role icon
  const getRoleIcon = (role: WorkspaceRole) => {
    switch (role) {
      case "owner":
        return <Shield className="h-4 w-4 text-primary" />
      case "admin":
        return <Shield className="h-4 w-4 text-success" />
      case "manager":
        return <Users className="h-4 w-4 text-warning" />
      default:
        return <User className="h-4 w-4 text-muted-foreground" />
    }
  }

  // Get role badge variant
  const getRoleBadgeVariant = (role: WorkspaceRole) => {
    switch (role) {
      case "owner":
        return "default"
      case "admin":
        return "success"
      case "manager":
        return "warning"
      default:
        return "secondary"
    }
  }

  if (!currentWorkspace) {
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Workspace Members</CardTitle>
          <CardDescription>Manage members and invitations for {currentWorkspace.name}</CardDescription>
        </div>
        {(userRole === "owner" || userRole === "admin" || userRole === "manager") && (
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Invite Member
          </Button>
        )}
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="members" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
              <TabsTrigger value="invitations">Pending Invitations ({invitations.length})</TabsTrigger>
            </TabsList>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search members..."
                className="w-[200px] pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value="members">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredMembers.length > 0 ? (
              <div className="space-y-4">
                {filteredMembers.map((member) => {
                  const memberUser = getMemberUser(member.userId)
                  if (!memberUser) return null

                  return (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{memberUser.name?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{memberUser.name}</div>
                          <div className="text-sm text-muted-foreground">{memberUser.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant={getRoleBadgeVariant(member.role)} className="flex items-center gap-1">
                          {getRoleIcon(member.role)}
                          <span className="capitalize">{member.role}</span>
                        </Badge>

                        {canManageMember(member) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMember(member)
                                  setNewRole(member.role)
                                  setShowChangeRoleDialog(true)
                                }}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Change Role
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMember(member)
                                  setShowRemoveDialog(true)
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Remove from Workspace
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No members match your search" : "No members found"}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invitations">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : invitations.length > 0 ? (
              <div className="space-y-4">
                {invitations.map((invitation) => {
                  const inviterUser = getMemberUser(invitation.invitedBy)

                  return (
                    <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{invitation.email.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{invitation.email}</div>
                          <div className="text-sm text-muted-foreground">
                            Invited by {inviterUser?.name || "Unknown"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant={getRoleBadgeVariant(invitation.role)} className="flex items-center gap-1">
                          {getRoleIcon(invitation.role)}
                          <span className="capitalize">{invitation.role}</span>
                        </Badge>

                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Pending</span>
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No pending invitations</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Invite Member Dialog */}
      <InviteMemberDialog open={showInviteDialog} onOpenChange={setShowInviteDialog} />

      {/* Change Role Dialog */}
      <Dialog open={showChangeRoleDialog} onOpenChange={setShowChangeRoleDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Member Role</DialogTitle>
            <DialogDescription>Update the role and permissions for this workspace member.</DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 mb-4">
                <Avatar>
                  <AvatarFallback>{getMemberUser(selectedMember.userId)?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{getMemberUser(selectedMember.userId)?.name}</div>
                  <div className="text-sm text-muted-foreground">{getMemberUser(selectedMember.userId)?.email}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newRole} onValueChange={(value) => setNewRole(value as WorkspaceRole)}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Only show roles the current user can assign */}
                    {userRole === "owner" && <SelectItem value="admin">Admin</SelectItem>}
                    {(userRole === "owner" || userRole === "admin") && <SelectItem value="manager">Manager</SelectItem>}
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {newRole === "admin"
                    ? "Admins can manage workspace settings and members."
                    : newRole === "manager"
                      ? "Managers can create and assign tasks to team members."
                      : "Members can view and update their assigned tasks."}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole}>Update Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>Are you sure you want to remove this member from the workspace?</DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="py-4">
              <div className="flex items-center gap-3 mb-4">
                <Avatar>
                  <AvatarFallback>{getMemberUser(selectedMember.userId)?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{getMemberUser(selectedMember.userId)?.name}</div>
                  <div className="text-sm text-muted-foreground">{getMemberUser(selectedMember.userId)?.email}</div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                This action will remove the member from the workspace. They will no longer have access to any tasks or
                data in this workspace.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember}>
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// Keep the default export for backward compatibility
export default WorkspaceMembers
