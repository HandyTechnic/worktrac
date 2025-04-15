"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { useWorkspace } from "@/contexts/workspace-context"
import { getWorkspaceMembers } from "@/lib/firebase/workspace"
import { getAllUsers } from "@/lib/firebase/auth"
import { createTaskInvitation } from "@/lib/firebase/task-invitations"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"

interface TeamMemberSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string
  subtaskId?: string
  currentAssigneeIds: (string | number)[]
  onInvitationsSent: () => void
}

export default function TeamMemberSelectionDialog({
  open,
  onOpenChange,
  taskId,
  subtaskId,
  currentAssigneeIds,
  onInvitationsSent,
}: TeamMemberSelectionDialogProps) {
  const { toast } = useToast()
  const { currentWorkspace, userRole } = useWorkspace()
  const { user } = useAuth()

  const [workspaceMembers, setWorkspaceMembers] = useState([])
  const [users, setUsers] = useState([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tasks, setTasks] = useState([])

  // Load workspace members
  useEffect(() => {
    if (!currentWorkspace || !open) return

    const loadMembers = async () => {
      setLoading(true)
      try {
        // Get workspace members
        const members = await getWorkspaceMembers(currentWorkspace.id)
        setWorkspaceMembers(members)

        // Get user details
        const allUsers = await getAllUsers()
        setUsers(allUsers)
      } catch (error) {
        console.error("Error loading workspace members:", error)
        toast({
          title: "Error",
          description: "Failed to load team members.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadMembers()
  }, [currentWorkspace, open, toast])

  // Reset selected members when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedMembers([])
    }
  }, [open])

  // Toggle member selection
  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  // Get user details
  const getUserDetails = (userId: string) => {
    return users.find((user) => user.id === userId) || null
  }

  // Send invitations
  const handleSendInvitations = async () => {
    if (!currentWorkspace || selectedMembers.length === 0 || !user) return

    setSubmitting(true)

    try {
      // For each selected member, create an invitation
      const invitationPromises = selectedMembers.map((memberId) =>
        createTaskInvitation(taskId, subtaskId || null, user.id, memberId, currentWorkspace.id),
      )

      await Promise.all(invitationPromises)

      toast({
        title: "Invitations Sent",
        description: `Sent ${selectedMembers.length} invitation(s) to team members.`,
      })

      onInvitationsSent()
      onOpenChange(false)
    } catch (error) {
      console.error("Error sending invitations:", error)
      toast({
        title: "Error",
        description: "Failed to send invitations. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Filter out members who are already assigned
  const availableMembers = workspaceMembers.filter((member) => !currentAssigneeIds.includes(member.userId))

  // Add a function to filter eligible members based on permissions
  const getEligibleMembers = () => {
    if (!currentWorkspace || !user) return []

    // If user is workspace owner, all workspace members are eligible
    if (userRole === "owner" || userRole === "admin" || userRole === "manager") {
      return workspaceMembers
    }

    // For regular members, only show members who are already assigned to the parent task
    if (taskId) {
      const task = tasks.find((t) => t.id.toString() === taskId)
      if (task) {
        return workspaceMembers.filter((member) => task.assigneeIds?.includes(member.userId))
      }
    }

    return []
  }

  // Use this function when rendering the member list
  const eligibleMembers = getEligibleMembers()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Team Members</DialogTitle>
          <DialogDescription>Select team members to invite to this {subtaskId ? "subtask" : "task"}.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : availableMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            All team members are already assigned to this {subtaskId ? "subtask" : "task"}.
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {eligibleMembers.map((member) => {
                const userDetails = getUserDetails(member.userId)
                if (!userDetails) return null

                return (
                  <div key={member.userId} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md">
                    <Checkbox
                      id={`member-${member.userId}`}
                      checked={selectedMembers.includes(member.userId)}
                      onCheckedChange={() => toggleMember(member.userId)}
                    />
                    <div className="flex items-center flex-1 min-w-0">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback>{userDetails.name?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <label htmlFor={`member-${member.userId}`} className="text-sm font-medium cursor-pointer">
                          {userDetails.name}
                        </label>
                        <p className="text-xs text-muted-foreground truncate">{userDetails.role || "Team Member"}</p>
                      </div>
                      <Badge variant="outline" className="ml-2 capitalize">
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSendInvitations} disabled={selectedMembers.length === 0 || submitting}>
            {submitting ? "Sending..." : "Send Invitations"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
