"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Settings, Users, Building, Shield, AlertCircle } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import WorkspaceProfile from "@/components/workspace-profile"
import WorkspaceMembers from "@/components/workspace-members"
import WorkspacePermissions from "@/components/workspace-permissions"

export default function WorkspaceSettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const { currentWorkspace, userRole, loading: workspaceLoading } = useWorkspace()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("profile")

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  // Redirect to dashboard if no workspace
  useEffect(() => {
    if (!workspaceLoading && !currentWorkspace) {
      router.push("/")
    }
  }, [workspaceLoading, currentWorkspace, router])

  // Check if user has permission to access settings
  const canAccessSettings = userRole === "owner" || userRole === "admin"

  if (authLoading || workspaceLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!canAccessSettings) {
    return (
      <div className="container mx-auto p-4 max-w-[1200px]">
        <Button variant="ghost" className="mb-6" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access workspace settings. Only workspace owners and administrators can access
            this page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-[1200px]">
      <Button variant="ghost" className="mb-6" onClick={() => router.push("/")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <div className="flex items-center mb-6">
        <Settings className="h-6 w-6 text-primary mr-2" />
        <h1 className="text-2xl font-bold">Workspace Settings</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b">
              <div className="flex overflow-x-auto">
                <TabsList className="bg-transparent p-0 h-auto">
                  <TabsTrigger
                    value="profile"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
                  >
                    <Building className="h-4 w-4 mr-2" />
                    Workspace Profile
                  </TabsTrigger>
                  <TabsTrigger
                    value="members"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Members
                  </TabsTrigger>
                  {userRole === "owner" && (
                    <TabsTrigger
                      value="permissions"
                      className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Permissions
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
            </div>

            <div className="p-6">
              <TabsContent value="profile" className="mt-0">
                <WorkspaceProfile />
              </TabsContent>

              <TabsContent value="members" className="mt-0">
                <WorkspaceMembers />
              </TabsContent>

              <TabsContent value="permissions" className="mt-0">
                <WorkspacePermissions />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
