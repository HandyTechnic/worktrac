"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { createWorkspaceInvitation } from "@/lib/firebase/workspace"
import { sendInvitationEmail } from "@/lib/email-service"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { WorkspaceRole } from "@/lib/types"
import { Mail } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const { currentWorkspace, refreshWorkspaceMembers } = useWorkspace()

  const [email, setEmail] = useState("")
  const [role, setRole] = useState<WorkspaceRole>("member")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !currentWorkspace) {
      toast({
        title: "Error",
        description: "Unable to send invitation at this time.",
        variant: "destructive",
      })
      return
    }

    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Create invitation in Firestore
      await createWorkspaceInvitation(email, currentWorkspace.id, role, user.id as string)

      // Send invitation email
      await sendInvitationEmail(email, user.name || "A team member", currentWorkspace.name)

      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${email}.`,
      })

      // Reset form and close dialog
      setEmail("")
      setRole("member")
      onOpenChange(false)

      // Refresh workspace members list
      refreshWorkspaceMembers()
    } catch (error) {
      console.error("Error sending invitation:", error)
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your workspace. They'll receive an email with instructions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as WorkspaceRole)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {role === "member"
                ? "Members can view and update their assigned tasks."
                : role === "manager"
                  ? "Managers can create and assign tasks to team members."
                  : "Admins have full access to manage the workspace and its members."}
            </p>
          </div>

          <Alert variant="default" className="bg-muted border-muted-foreground/20 mt-4">
            <Mail className="h-4 w-4" />
            <AlertDescription>
              An invitation email will be sent to this address. The invitation will expire in 7 days.
            </AlertDescription>
          </Alert>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
