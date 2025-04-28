"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from "react"
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

  // Use refs to track subscription state
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const currentUserIdRef = useRef<string | null>(null)
  const membersLoadedRef = useRef<boolean>(false)

  // Load user's workspaces
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setWorkspaces([])
      setCurrentWorkspace(null)
      setWorkspaceMembers([])
      setUserRole(null)
      setLoading(false)

      // Clean up subscription if user logs out
      if (unsubscribeRef.current) {
        console.log("Unsubscribing from workspaces due to user logout")
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }

      return
    }

    // Skip if we're already subscribed for this user
    if (currentUserIdRef.current === user.id && unsubscribeRef.current) {
      console.log(`Already subscribed to workspaces for user: ${user.id}, skipping redundant subscription`)
      return
    }

    console.log("Loading workspaces for user:", user.id)
    setLoading(true)

    // Clean up previous subscription if it exists
    if (unsubscribeRef.current) {
      console.log("Unsubscribing from workspaces")
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    // Update current user ID ref
    currentUserIdRef.current = user.id

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

    // Store the unsubscribe function
    unsubscribeRef.current = unsubscribe

    return () => {
      // We don't unsubscribe here to prevent the subscription from being torn down
      // when components using this context remount
    }
  }, [user, authLoading])

  // Ensure we clean up on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        console.log("Final cleanup: Unsubscribing from workspaces")
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [])

  const loadWorkspaceRole = useCallback(async (workspaceId: string, userId: string) => {
    try {
      const members = await getWorkspaceMembers(workspaceId)
      const userMember = members.find((member) => member.userId === userId)
      return userMember?.role || null
    } catch (error) {
      console.error("Error loading workspace members:", error)
      return null
    }
  }, [])

  // Load current workspace details when currentWorkspaceId changes
  useEffect(() => {
    if (!currentWorkspaceId || !user) {
      setCurrentWorkspace(null)
      setWorkspaceMembers([])
      setUserRole(null)
      membersLoadedRef.current = false
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
          membersLoadedRef.current = false
          return
        }

        setCurrentWorkspace(workspace)

        // Load user role
        const role = await loadWorkspaceRole(currentWorkspaceId, user.id)
        setUserRole(role)

        // Only load members if they haven't been loaded yet for this workspace
        if (!membersLoadedRef.current) {
          console.log("Loading workspace members for the first time")
          // Get workspace members
          const members = await getWorkspaceMembers(currentWorkspaceId)
          setWorkspaceMembers(members)
          membersLoadedRef.current = true
        }

        // Save current workspace ID to localStorage
        localStorage.setItem("currentWorkspaceId", currentWorkspaceId)

        setLoading(false)
      } catch (error) {
        console.error("Error loading workspace details:", error)
        setCurrentWorkspace(null)
        setWorkspaceMembers([])
        setUserRole(null)
        setLoading(false)
        membersLoadedRef.current = false
      }
    }

    loadWorkspaceDetails()
  }, [currentWorkspaceId, user, loadWorkspaceRole])

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

  const refreshWorkspaces = useCallback(async () => {
    if (!user) return

    try {
      console.log("Manually refreshing workspaces")
      setLoading(true)

      // Directly fetch the workspaces
      const updatedWorkspaces = await getUserWorkspaces(user.id as string)
      setWorkspaces(updatedWorkspaces)

      console.log("Workspaces refreshed:", updatedWorkspaces.length)
      setLoading(false)
    } catch (error) {
      console.error("Error refreshing workspaces:", error)
      setLoading(false)
    }
  }, [user])

  const refreshWorkspaceMembers = useCallback(async () => {
    if (!currentWorkspaceId) return

    try {
      console.log("Manually refreshing workspace members")
      membersLoadedRef.current = false
      const members = await getWorkspaceMembers(currentWorkspaceId)
      setWorkspaceMembers(members)
      membersLoadedRef.current = true
    } catch (error) {
      console.error("Error refreshing workspace members:", error)
    }
  }, [currentWorkspaceId])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      workspaces,
      currentWorkspace,
      workspaceMembers,
      userRole,
      loading,
      setCurrentWorkspaceId,
      refreshWorkspaces,
      refreshWorkspaceMembers,
    }),
    [
      workspaces,
      currentWorkspace,
      workspaceMembers,
      userRole,
      loading,
      setCurrentWorkspaceId,
      refreshWorkspaces,
      refreshWorkspaceMembers,
    ],
  )

  return <WorkspaceContext.Provider value={contextValue}>{children}</WorkspaceContext.Provider>
}

export const useWorkspace = () => useContext(WorkspaceContext)
