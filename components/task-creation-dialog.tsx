"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useTasks } from "@/contexts/task-context"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { Plus, Trash2, Calendar, Users, AlertCircle, Info } from "lucide-react"
import { format } from "date-fns"
import { getAllUsers } from "@/lib/firebase/auth"
import { getWorkspaceMembers } from "@/lib/firebase/workspace"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { createTaskInvitation } from "@/lib/firebase/task-invitations"
import { getTask } from "@/lib/firebase/db"

// Add a check at the beginning of the component to restrict access
export default function TaskCreationDialog({ onClose, parentTaskId = null }) {
  const { toast } = useToast()
  const { addTask } = useTasks()
  const { user } = useAuth()
  const { currentWorkspace, userRole } = useWorkspace()

  // Only workspace owners can create top-level tasks
  // Members can only create subtasks within tasks they're assigned to
  useEffect(() => {
    if (!parentTaskId && userRole !== "owner") {
      toast({
        title: "Permission Denied",
        description: "Only workspace owners can create new tasks.",
        variant: "destructive",
      })
      onClose()
    }
  }, [parentTaskId, userRole, onClose, toast])

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [startDate, setStartDate] = useState(new Date())
  const [endDate, setEndDate] = useState(new Date())
  const [complexity, setComplexity] = useState("3")
  const [workload, setWorkload] = useState("3")
  const [hasSubtasks, setHasSubtasks] = useState(false)
  const [requiresApproval, setRequiresApproval] = useState(true)
  const [subtasks, setSubtasks] = useState<
    Array<{
      title: string
      assigneeIds: string[]
      startDate: Date
      endDate: Date
      requiresAcceptance: boolean
    }>
  >([])
  const [loading, setLoading] = useState(false)
  const [workspaceMembers, setWorkspaceMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  // Fetch workspace members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoadingMembers(true)
        if (!currentWorkspace) return

        // Get all workspace members
        const members = await getWorkspaceMembers(currentWorkspace.id)

        // Get user details for each member
        const users = await getAllUsers()

        // Combine member data with user data
        const membersWithDetails = members.map((member) => {
          const userData = users.find((u) => u.id === member.userId)
          return {
            ...member,
            name: userData?.name || "Unknown",
            email: userData?.email || "",
            role: userData?.role || "",
          }
        })

        setWorkspaceMembers(membersWithDetails)
      } catch (error) {
        console.error("Error fetching workspace members:", error)
        toast({
          title: "Error",
          description: "Failed to load team members. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoadingMembers(false)
      }
    }

    fetchMembers()
  }, [currentWorkspace, toast])

  // Add a new subtask
  const addSubtask = () => {
    setSubtasks([
      ...subtasks,
      {
        title: "",
        assigneeIds: [],
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        requiresAcceptance: false,
      },
    ])
  }

  // Remove a subtask
  const removeSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index))
  }

  // Update a subtask
  const updateSubtask = (index: number, field: string, value: any) => {
    const updatedSubtasks = [...subtasks]
    updatedSubtasks[index] = {
      ...updatedSubtasks[index],
      [field]: value,
    }
    setSubtasks(updatedSubtasks)
  }

  // Toggle assignee selection
  const toggleAssignee = (memberId: string) => {
    setAssigneeIds((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]))
  }

  // Toggle subtask assignee
  const toggleSubtaskAssignee = (subtaskIndex: number, memberId: string) => {
    const updatedSubtasks = [...subtasks]
    const currentAssignees = updatedSubtasks[subtaskIndex].assigneeIds

    updatedSubtasks[subtaskIndex].assigneeIds = currentAssignees.includes(memberId)
      ? currentAssignees.filter((id) => id !== memberId)
      : [...currentAssignees, memberId]

    setSubtasks(updatedSubtasks)
  }

  // Get assignee names for display
  const getAssigneeNames = (ids: string[]) => {
    if (!ids.length) return "No assignees"

    const assignees = ids.map((id) => {
      const member = workspaceMembers.find((m) => m.userId === id)
      return member ? member.name : "Unknown"
    })

    if (assignees.length <= 2) {
      return assignees.join(", ")
    }

    return `${assignees[0]}, ${assignees[1]} +${assignees.length - 2} more`
  }

  // Update the handleSubmit function to use the addTask function from the context
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Validate form
    if (!title || assigneeIds.length === 0 || !startDate || !endDate) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    // Check if workspace is available
    if (!currentWorkspace) {
      toast({
        title: "Error",
        description: "No workspace selected. Please select a workspace first.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    // Validate subtasks if present
    if (hasSubtasks && subtasks.length > 0) {
      const invalidSubtask = subtasks.find((st) => !st.title || st.assigneeIds.length === 0)

      if (invalidSubtask) {
        toast({
          title: "Invalid Subtask",
          description: "Please ensure all subtasks have a title and at least one assignee.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }
    }

    try {
      // Determine which assignees need invitations
      // Managers, admins, and owners can directly assign tasks without invitations
      const isManager = userRole === "manager" || userRole === "admin" || userRole === "owner"

      // For regular members, they can only create tasks for themselves initially
      // Other members will need invitations
      const directAssignees = isManager
        ? [...assigneeIds] // Managers can assign directly to anyone
        : [user?.id] // Regular users can only assign to themselves initially

      // Assignees that need invitations (for regular members only)
      const invitationAssignees = isManager
        ? [] // Managers don't need to send invitations
        : assigneeIds.filter((id) => id !== user?.id) // Regular users need to invite others

      // Create new task with direct assignees
      const newTask = {
        title,
        description,
        assigneeIds: directAssignees,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        status: "pending",
        completion: 0,
        complexity: Number.parseInt(complexity),
        workload: Number.parseInt(workload),
        requiresApproval,
        updates: [],
        creatorId: user?.id,
        workspaceId: currentWorkspace.id,
        subtasks:
          hasSubtasks && subtasks.length > 0
            ? subtasks.map((st) => {
                // For subtasks, apply the same permission logic
                const directSubtaskAssignees = isManager
                  ? [...st.assigneeIds]
                  : st.assigneeIds.includes(user?.id)
                    ? [user?.id]
                    : []

                return {
                  title: st.title,
                  assigneeIds: directSubtaskAssignees,
                  startDate: st.startDate.toISOString().split("T")[0],
                  endDate: st.endDate.toISOString().split("T")[0],
                  status: "pending",
                  completion: 0,
                  requiresAcceptance: st.requiresAcceptance,
                  creatorId: user?.id,
                }
              })
            : [],
      }

      // Add the task
      const taskId = await addTask(newTask)

      if (!taskId) {
        throw new Error("Failed to create task")
      }

      // Send invitations to other assignees if needed
      if (!isManager && invitationAssignees.length > 0) {
        for (const assigneeId of invitationAssignees) {
          try {
            await createTaskInvitation(
              taskId,
              null, // No subtask
              user?.id,
              assigneeId,
              currentWorkspace.id,
            )
          } catch (error) {
            console.error(`Error inviting user ${assigneeId} to task:`, error)
          }
        }
      }

      // Send invitations for subtasks if needed
      if (!isManager && hasSubtasks && subtasks.length > 0) {
        const taskDoc = await getTask(taskId)

        if (taskDoc && taskDoc.subtasks) {
          for (const subtask of taskDoc.subtasks) {
            const subtaskInvitees = subtask.requiresAcceptance
              ? subtask.assigneeIds.filter((id) => id !== user?.id)
              : []

            for (const inviteeId of subtaskInvitees) {
              try {
                await createTaskInvitation(taskId, subtask.id, user?.id, inviteeId, currentWorkspace.id)
              } catch (error) {
                console.error(`Error inviting user ${inviteeId} to subtask:`, error)
              }
            }
          }
        }
      }

      toast({
        title: "Task Created",
        description: `Task "${title}" has been created.`,
      })

      onClose()
    } catch (error) {
      console.error("Error creating task:", error)
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>Add a new task to the workspace</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              required
              className="border-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
              rows={3}
              className="border-input resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                    disabled={(date) => date < startDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="complexity">Complexity (1-5)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Low</span>
                <Input
                  id="complexity"
                  type="range"
                  min="1"
                  max="5"
                  value={complexity}
                  onChange={(e) => setComplexity(e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">High</span>
              </div>
              <div className="flex justify-between">
                {[1, 2, 3, 4, 5].map((value) => (
                  <div
                    key={value}
                    className={`w-8 h-1 rounded-full ${Number.parseInt(complexity) >= value ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workload">Workload (1-5)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Light</span>
                <Input
                  id="workload"
                  type="range"
                  min="1"
                  max="5"
                  value={workload}
                  onChange={(e) => setWorkload(e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">Heavy</span>
              </div>
              <div className="flex justify-between">
                {[1, 2, 3, 4, 5].map((value) => (
                  <div
                    key={value}
                    className={`w-8 h-1 rounded-full ${Number.parseInt(workload) >= value ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Assignees</Label>
              <Badge variant="outline" className="font-normal">
                {assigneeIds.length} selected
              </Badge>
            </div>

            {loadingMembers ? (
              <div className="flex items-center justify-center h-20 bg-muted/50 rounded-md">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : workspaceMembers.length === 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No team members found</AlertTitle>
                <AlertDescription>
                  There are no members in this workspace. Please add team members first.
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-48 border rounded-md p-2">
                <div className="space-y-2">
                  {workspaceMembers.map((member) => (
                    <div key={member.userId} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md">
                      <Checkbox
                        id={`assignee-${member.userId}`}
                        checked={assigneeIds.includes(member.userId)}
                        onCheckedChange={() => toggleAssignee(member.userId)}
                      />
                      <div className="flex items-center flex-1 min-w-0">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarFallback>{member.name?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <Label htmlFor={`assignee-${member.userId}`} className="text-sm cursor-pointer truncate">
                          {member.name}
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {(userRole === "manager" || userRole === "admin" || userRole === "owner") && (
            <div className="flex items-center space-x-2">
              <Switch id="requires-approval" checked={requiresApproval} onCheckedChange={setRequiresApproval} />
              <div className="space-y-0.5">
                <Label htmlFor="requires-approval">Requires Manager Approval</Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, completed tasks must be approved by a manager
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-subtasks"
                checked={hasSubtasks}
                onCheckedChange={(checked) => setHasSubtasks(checked === true)}
              />
              <Label htmlFor="has-subtasks">This task has subtasks</Label>
            </div>
          </div>

          {hasSubtasks && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Subtasks</h3>
                <Button type="button" variant="outline" size="sm" onClick={addSubtask}>
                  <Plus className="h-4 w-4 mr-1" /> Add Subtask
                </Button>
              </div>

              {subtasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No subtasks added yet. Click "Add Subtask" to create one.
                </p>
              ) : (
                <div className="space-y-6">
                  {subtasks.map((subtask, index) => (
                    <div key={index} className="space-y-3 border rounded-md p-3 relative bg-muted/20">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 text-destructive"
                        onClick={() => removeSubtask(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="space-y-2">
                        <Label htmlFor={`subtask-${index}-title`}>Subtask Title</Label>
                        <Input
                          id={`subtask-${index}-title`}
                          value={subtask.title}
                          onChange={(e) => updateSubtask(index, "title", e.target.value)}
                          placeholder="Enter subtask title"
                          required
                          className="border-input"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !subtask.startDate && "text-muted-foreground",
                                )}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {subtask.startDate ? format(subtask.startDate, "PPP") : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={subtask.startDate}
                                onSelect={(date) => date && updateSubtask(index, "startDate", date)}
                                initialFocus
                                disabled={(date) => date < startDate || date > endDate}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label>End Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !subtask.endDate && "text-muted-foreground",
                                )}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                {subtask.endDate ? format(subtask.endDate, "PPP") : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={subtask.endDate}
                                onSelect={(date) => date && updateSubtask(index, "endDate", date)}
                                initialFocus
                                disabled={(date) => date < subtask.startDate || date > endDate}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`subtask-${index}-requires-acceptance`}
                          checked={subtask.requiresAcceptance}
                          onCheckedChange={(checked) => updateSubtask(index, "requiresAcceptance", checked)}
                        />
                        <div className="space-y-0.5">
                          <div className="flex items-center">
                            <Label htmlFor={`subtask-${index}-requires-acceptance`}>Requires Acceptance</Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="w-[200px] text-xs">
                                    When enabled, assignees must accept the subtask before they can start working on it
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Assignees will receive an invitation to join this subtask
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Assignees</Label>
                          <Badge variant="outline" className="font-normal">
                            {subtask.assigneeIds.length} selected
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => updateSubtask(index, "assigneeIds", [...assigneeIds])}
                          >
                            <Users className="h-3 w-3 mr-1" /> Copy from parent
                          </Button>

                          {subtask.assigneeIds.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => updateSubtask(index, "assigneeIds", [])}
                            >
                              Clear all
                            </Button>
                          )}
                        </div>

                        {loadingMembers ? (
                          <div className="flex items-center justify-center h-20 bg-muted/50 rounded-md">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          </div>
                        ) : (
                          <ScrollArea className="h-32 border rounded-md p-2">
                            <div className="space-y-2">
                              {workspaceMembers.map((member) => (
                                <div
                                  key={member.userId}
                                  className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md"
                                >
                                  <Checkbox
                                    id={`subtask-${index}-assignee-${member.userId}`}
                                    checked={subtask.assigneeIds.includes(member.userId)}
                                    onCheckedChange={() => toggleSubtaskAssignee(index, member.userId)}
                                  />
                                  <div className="flex items-center flex-1 min-w-0">
                                    <Avatar className="h-6 w-6 mr-2">
                                      <AvatarFallback>{member.name?.charAt(0) || "U"}</AvatarFallback>
                                    </Avatar>
                                    <Label
                                      htmlFor={`subtask-${index}-assignee-${member.userId}`}
                                      className="text-sm cursor-pointer truncate"
                                    >
                                      {member.name}
                                    </Label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || loadingMembers || assigneeIds.length === 0}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
