"use client"

import { PageLayout } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/contexts/workspace-context"
import { Plus } from "lucide-react"
import { useState, useCallback } from "react"
import TaskCreationDialog from "@/components/task-creation-dialog"
import OptimizedStaffOverview from "@/components/optimized-staff-overview"

export default function StaffPage() {
  const { userRole } = useWorkspace()
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)

  // Only owners and admins should be able to create tasks from this page
  const canCreateTasks = userRole === "owner" || userRole === "admin"

  // Use useCallback to prevent unnecessary re-renders
  const handleOpenTaskDialog = useCallback(() => {
    setIsTaskDialogOpen(true)
  }, [])

  const handleCloseTaskDialog = useCallback(() => {
    setIsTaskDialogOpen(false)
  }, [])

  return (
    <PageLayout
      title="Staff Overview"
      description="Monitor team workload and task distribution"
      actions={
        canCreateTasks ? (
          <Button onClick={handleOpenTaskDialog}>
            <Plus className="mr-2 h-4 w-4" /> Assign Task
          </Button>
        ) : undefined
      }
    >
      <OptimizedStaffOverview />
      {isTaskDialogOpen && <TaskCreationDialog onClose={handleCloseTaskDialog} />}
    </PageLayout>
  )
}
