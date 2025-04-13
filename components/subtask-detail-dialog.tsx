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
import { ProgressIndicator } from "@/components/progress-indicator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PaperclipIcon, X, Calendar, Users, Edit, FileText, MessageSquare, Trash2, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { useAuth } from "@/contexts/auth-context"
import { uploadFile } from "@/lib/firebase/storage"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getAllUsers } from "@/lib/firebase/auth"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
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
import type { SubTask } from "@/lib/types"

interface SubtaskDetailDialogProps {
  subtask: SubTask
  open: boolean
  onClose: () => void
  onUpdate: (subtaskId: string, parentId: string, updatedSubtask: Partial<SubTask>) => Promise<void>
  onDelete?: (subtaskId: string, parentId: string) => Promise<void>
}

export default function SubtaskDetailDialog({ subtask, open, onClose, onUpdate, onDelete }: SubtaskDetailDialogProps) {
  const [activeTab, setActiveTab] = useState("details")
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(subtask.title)
  const [description, setDescription] = useState(subtask.description || "")
  const [startDate, setStartDate] = useState<Date>(new Date(subtask.startDate))
  const [endDate, setEndDate] = useState<Date>(new Date(subtask.endDate))
  const [updateText, setUpdateText] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [completion, setCompletion] = useState(subtask.completion || 0)
  const [status, setStatus] = useState(subtask.status)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [staffMembers, setStaffMembers] = useState([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { user } = useAuth()

  // Check user permissions
  const isCreator = subtask.creatorId === user?.id
  const isAssignee = subtask.assigneeIds?.includes(user?.id)
  const isManager = user?.userRole === "manager" || user?.userRole === "admin" || user?.userRole === "owner"
  const canEdit = isManager || isCreator || isAssignee
  const canDelete = isManager || isCreator

  // Update form fields when subtask changes
  useEffect(() => {
    setTitle(subtask.title)
    setDescription(subtask.description || "")
    setStartDate(new Date(subtask.startDate))
    setEndDate(new Date(subtask.endDate))
    setCompletion(subtask.completion || 0)
    setStatus(subtask.status)
  }, [subtask])

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

    if (open) {
      loadStaff()
    }
  }, [open])

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
      // Check if we have a valid subtask ID and parent ID
      if (!subtask.id || !subtask.parentId) {
        throw new Error("Subtask or parent ID is not available. Please try again later.")
      }

      let fileData = null

      // Upload file if selected
      if (selectedFile) {
        const path = `tasks/${subtask.parentId}/subtasks/${subtask.id}/${Date.now()}_${selectedFile.name}`
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
        type: status !== subtask.status ? "status_change" : selectedFile ? "file_upload" : "comment",
        file: fileData,
      }

      // Create updated subtask object
      const updatedSubtask = {
        ...subtask,
        completion,
        status,
        updates: [...(subtask.updates || []), newUpdate],
      }

      // Update the subtask
      await onUpdate(subtask.id, subtask.parentId, updatedSubtask)

      // Reset form
      setUpdateText("")
      setSelectedFile(null)
      setUploadProgress(0)

      // Reset file input
      const fileInput = document.getElementById("subtask-file-input") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    } catch (error) {
      console.error("Error updating subtask:", error)
      alert(`Error updating subtask: ${error.message || "Unknown error"}`)
    } finally {
      setIsUploading(false)
    }
  }

  // Handle edit form submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Check if we have a valid subtask ID and parent ID
      if (!subtask.id || !subtask.parentId) {
        throw new Error("Subtask or parent ID is not available. Please try again.")
      }

      const updatedSubtask = {
        ...subtask,
        title,
        description,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      }

      await onUpdate(subtask.id, subtask.parentId, updatedSubtask)
      setIsEditing(false)
    } catch (error) {
      console.error("Error updating subtask:", error)
      alert(`Error updating subtask: ${error.message || "Unknown error"}`)
    }
  }

  // Handle subtask deletion
  const handleDelete = () => {
    if (!subtask.id || !subtask.parentId || !onDelete) return

    // Close the confirmation dialog
    setShowDeleteConfirm(false)

    // Call the onDelete callback
    onDelete(subtask.id, subtask.parentId)
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
        <DialogContent className="sm:max-w-[700px] p-0 max-h-[90vh] flex flex-col">
          <DialogDescription className="sr-only">Subtask details and updates</DialogDescription>
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ProgressIndicator status={subtask.status} />
              <h2 className="text-xl font-semibold">{subtask.title}</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="updates">Updates</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="details" className="h-full data-[state=active]:flex flex-col">
                <ScrollArea className="flex-1 p-4">
                  {isEditing ? (
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Subtask Title</Label>
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

                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Save Changes</Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge className="mt-1">
                            <ProgressIndicator status={subtask.status} size="sm" className="mr-1" />
                            <span className="capitalize">{subtask.status.replace("-", " ")}</span>
                          </Badge>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground">Completion</p>
                          <div className="mt-1">
                            <Progress value={subtask.completion} className="h-2" />
                            <p className="text-sm mt-1">{subtask.completion}%</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground">Start Date</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(subtask.startDate)}</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground">End Date</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(subtask.endDate)}</span>
                          </div>
                        </div>

                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">Assignees</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {subtask.assigneeIds && subtask.assigneeIds.length > 0
                                ? subtask.assigneeIds.map((id) => getUserName(id)).join(", ")
                                : "No assignees"}
                            </span>
                          </div>
                        </div>

                        {subtask.description && (
                          <div className="col-span-2">
                            <p className="text-sm text-muted-foreground">Description</p>
                            <p className="mt-1 p-3 bg-muted/30 rounded-md">{subtask.description}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between gap-2">
                        {canDelete && onDelete && (
                          <Button
                            variant="destructive"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Subtask
                          </Button>
                        )}

                        <div className="flex gap-2 ml-auto">
                          {canEdit && (
                            <Button onClick={() => setIsEditing(true)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Subtask
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="updates" className="h-full data-[state=active]:flex flex-col">
                <div className="flex-1 flex flex-col">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {subtask.updates && subtask.updates.length > 0 ? (
                        subtask.updates.map((update) => (
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
                                      <p className="text-xs text-muted-foreground">
                                        {formatFileSize(update.file.size)}
                                      </p>
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
                          <Input id="subtask-file-input" type="file" className="hidden" onChange={handleFileChange} />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById("subtask-file-input")?.click()}
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
                </div>
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
              Delete Subtask
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this subtask? This action cannot be undone and will remove all associated
              data.
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
