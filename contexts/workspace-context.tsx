"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import {
  getUserWorkspaces,
  getWorkspace,
  getWorkspaceMembers,
  subscribeToUserWorkspaces,
} from "@/lib/firebase/workspace"
import type { Workspace, WorkspaceMember, WorkspaceRole } from "@/lib/types"

type WorkspaceContextType = {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  workspaceMembers: WorkspaceMember[]
  userRole: WorkspaceRole | null
  loading: boolean
  setCurrentWorkspaceId: (workspaceId: string) => void
  refreshWorkspaces: () => Promise<void>
  refreshWorkspaceMembers: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  currentWorkspace: null,
  workspaceMembers: [],
  userRole: null,
  loading: true,
  setCurrentWorkspaceId: () => {},
  refreshWorkspaces: async () => {},
  refreshWorkspaceMembers: async () => {},
})

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null)
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([])
  const [userRole, setUserRole] = useState<WorkspaceRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [forceRefresh, setForceRefresh] = useState(0)

  // Load user's workspaces
  useEffect(() => {
    if (authLoading || !user) {
      setWorkspaces([])
      setCurrentWorkspace(null)
      setWorkspaceMembers([])
      setUserRole(null)
      setLoading(false)
      return
    }

    console.log("Loading workspaces for user:", user.id)
    setLoading(true)

    // Subscribe to user's workspaces
    const unsubscribe = subscribeToUserWorkspaces(user.id as string, (updatedWorkspaces) => {
      console.log("Received workspaces from subscription:", updatedWorkspaces.length)
      setWorkspaces(updatedWorkspaces)

      // If we have workspaces but no current workspace is selected, select the first one
      if (updatedWorkspaces.length > 0 && !currentWorkspaceId) {
        // Get the saved workspace ID from localStorage
        const savedWorkspaceId = localStorage.getItem("currentWorkspaceId")

        // Check if the saved workspace is in the user's workspaces
        if (savedWorkspaceId && updatedWorkspaces.some((w) => w.id === savedWorkspaceId)) {
          console.log("Using saved workspace ID from localStorage:", savedWorkspaceId)
          setCurrentWorkspaceId(savedWorkspaceId)
        } else {
          console.log("No valid saved workspace, using first workspace:", updatedWorkspaces[0].id)
          setCurrentWorkspaceId(updatedWorkspaces[0].id)
        }
      } else if (updatedWorkspaces.length === 0) {
        // If user has no workspaces, clear current workspace
        console.log("User has no workspaces, clearing current workspace")
        setCurrentWorkspace(null)
        setCurrentWorkspaceId(null)
        localStorage.removeItem("currentWorkspaceId")
      }

      setLoading(false)
    })

    return () => {
      console.log("Unsubscribing from workspaces")
      unsubscribe()
    }
  }, [user, authLoading, forceRefresh])

  // Load current workspace details when currentWorkspaceId changes
  useEffect(() => {
    if (!currentWorkspaceId || !user) {
      setCurrentWorkspace(null)
      setWorkspaceMembers([])
      setUserRole(null)
      return
    }

    const loadWorkspaceDetails = async () => {
      try {
        console.log("Loading details for workspace:", currentWorkspaceId)
        setLoading(true)

        // Get workspace details
        const workspace = await getWorkspace(currentWorkspaceId)

        if (!workspace) {
          console.log("Workspace not found, clearing current workspace")
          setCurrentWorkspace(null)
          setWorkspaceMembers([])
          setUserRole(null)
          localStorage.removeItem("currentWorkspaceId")
          setLoading(false)
          return
        }

        setCurrentWorkspace(workspace)

        // Get workspace members
        const members = await getWorkspaceMembers(currentWorkspaceId)
        setWorkspaceMembers(members)

        // Check if user is actually a member of this workspace
        const userMember = members.find((member) => member.userId === user.id)

        if (!userMember) {
          console.log("User is not a member of this workspace, clearing current workspace")
          setCurrentWorkspace(null)
          setWorkspaceMembers([])
          setUserRole(null)
          localStorage.removeItem("currentWorkspaceId")
          setLoading(false)
          return
        }

        // Get user's role in this workspace
        setUserRole(userMember.role)
        console.log("User role in workspace:", userMember.role)

        // Save current workspace ID to localStorage
        localStorage.setItem("currentWorkspaceId", currentWorkspaceId)

        setLoading(false)
      } catch (error) {
        console.error("Error loading workspace details:", error)
        setCurrentWorkspace(null)
        setWorkspaceMembers([])
        setUserRole(null)
        setLoading(false)
      }
    }

    loadWorkspaceDetails()
  }, [currentWorkspaceId, user])

  // Load current workspace ID from localStorage on initial load
  useEffect(() => {
    if (!currentWorkspaceId && workspaces.length > 0 && !loading) {
      const savedWorkspaceId = localStorage.getItem("currentWorkspaceId")

      // Check if the saved workspace is in the user's workspaces
      if (savedWorkspaceId && workspaces.some((w) => w.id === savedWorkspaceId)) {
        console.log("Setting workspace from localStorage:", savedWorkspaceId)
        setCurrentWorkspaceId(savedWorkspaceId)
      } else {
        // Otherwise use the first workspace
        console.log("Setting first workspace as current:", workspaces[0].id)
        setCurrentWorkspaceId(workspaces[0].id)
      }
    }
  }, [workspaces, currentWorkspaceId, loading])

  const refreshWorkspaces = async () => {
    if (!user) return

    try {
      console.log("Manually refreshing workspaces")
      setLoading(true)

      // Force the subscription to refresh by incrementing the forceRefresh counter
      setForceRefresh((prev) => prev + 1)

      // Also directly fetch the workspaces
      const updatedWorkspaces = await getUserWorkspaces(user.id as string)
      setWorkspaces(updatedWorkspaces)

      console.log("Workspaces refreshed:", updatedWorkspaces.length)
      setLoading(false)
    } catch (error) {
      console.error("Error refreshing workspaces:", error)
      setLoading(false)
    }
  }

  const refreshWorkspaceMembers = async () => {
    if (!currentWorkspaceId) return

    try {
      console.log("Manually refreshing workspace members")
      const members = await getWorkspaceMembers(currentWorkspaceId)
      setWorkspaceMembers(members)
    } catch (error) {
      console.error("Error refreshing workspace members:", error)
    }
  }

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        workspaceMembers,
        userRole,
        loading,
        setCurrentWorkspaceId,
        refreshWorkspaces,
        refreshWorkspaceMembers,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export const useWorkspace = () => useContext(WorkspaceContext)
