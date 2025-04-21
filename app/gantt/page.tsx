"use client"

import { useState, useEffect } from "react"
import { useWorkspace } from "@/contexts/workspace-context"
import { PageLayout } from "@/components/page-layout"
import GanttChart from "@/components/gantt-chart"
import PeopleGanttChart from "@/components/people-gantt-chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function GanttPage() {
  const { userRole } = useWorkspace()
  const isOwner = userRole === "owner"
  const [activeView, setActiveView] = useState(isOwner ? "people" : "tasks")

  // Set default view based on role and URL parameters
  useEffect(() => {
    // Check if there's a view parameter in the URL
    const searchParams = new URLSearchParams(window.location.search)
    const viewParam = searchParams.get("view")

    if (viewParam === "people" || viewParam === "tasks") {
      setActiveView(viewParam)
      localStorage.setItem("ganttView", viewParam)
    } else {
      // Check if there's a saved preference
      const savedView = localStorage.getItem("ganttView")
      if (savedView) {
        setActiveView(savedView)
      } else if (isOwner) {
        setActiveView("people")
      }
    }
  }, [isOwner])

  // Save view preference
  const handleViewChange = (view) => {
    setActiveView(view)
    localStorage.setItem("ganttView", view)
  }

  return (
    <PageLayout title="Gantt Chart" description="Visualize project timeline and task dependencies" fullWidth>
      <div className="p-4">
        <Tabs value={activeView} onValueChange={handleViewChange} className="w-full">
          <TabsList className="mb-4">
            {(!isOwner || activeView === "tasks") && <TabsTrigger value="tasks">Tasks View</TabsTrigger>}
            <TabsTrigger value="people">People View</TabsTrigger>
          </TabsList>
          <TabsContent value="tasks" className="mt-0">
            <GanttChart />
          </TabsContent>
          <TabsContent value="people" className="mt-0">
            <PeopleGanttChart />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  )
}
