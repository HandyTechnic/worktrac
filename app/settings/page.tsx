import type { Metadata } from "next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkspaceProfile } from "@/components/workspace-profile"
import { WorkspaceMembers } from "@/components/workspace-members"
import { WorkspacePermissions } from "@/components/workspace-permissions"

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your workspace settings and preferences",
}

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Workspace Settings</h1>
        <p className="text-muted-foreground">Manage your workspace settings and preferences</p>
      </div>
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="space-y-4">
          <WorkspaceProfile />
        </TabsContent>
        <TabsContent value="members" className="space-y-4">
          <WorkspaceMembers />
        </TabsContent>
        <TabsContent value="permissions" className="space-y-4">
          <WorkspacePermissions />
        </TabsContent>
      </Tabs>
    </div>
  )
}
