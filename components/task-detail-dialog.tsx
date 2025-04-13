"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ProgressIndicator } from "@/components/progress-indicator"
import {
  PaperclipIcon,
  X,
  Calendar,
  Users,
  Edit,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Info,
  AlertTriangle,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { useAuth } from "@/contexts/auth-context"
import { updateTask, createTask } from "@/lib/firebase/db"
import { uploadFile } from "@/lib/firebase/storage"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getAllUsers } from "@/lib/firebase/auth"
import { getWorkspaceMembers } from "@/lib/firebase/workspace"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Task, SubTask } from "@/lib/types"

interface TaskDetailDialogProps {
  task: Task | SubTask
  open: boolean
  onClose: () => void
  onUpdate: (taskId: string, updatedTask: any) => void
  onDelete?: (taskId: string) => void
}

export default function TaskDetailDialog({ task, open, onClose, onUpdate, onDelete }: TaskDetailDialogProps) {
  const [activeTab, setActiveTab] = useState("details")
  const [isEditing, setIsEditing] = useState(false)
  const [isAddingSubtask, setIsAddingSubtask] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || "")
  const [startDate, setStartDate] = useState<Date>(new Date(task.startDate))
  const [endDate, setEndDate] = useState<Date>(new Date(task.endDate))
  const [complexity, setComplexity] = useState("complexity" in task ? task.complexity : 3)
  const [workload, setWorkload] = useState("workload" in task ? task.workload : 3)
  const [updateText, setUpdateText] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [completion, setCompletion] = useState(task.completion || 0)
  const [status, setStatus] = useState(task.status)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [staffMembers, setStaffMembers] = useState([])
  const [workspaceMembers, setWorkspaceMembers] = useState([])
  const [expandedSubtasks, setExpandedSubtasks] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [newSubtasks, setNewSubtasks] = useState<
    Array<{
      title: string
      assigneeIds: string[]
      startDate: Date
      endDate: Date
      requiresAcceptance: boolean
    }>
  >([])
  const [taskId, setTaskId] = useState<string | null>(null)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { user } = useAuth()

  // Determine if this is a subtask - check both parentId property and subtasks array
  const isSubtask = Boolean(("parentId" in task && task.parentId) || (task.id && task.id.toString().includes("-sub-")))

  // Check user permissions
  const isCreator = task.creatorId === user?.id
  const isAssignee = task.assigneeIds?.includes(user?.id)
  const isManager = user?.userRole === "manager" || user?.userRole === "admin" || user?.userRole === "owner"
  const canEdit = isManager || isCreator || isAssignee
  const canDelete = isManager || isCreator

  // Update form fields when task changes
  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description || "")
    setStartDate(new Date(task.startDate))
    setEndDate(new Date(task.endDate))
    setCompletion(task.completion || 0)
    setStatus(task.status)

    if ("complexity" in task) {
      setComplexity(task.complexity)
    }

    if ("workload" in task) {
      setWorkload(task.workload)
    }
  }, [task])

  // Generate or retrieve task ID on component mount
  useEffect(() => {
    const ensureTaskExists = async () => {
      // If task already has an ID, use it
      if (task.id) {
        console.log("Task already has ID:", task.id)
        setTaskId(String(task.id))
        return
      }

      // For new tasks without an ID, we need to create one
      try {
        setIsCreatingTask(true)

        // Create a new task in Firestore
        const newTaskData = {
          ...task,
          updates: task.updates || [],
          createdAt: new Date().toISOString(),
        }

        // Use the createTask function to add the task to Firestore
        const newId = await createTask(newTaskData)
        console.log("Created new task with ID:", newId)

        // Set the task ID in state
        setTaskId(newId)

        // Update the task object with its new ID
        const updatedTask = {
          ...task,
          id: newId,
        }

        // Notify parent component of the new task
        onUpdate(newId, updatedTask)
      } catch (error) {
        console.error("Error creating task:", error)
        alert(`Error creating task: ${error.message || "Unknown error"}`)
      } finally {
        setIsCreatingTask(false)
      }
    }

    ensureTaskExists()
  }, [task, onUpdate])

  // Load staff members for displaying names in updates
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const users = await getAllUsers()
        setStaffMembers(users)
      } catch (error) {
        console.error("Error loading staff members:", error)
      }
    }

    loadStaff()
  }, [])

  // Fetch workspace members for subtask assignment
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoadingMembers(true)
        if (!task.workspaceId) return

        // Get all workspace members
        const members = await getWorkspaceMembers(task.workspaceId)

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
      } finally {
        setLoadingMembers(false)
      }
    }

    if (isAddingSubtask) {
      fetchMembers()
    }
  }, [task.workspaceId, isAddingSubtask])

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  // Submit an update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!updateText.trim() && !selectedFile) return

    setIsUploading(true)

    try {
      // Check if we have a valid task ID
      if (!taskId) {
        throw new Error("Task ID is not available. Please try again later.")
      }

      let fileData = null

      // Upload file if selected
      if (selectedFile) {
        const path = `tasks/${taskId}/${Date.now()}_${selectedFile.name}`
        const downloadURL = await uploadFile(selectedFile, path, (progress) => {
          setUploadProgress(progress)
        })

        fileData = {
          name: selectedFile.name,
          url: downloadURL,
          path,
          size: selectedFile.size,
          type: selectedFile.type,
          uploadedBy: user?.id,
          uploadedAt: new Date().toISOString(),
        }
      }

      // Create update object
      const newUpdate = {
        id: Date.now().toString(),
        text: updateText.trim() || (selectedFile ? `Uploaded file: ${selectedFile.name}` : ""),
        timestamp: new Date().toISOString(),
        userId: user?.id,
        type: status !== task.status ? "status_change" : selectedFile ? "file_upload" : "comment",
        file: fileData,
      }

      // Create updated task object with the new ID if it wasn't there before
      const updatedTask = {
        ...task,
        id: taskId, // Ensure the ID is included
        completion,
        status,
        updates: [...(task.updates || []), newUpdate],
      }

      // Use the updateTask function with createIfNotExists set to true
      await updateTask(taskId, updatedTask, true)
      onUpdate(taskId, updatedTask)

      // Reset form
      setUpdateText("")
      setSelectedFile(null)
      setUploadProgress(0)

      // Reset file input
      const fileInput = document.getElementById("file-input") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    } catch (error) {
      console.error("Error updating task:", error)
      alert(`Error updating task: ${error.message || "Unknown error"}`)
    } finally {
      setIsUploading(false)
    }
  }

  // Handle edit form submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Check if we have a valid task ID
      if (!taskId) {
        throw new Error("Task ID is not available. Please try again.")
      }

      const updatedTask = {
        ...task,
        id: taskId, // Ensure the ID is included
        title,
        description,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        ...(isSubtask ? {} : { complexity, workload }),
      }

      await updateTask(taskId, updatedTask, true)
      onUpdate(taskId, updatedTask)

      setIsEditing(false)
    } catch (error) {
      console.error("Error updating task:", error)
      alert(`Error updating task: ${error.message || "Unknown error"}`)
    }
  }

  // Add a new subtask
  const addSubtask = () => {
    setNewSubtasks([
      ...newSubtasks,
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
    setNewSubtasks(newSubtasks.filter((_, i) => i !== index))
  }

  // Update a subtask
  const updateSubtask = (index: number, field: string, value: any) => {
    const updatedSubtasks = [...newSubtasks]
    updatedSubtasks[index] = {
      ...updatedSubtasks[index],
      [field]: value,
    }
    setNewSubtasks(updatedSubtasks)
  }

  // Toggle subtask assignee
  const toggleSubtaskAssignee = (subtaskIndex: number, memberId: string) => {
    const updatedSubtasks = [...newSubtasks]
    const currentAssignees = updatedSubtasks[subtaskIndex].assigneeIds

    updatedSubtasks[subtaskIndex].assigneeIds = currentAssignees.includes(memberId)
      ? currentAssignees.filter((id) => id !== memberId)
      : [...currentAssignees, memberId]

    setNewSubtasks(updatedSubtasks)
  }

  // Handle subtask form submission
  const handleSubtaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (newSubtasks.some((st) => !st.title || st.assigneeIds.length === 0)) {
      alert("Please ensure all subtasks have a title and at least one assignee.")
      return
    }

    try {
      // Check if we have a valid task ID
      if (!taskId) {
        throw new Error("Task ID is not available. Please try again.")
      }

      // Create subtasks
      const subtasks = [
        ...(task.subtasks || []),
        ...newSubtasks.map((st) => ({
          id: `${taskId}-sub-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          parentId: taskId,
          title: st.title,
          assigneeIds: st.assigneeIds,
          startDate: st.startDate.toISOString().split("T")[0],
          endDate: st.endDate.toISOString().split("T")[0],
          status: "pending",
          completion: 0,
          requiresAcceptance: st.requiresAcceptance,
          creatorId: user?.id,
          workspaceId: task.workspaceId, // Ensure workspaceId is included
        })),
      ]

      // Update task with new subtasks
      const updatedTask = {
        ...task,
        id: taskId, // Ensure the ID is included
        subtasks,
      }

      await updateTask(taskId, updatedTask, true)
      onUpdate(taskId, updatedTask)

      // Reset form
      setNewSubtasks([])
      setIsAddingSubtask(false)
      setExpandedSubtasks(true) // Expand subtasks to show the newly added ones
    } catch (error) {
      console.error("Error adding subtasks:", error)
      alert(`Error adding subtasks: ${error.message || "Unknown error"}`)
    }
  }

  // Handle task deletion
  const handleDelete = () => {
    if (!taskId || !onDelete) return

    // Close the confirmation dialog
    setShowDeleteConfirm(false)

    // Call the onDelete callback
    onDelete(taskId)
  }

  // Get user name by ID
  const getUserName = (userId: string | number) => {
    const member = staffMembers.find((m) => m.id === userId)
    return member?.name || "Unknown"
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy")
    } catch (e) {
      return dateString
    }
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Get status color for badges
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success text-success-foreground"
      case "in-progress":
        return "bg-primary text-primary-foreground"
      case "pending":
        return "bg-warning text-warning-foreground"
      case "approved":
        return "bg-success text-success-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  // Toggle subtasks expansion
  const toggleSubtasks = () => {
    setExpandedSubtasks(!expandedSubtasks)
  }

  // Calculate subtask statistics
  const getSubtaskStats = () => {
    if (!task.subtasks || task.subtasks.length === 0) return null

    const total = task.subtasks.length
    const completed = task.subtasks.filter((st) => st.status === "completed").length
    const inProgress = task.subtasks.filter((st) => st.status === "in-progress").length
    const pending = task.subtasks.filter((st) => st.status === "pending").length

    return { total, completed, inProgress, pending }
  }

  const subtaskStats = getSubtaskStats()

  const formatAssignees = (assigneeIds: string[] | undefined) => {
    if (!assigneeIds || assigneeIds.length === 0) {
      return "No assignees"
    }
    return assigneeIds.map((id) => getUserName(id)).join(", ")
  }

  useEffect(() => {
    // If this is a subtask, don't allow adding subtasks to it
    if (isSubtask && isAddingSubtask) {
      setIsAddingSubtask(false)
    }
  }, [isSubtask, isAddingSubtask])

  // If we're still creating the task, show a loading state
  if (isCreatingTask) {
    return (
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[700px] p-6 flex flex-col items-center justify-center">
          <DialogDescription>Creating task...</DialogDescription>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mt-4"></div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(open) => {
          // Only close when explicitly requested
          if (!open) {
            onClose()
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px] p-0 h-[80vh] overflow-hidden flex flex-col">
          <DialogDescription className="sr-only">Task details and updates</DialogDescription>
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ProgressIndicator status={task.status} />
              <h2 className="text-xl font-semibold">{task.title}</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="updates">Updates</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="details" className="h-full data-[state=active]:flex flex-col overflow-hidden">
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    {isEditing ? (
                      <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Task Title</Label>
                          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {format(startDate, "PPP")}
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
                            <Label>End Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {format(endDate, "PPP")}
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

                        {!isSubtask && (
                          <>
                            <div className="space-y-2">
                              <Label>Complexity (1-5)</Label>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Low</span>
                                <Slider
                                  value={[complexity]}
                                  min={1}
                                  max={5}
                                  step={1}
                                  onValueChange={(value) => setComplexity(value[0])}
                                  className="flex-1"
                                />
                                <span className="text-sm">High</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Workload (1-5)</Label>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Light</span>
                                <Slider
                                  value={[workload]}
                                  min={1}
                                  max={5}
                                  step={1}
                                  onValueChange={(value) => setWorkload(value[0])}
                                  className="flex-1"
                                />
                                <span className="text-sm">Heavy</span>
                              </div>
                            </div>
                          </>
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                          <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">Save Changes</Button>
                        </div>
                      </form>
                    ) : isAddingSubtask ? (
                      <form onSubmit={handleSubtaskSubmit} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Add Subtasks</h3>
                          <Button type="button" variant="outline" size="sm" onClick={addSubtask}>
                            <Plus className="h-4 w-4 mr-1" /> Add Subtask
                          </Button>
                        </div>

                        {newSubtasks.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <p>No subtasks added yet. Click "Add Subtask" to create one.</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {newSubtasks.map((subtask, index) => (
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
                                      <Label htmlFor={`subtask-${index}-requires-acceptance`}>
                                        Requires Acceptance
                                      </Label>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="w-[200px] text-xs">
                                              When enabled, assignees must accept the subtask before they can start
                                              working on it
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
                                      onClick={() => updateSubtask(index, "assigneeIds", [...task.assigneeIds])}
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
                                    <div className="h-32 border rounded-md p-2 overflow-auto">
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
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsAddingSubtask(false)
                              setNewSubtasks([])
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={
                              newSubtasks.length === 0 ||
                              newSubtasks.some((st) => !st.title || st.assigneeIds.length === 0)
                            }
                          >
                            Add Subtasks
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <Badge className="mt-1">
                              <ProgressIndicator status={task.status} size="sm" className="mr-1" />
                              <span className="capitalize">{task.status.replace("-", " ")}</span>
                            </Badge>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground">Completion</p>
                            <div className="mt-1">
                              <Progress value={task.completion} className="h-2" />
                              <p className="text-sm mt-1">{task.completion}%</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground">Start Date</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{formatDate(task.startDate)}</span>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground">End Date</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{formatDate(task.endDate)}</span>
                            </div>
                          </div>

                          <div className="col-span-2">
                            <p className="text-sm text-muted-foreground">Assignees</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {task.assigneeIds && task.assigneeIds.length > 0
                                  ? task.assigneeIds.map((id) => getUserName(id)).join(", ")
                                  : "No assignees"}
                              </span>
                            </div>
                          </div>

                          {task.description && (
                            <div className="col-span-2">
                              <p className="text-sm text-muted-foreground">Description</p>
                              <p className="mt-1 p-3 bg-muted/30 rounded-md">{task.description}</p>
                            </div>
                          )}

                          {"complexity" in task && "workload" in task && (
                            <>
                              <div>
                                <p className="text-sm text-muted-foreground">Complexity</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <div className="flex gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <div
                                        key={i}
                                        className={`w-5 h-2 rounded-full ${i < (task as Task).complexity ? "bg-primary" : "bg-muted"}`}
                                      ></div>
                                    ))}
                                  </div>
                                  <span className="ml-2 text-sm">{(task as Task).complexity}/5</span>
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-muted-foreground">Workload</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <div className="flex gap-0.5">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <div
                                        key={i}
                                        className={`w-5 h-2 rounded-full ${i < (task as Task).workload ? "bg-primary" : "bg-muted"}`}
                                      ></div>
                                    ))}
                                  </div>
                                  <span className="ml-2 text-sm">{(task as Task).workload}/5</span>
                                </div>
                              </div>

                              <div>
                                <p className="text-sm text-muted-foreground">Burden</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="text-sm font-medium">
                                    {((task as Task).complexity + (task as Task).workload).toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Subtasks Summary Section */}
                        {!isSubtask && (
                          <div className="border rounded-md overflow-hidden">
                            <div
                              className="p-3 bg-muted/30 flex items-center justify-between cursor-pointer"
                              onClick={toggleSubtasks}
                            >
                              <h3 className="font-medium">
                                Subtasks{" "}
                                {task.subtasks && task.subtasks.length > 0 ? `(${task.subtasks.length})` : "(0)"}
                              </h3>
                              <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                                {expandedSubtasks ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </div>

                            {/* Subtasks Summary */}
                            {task.subtasks && task.subtasks.length > 0 ? (
                              <>
                                <div className={`p-3 ${!expandedSubtasks ? "border-t" : ""}`}>
                                  <div className="grid grid-cols-4 gap-2">
                                    <div className="text-center">
                                      <p className="text-sm text-muted-foreground">Total</p>
                                      <p className="font-medium">{subtaskStats?.total}</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-sm text-muted-foreground">Completed</p>
                                      <p className="font-medium text-success">{subtaskStats?.completed}</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-sm text-muted-foreground">In Progress</p>
                                      <p className="font-medium text-primary">{subtaskStats?.inProgress}</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-sm text-muted-foreground">Not Started</p>
                                      <p className="font-medium text-warning">{subtaskStats?.pending}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Expanded Subtasks List */}
                                {expandedSubtasks && (
                                  <div className="border-t">
                                    {task.subtasks.map((subtask) => (
                                      <div key={subtask.id} className="p-3 border-b last:border-b-0">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <ProgressIndicator status={subtask.status} size="sm" />
                                            <span className="font-medium">{subtask.title}</span>
                                          </div>
                                          <Badge className={getStatusColor(subtask.status)}>
                                            {subtask.completion}%
                                          </Badge>
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                          <div>
                                            <span className="text-muted-foreground">Assignees: </span>
                                            {subtask.assigneeIds && subtask.assigneeIds.length > 0
                                              ? subtask.assigneeIds.map((id) => getUserName(id)).join(", ")
                                              : "None"}
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Timeline: </span>
                                            {formatDate(subtask.startDate)} - {formatDate(subtask.endDate)}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="p-4 text-center text-muted-foreground">
                                <p>No subtasks have been added to this task yet.</p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex justify-between gap-2">
                          {canDelete && onDelete && (
                            <Button
                              variant="destructive"
                              onClick={() => setShowDeleteConfirm(true)}
                              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Task
                            </Button>
                          )}

                          <div className="flex gap-2 ml-auto">
                            {canEdit && !isSubtask && (
                              <Button onClick={() => setIsAddingSubtask(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Subtask
                              </Button>
                            )}
                            {canEdit && (
                              <Button onClick={() => setIsEditing(true)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Task
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="updates" className="h-full data-[state=active]:flex flex-col overflow-hidden">
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {task.updates && task.updates.length > 0 ? (
                      task.updates.map((update) => (
                        <div key={update.id} className="border rounded-md p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback>{getUserName(update.userId).charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{getUserName(update.userId)}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(update.timestamp), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>

                          {update.type && update.type !== "comment" && (
                            <Badge variant="outline" className="mb-1 capitalize">
                              {update.type.replace("_", " ")}
                            </Badge>
                          )}

                          <p className="text-sm">{update.text}</p>

                          {update.file && (
                            <div className="mt-2 bg-muted/30 p-2 rounded-md flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{update.file.name}</p>
                                  {update.file.size && (
                                    <p className="text-xs text-muted-foreground">{formatFileSize(update.file.size)}</p>
                                  )}
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" asChild>
                                <a href={update.file.url} target="_blank" rel="noopener noreferrer">
                                  Download
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                        <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-2" />
                        <p>No updates yet</p>
                        <p className="text-sm">Add an update using the form below</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {canEdit && (
                  <div className="border-t p-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="update-text">Add Update</Label>
                        <Textarea
                          id="update-text"
                          placeholder="Add a comment or update..."
                          value={updateText}
                          onChange={(e) => setUpdateText(e.target.value)}
                          className="resize-none mt-2"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Input id="file-input" type="file" className="hidden" onChange={handleFileChange} />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById("file-input")?.click()}
                          className="flex items-center gap-2"
                        >
                          <PaperclipIcon className="h-4 w-4" />
                          {selectedFile ? "Change File" : "Attach File"}
                        </Button>

                        {selectedFile && (
                          <div className="text-sm">
                            <p className="font-medium truncate">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                          </div>
                        )}
                      </div>

                      {isUploading && uploadProgress > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Uploading...</span>
                            <span>{Math.round(uploadProgress)}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-1" />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Completion: {completion}%</Label>
                        <Slider
                          value={[completion]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={(value) => setCompletion(value[0])}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Status</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={status === "pending" ? "default" : "outline"}
                            onClick={() => setStatus("pending")}
                            className={
                              status === "pending" ? "bg-warning text-warning-foreground hover:bg-warning/90" : ""
                            }
                          >
                            <ProgressIndicator status="pending" size="sm" className="mr-1" /> Not Started
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={status === "in-progress" ? "default" : "outline"}
                            onClick={() => setStatus("in-progress")}
                            className={status === "in-progress" ? "bg-primary text-primary-foreground" : ""}
                          >
                            <ProgressIndicator status="in-progress" size="sm" className="mr-1" /> In Progress
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={status === "completed" ? "default" : "outline"}
                            onClick={() => setStatus("completed")}
                            className={
                              status === "completed" ? "bg-success text-success-foreground hover:bg-success/90" : ""
                            }
                          >
                            <ProgressIndicator status="completed" size="sm" className="mr-1" /> Completed
                          </Button>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isUploading || (!updateText.trim() && !selectedFile)}>
                          {isUploading ? "Saving..." : "Save Update"}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Task
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone and will remove all subtasks and
              associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
