"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import GanttChart from "@/components/gantt-chart"
import PeopleGanttChart from "@/components/people-gantt-chart"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspace } from "@/contexts/workspace-context"

export default function GanttPage() {
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const [view, setView] = useState<"tasks" | "people">("tasks")

  // Set default view based on user role
  useEffect(() => {
    // Check if user is a workspace owner or manager
    const isOwnerOrManager = user?.userRole === "owner" || user?.userRole === "admin" || user?.userRole === "manager"

    // Set default view based on role
    setView(isOwnerOrManager ? "people" : "tasks")

    // Hide people view option for regular members
    if (!isOwnerOrManager && view === "people") {
      setView("tasks")
    }
  }, [user, view])

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">Gantt Chart</h1>
        <Tabs value={view} onValueChange={(v) => setView(v as "tasks" | "people")}>
          <TabsList>
            <TabsTrigger value="tasks">Tasks View</TabsTrigger>
            {(user?.userRole === "owner" || user?.userRole === "admin" || user?.userRole === "manager") && (
              <TabsTrigger value="people">People View</TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </header>

      {view === "tasks" ? <GanttChart /> : <PeopleGanttChart />}
    </div>
  )
}
