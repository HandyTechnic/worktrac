"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { subscribeToPendingUsers, approveUser, rejectUser } from "@/lib/firebase/auth"
import { ArrowLeft, CheckCircle, XCircle, Clock, Search, UserPlus } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { sendInvitationEmail } from "@/lib/email-service"

export default function UserManagementPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [pendingUsers, setPendingUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState(null)
  const [approvalRole, setApprovalRole] = useState("user")
  const [rejectionReason, setRejectionReason] = useState("")
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showRejectionDialog, setShowRejectionDialog] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }

    // Check if user is an admin
    if (user && user.userRole !== "admin") {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      })
      router.push("/")
    }
  }, [user, loading, router, toast])

  useEffect(() => {
    if (user?.userRole === "admin") {
      // Subscribe to pending users
      const unsubscribe = subscribeToPendingUsers((users) => {
        setPendingUsers(users)
      })

      return () => unsubscribe()
    }
  }, [user])

  const filteredUsers = pendingUsers.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleApproveClick = (user) => {
    setSelectedUser(user)
    setApprovalRole("user")
    setShowApprovalDialog(true)
  }

  const handleRejectClick = (user) => {
    setSelectedUser(user)
    setRejectionReason("")
    setShowRejectionDialog(true)
  }

  const handleApproveConfirm = async () => {
    if (!selectedUser) return

    setIsProcessing(true)

    try {
      const { success, error } = await approveUser(selectedUser.id, approvalRole)

      if (success) {
        toast({
          title: "User Approved",
          description: `${selectedUser.name} has been approved as a ${approvalRole}.`,
        })
        setShowApprovalDialog(false)
      } else {
        toast({
          title: "Error",
          description: error || "Failed to approve user.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error approving user:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectConfirm = async () => {
    if (!selectedUser) return

    setIsProcessing(true)

    try {
      const { success, error } = await rejectUser(selectedUser.id, rejectionReason)

      if (success) {
        toast({
          title: "User Rejected",
          description: `${selectedUser.name}'s account has been rejected.`,
        })
        setShowRejectionDialog(false)
      } else {
        toast({
          title: "Error",
          description: error || "Failed to reject user.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error rejecting user:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleInviteUser = async (e) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      if (!inviteEmail) {
        toast({
          title: "Error",
          description: "Please enter an email address.",
          variant: "destructive",
        })
        return
      }

      // Send invitation email
      await sendInvitationEmail(inviteEmail, user.name)

      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${inviteEmail}.`,
      })

      setInviteEmail("")
      setShowInviteDialog(false)
    } catch (error) {
      console.error("Error inviting user:", error)
      toast({
        title: "Error",
        description: "Failed to send invitation.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading || !user || user.userRole !== "admin") {
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
    <div className="container mx-auto p-4 max-w-[1200px]">
      <Button variant="ghost" className="mb-6" onClick={() => router.push("/admin")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Panel
      </Button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Invite User
        </Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="all">All Users</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Pending Users</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search users..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <CardDescription>Users waiting for account approval</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredUsers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role || "Not specified"}</TableCell>
                        <TableCell>{user.createdAt ? format(user.createdAt, "MMM d, yyyy") : "Unknown"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            <Clock className="mr-1 h-3 w-3" /> Pending
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectClick(user)}
                              className="text-destructive hover:text-destructive"
                            >
                              <XCircle className="mr-1 h-4 w-4" /> Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproveClick(user)}
                              className="bg-success hover:bg-success/90 text-white"
                            >
                              <CheckCircle className="mr-1 h-4 w-4" /> Approve
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No users match your search" : "No pending users"}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Manage all users in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-muted-foreground">
                All users management will be implemented in the next phase
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve User</DialogTitle>
            <DialogDescription>Approve this user and assign them a role in the system.</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>User</Label>
                <div className="font-medium">
                  {selectedUser.name} ({selectedUser.email})
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Assign Role</Label>
                <Select value={approvalRole} onValueChange={setApprovalRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Regular User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {approvalRole === "admin"
                    ? "Administrators have full access to all features and can manage users."
                    : approvalRole === "manager"
                      ? "Managers can create and assign tasks to team members."
                      : "Regular users can view and update their assigned tasks."}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={handleApproveConfirm}
              disabled={isProcessing}
              className="bg-success hover:bg-success/90 text-white"
            >
              {isProcessing ? "Processing..." : "Approve User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject User</DialogTitle>
            <DialogDescription>Reject this user's account request. Optionally provide a reason.</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>User</Label>
                <div className="font-medium">
                  {selectedUser.name} ({selectedUser.email})
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Provide a reason for rejection"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleRejectConfirm} disabled={isProcessing} variant="destructive">
              {isProcessing ? "Processing..." : "Reject User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>Send an invitation email to a new user.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInviteUser} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInviteDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
