"use client"

import { PageLayout } from "@/components/page-layout"
import StaffOverview from "@/components/staff-overview"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/contexts/workspace-context"
import { Plus } from "lucide-react"
import { useState } from "react"
import TaskCreationDialog from "@/components/task-creation-dialog"

export default function StaffPage() {
  const { userRole } = useWorkspace()
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)

  // Only owners and admins should be able to create tasks from this page
  const canCreateTasks = userRole === "owner" || userRole === "admin"

  return (
    <PageLayout
      title="Staff Overview"
      description="Monitor team workload and task distribution"
      actions={
        canCreateTasks ? (
          <Button onClick={() => setIsTaskDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Assign Task
          </Button>
        ) : undefined
      }
    >
      <StaffOverview />
      {isTaskDialogOpen && <TaskCreationDialog onClose={() => setIsTaskDialogOpen(false)} />}
    </PageLayout>
  )
}
