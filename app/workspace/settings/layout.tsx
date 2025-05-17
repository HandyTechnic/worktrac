"use client"

import { type ReactNode, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building, Users, Shield } from "lucide-react"
import { PageLayout } from "@/components/page-layout"

export default function WorkspaceSettingsLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { currentWorkspace, userRole } = useWorkspace()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }

    // Only owners can access workspace settings
    if (!loading && user && userRole !== "owner") {
      router.push("/")
    }
  }, [loading, user, userRole, router])

  if (loading || !user || !currentWorkspace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  console.log("Current workspace in layout:", currentWorkspace)

  return (
    <PageLayout title="Workspace Settings" description="Manage your workspace settings and preferences">
      <Tabs
        defaultValue={
          pathname.includes("/workspace/settings/members")
            ? "members"
            : pathname.includes("/workspace/settings/permissions")
              ? "permissions"
              : "profile"
        }
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-8">
          <TabsTrigger value="profile" onClick={() => router.push("/workspace/settings/profile")}>
            <Building className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="members" onClick={() => router.push("/workspace/settings/members")}>
            <Users className="h-4 w-4 mr-2" />
            Members
          </TabsTrigger>
          <TabsTrigger value="permissions" onClick={() => router.push("/workspace/settings/permissions")}>
            <Shield className="h-4 w-4 mr-2" />
            Permissions
          </TabsTrigger>
        </TabsList>
        {children}
      </Tabs>
    </PageLayout>
  )
}
