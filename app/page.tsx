"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { useTasks } from "@/contexts/task-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building, Plus, AlertCircle, Cog } from "lucide-react"
import WorkspaceCreation from "@/components/workspace-creation"
import WorkspaceSwitcher from "@/components/workspace-switcher"
import SettingsDropdown from "@/components/settings-dropdown"
import TaskInvitations from "@/components/task-invitations"
import ApprovalNotifications from "@/components/approval-notifications"
import GanttChart from "@/components/gantt-chart"
import PeopleGanttChart from "@/components/people-gantt-chart"
import Dashboard from "@/components/dashboard"
import StaffOverview from "@/components/staff-overview"
import HistoricalTasks from "@/components/historical-tasks"
import MyTasks from "@/components/my-tasks"
import { NotificationCenter } from "@/components/notification-center"

export default function WorkManagement() {
  const [activeTab, setActiveTab] = useState("gantt")
  const { user, loading: authLoading } = useAuth()
  const { currentWorkspace, userRole, loading: workspaceLoading, workspaces } = useWorkspace()
  const { loading: tasksLoading } = useTasks()
  const router = useRouter()
  const [showWorkspaceCreation, setShowWorkspaceCreation] = useState(false)
  const [ganttView, setGanttView] = useState<"tasks" | "people">("tasks")
  const isManager = userRole === "manager" || userRole === "admin" || userRole === "owner"

  // Update the useEffect hook to redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  // Update the useEffect hook to redirect to onboarding if user hasn't completed it
  useEffect(() => {
    if (!authLoading && user && !user.hasCompletedOnboarding) {
      router.push("/onboarding")
    }
  }, [authLoading, user, router])

  // Add this effect after the other useEffect hooks
  useEffect(() => {
    // If user is not a manager but somehow has people view selected, reset to tasks view
    if (!isManager && ganttView === "people") {
      setGanttView("tasks")
    }
  }, [isManager, ganttView])

  if (authLoading || tasksLoading || workspaceLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center w-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Update the conditional rendering for no workspace
  if (!currentWorkspace) {
    // Check if workspaces are still loading
    if (workspaceLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading workspaces...</p>
          </div>
        </div>
      )
    }

    // If workspaces are loaded but there are none, show workspace creation
    if (workspaces.length === 0) {
      return (
        <div className="flex min-h-screen items-center justify-center w-full p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">Create Your First Workspace</CardTitle>
              <CardDescription>You need to create a workspace to start using WorkTrac</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showWorkspaceCreation ? (
                <WorkspaceCreation />
              ) : (
                <>
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <Building className="h-12 w-12 mx-auto text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">
                      A workspace is where you and your team will manage tasks and collaborate
                    </p>
                  </div>
                  <Button onClick={() => setShowWorkspaceCreation(true)} className="w-full">
                    <Plus className="h-4 w-4 mr-2" /> Create Workspace
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    // If there are workspaces but no current workspace, show an error
    return (
      <div className="flex min-h-screen items-center justify-center w-full p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Workspace Error</CardTitle>
            <CardDescription>Unable to access workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 p-4 rounded-lg text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-2" />
              <p className="text-sm text-muted-foreground">
                There was an error accessing your workspace. Please try refreshing the page or create a new workspace.
              </p>
            </div>
            <Button onClick={() => setShowWorkspaceCreation(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Create New Workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-full">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">WorkTrac</h1>
            <p className="text-sm text-muted-foreground">
              Track tasks, manage workloads, and collaborate with your team
            </p>
          </div>
          <WorkspaceSwitcher />
          {currentWorkspace && (userRole === "owner" || userRole === "admin") && (
            <Button variant="outline" size="sm" className="ml-2" onClick={() => router.push("/workspace/settings")}>
              <Cog className="h-4 w-4 mr-2" />
              Workspace Settings
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Logged in as: </span>
            <span className="font-medium">{user.name}</span>
            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
              {userRole}
            </span>
          </div>
          <NotificationCenter />
          <SettingsDropdown />
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="p-4 space-y-4 h-full flex flex-col">
          {/* Notifications */}
          <TaskInvitations />
          <ApprovalNotifications />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <TabsList className="grid grid-cols-4 w-full max-w-3xl">
                <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
                {isManager && (
                  <>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="staff">Staff Overview</TabsTrigger>
                    <TabsTrigger value="historical">Historical</TabsTrigger>
                  </>
                )}
                {!isManager && (
                  <>
                    <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
                    <TabsTrigger value="historical">Historical</TabsTrigger>
                  </>
                )}
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto mt-4">
              <TabsContent value="gantt" className="h-full data-[state=active]:flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={ganttView === "tasks" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGanttView("tasks")}
                    >
                      Tasks View
                    </Button>
                    {isManager && (
                      <Button
                        variant={ganttView === "people" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setGanttView("people")}
                      >
                        People View
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  {ganttView === "tasks" || !isManager ? <GanttChart /> : <PeopleGanttChart />}
                </div>
              </TabsContent>

              {isManager && (
                <>
                  <TabsContent value="dashboard" className="h-full data-[state=active]:flex flex-col">
                    <Dashboard />
                  </TabsContent>

                  <TabsContent value="staff" className="h-full data-[state=active]:flex flex-col">
                    <StaffOverview />
                  </TabsContent>
                </>
              )}

              <TabsContent value="historical" className="h-full data-[state=active]:flex flex-col">
                <HistoricalTasks />
              </TabsContent>

              {!isManager && (
                <TabsContent value="my-tasks" className="h-full data-[state=active]:flex flex-col">
                  <MyTasks />
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
