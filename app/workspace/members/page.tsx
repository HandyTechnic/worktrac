"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspace } from "@/contexts/workspace-context"
import WorkspaceMembers from "@/components/workspace-members"
import { PageLayout } from "@/components/page-layout"

export default function WorkspaceMembersPage() {
  const { user, loading: authLoading } = useAuth()
  const { currentWorkspace, userRole, loading: workspaceLoading } = useWorkspace()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  if (authLoading || workspaceLoading || !user || !currentWorkspace) {
    return (
      <div className="flex min-h-screen items-center justify-center w-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <PageLayout title="Workspace Members" description="Manage team members and permissions">
      <WorkspaceMembers />
    </PageLayout>
  )
}
