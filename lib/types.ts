// Define types for the application

export type Role = "user" | "manager" | "admin"

export type UserStatus = "pending" | "approved" | "rejected"

export type WorkspaceRole = "owner" | "admin" | "manager" | "member"

export type StaffMember = {
  id: number | string
  name: string
  email?: string
  role: string
  userRole: Role
  status?: UserStatus
  department?: string
  bio?: string
  hasCompletedOnboarding?: boolean
  preferences?: {
    notifications?: string
    showCompletedTasks?: boolean
    defaultView?: string
  }
  // Add fields for name formatting
  preferredName?: string
  fullName?: string
  formattedName?: string
}

export type TaskStatus = "pending" | "in-progress" | "completed" | "approved" | "rejected"

export type TaskUpdate = {
  id: number | string
  text: string
  timestamp: string
  userId: number | string
  type?: "comment" | "status_change" | "approval" | "rejection" | "update" | "file_upload" // Added file_upload type
  file?: {
    name: string
    url: string
    path?: string
    size?: number
    type?: string
    uploadedBy: number | string
    uploadedAt: string
  }
}

export type TaskFile = {
  id: number
  name: string
  url: string
  uploadedBy: number
  uploadedAt: string
}

export type SubTask = {
  id: number | string
  parentId: number | string
  creatorId: string // Added to track who created the subtask
  title: string
  description?: string
  assigneeIds: (number | string)[]
  startDate: string
  endDate: string
  status: TaskStatus
  completion: number
  requiresAcceptance?: boolean // Added to determine if acceptance is required
}

export type Task = {
  id: number | string
  workspaceId: string
  creatorId: string // Added to track who created the task
  title: string
  description?: string
  assigneeIds: (number | string)[]
  startDate: string
  endDate: string
  status: TaskStatus
  completion: number
  complexity: number
  workload: number
  requiresApproval?: boolean // Added to determine if manager approval is needed
  updates: TaskUpdate[]
  files?: TaskFile[]
  subtasks?: SubTask[]
  isExpanded?: boolean
}

export type Workspace = {
  id: string
  name: string
  description?: string
  ownerId: string
  createdAt: string | Date
  settings?: {
    defaultView?: string
    showCompletedTasks?: boolean
    notificationPreference?: string
  }
}

export type WorkspaceMember = {
  id: string
  userId: string
  workspaceId: string
  role: WorkspaceRole
  joinedAt: string | Date
}

export type WorkspaceInvitation = {
  id: string
  email: string
  workspaceId: string
  role: WorkspaceRole
  invitedBy: string
  status: "pending" | "accepted" | "expired"
  createdAt: string | Date
  expiresAt: string | Date
}

export type TaskInvitation = {
  id: string
  taskId: string
  subtaskId?: string
  inviterId: string
  inviteeId: string
  status: "pending" | "accepted" | "declined"
  createdAt: string | Date
  respondedAt?: string | Date
}

export type NotificationType =
  | "workspace_invitation"
  | "task_invitation"
  | "subtask_invitation"
  | "task_approval_request"
  | "task_approved"
  | "task_rejected"
  | "task_completed"
  | "task_assigned"
  | "comment_added"

export type Notification = {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  actionUrl?: string
  relatedId?: string // ID of related task, workspace, etc.
  createdAt: string | Date
  metadata?: Record<string, any> // Additional data specific to notification type
}
