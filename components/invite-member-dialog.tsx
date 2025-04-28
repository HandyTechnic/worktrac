"use client"

import { useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { createWorkspaceInvitation } from "@/lib/firebase/workspace"

const inviteFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  role: z.string().min(1, { message: "Please select a role" }),
})

type InviteFormValues = z.infer<typeof inviteFormSchema>

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  onSuccess: () => void
}

export default function InviteMemberDialog({ open, onOpenChange, workspaceId, onSuccess }: InviteMemberDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  })

  const onSubmit = async (data: InviteFormValues) => {
    setIsSubmitting(true)

    try {
      if (!user) {
        throw new Error("You must be logged in to invite members")
      }

      // Validate workspaceId
      if (!workspaceId || typeof workspaceId !== "string") {
        console.error("Invalid workspaceId:", workspaceId)
        throw new Error("Invalid workspace ID")
      }

      // Validate email
      if (!data.email || typeof data.email !== "string") {
        console.error("Invalid email:", data.email)
        throw new Error("Invalid email address")
      }

      // Validate role
      if (!data.role || typeof data.role !== "string") {
        console.error("Invalid role:", data.role)
        throw new Error("Invalid role")
      }

      // Get user ID - ensure we have a valid string
      const userId = user.id || user.uid
      if (!userId || typeof userId !== "string") {
        console.error("Invalid user ID:", userId)
        throw new Error("User ID is missing or invalid")
      }

      // Log all parameters for debugging
      console.log("Invitation parameters:", {
        email: data.email,
        workspaceId,
        role: data.role,
        invitedBy: userId,
      })

      // Call createWorkspaceInvitation function with validated parameters
      await createWorkspaceInvitation(data.email.trim(), workspaceId, data.role, userId)

      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${data.email} with role ${data.role}.`,
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Error inviting member:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send invitation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Invite a new member to your workspace. They will receive an email invitation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
