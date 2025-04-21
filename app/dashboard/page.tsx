"use client"

import { PageLayout } from "@/components/page-layout"
import Dashboard from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useState } from "react"
import TaskCreationDialog from "@/components/task-creation-dialog"
import { useWorkspace } from "@/contexts/workspace-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function DashboardPage() {
  const { userRole, loading } = useWorkspace()
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const router = useRouter()

  // Check if user is owner
  const isOwner = userRole === "owner"

  // Redirect non-owners away from this page
  useEffect(() => {
    if (!loading && !isOwner) {
      router.push("/my-tasks")
    }
  }, [loading, isOwner, router])

  if (!isOwner) {
    return null // Will be redirected by the useEffect
  }

  return (
    <PageLayout
      title="Dashboard"
      description="Overview of your workspace tasks and activities"
      actions={
        <Button onClick={() => setIsTaskDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Task
        </Button>
      }
    >
      <Dashboard />
      {isTaskDialogOpen && <TaskCreationDialog onClose={() => setIsTaskDialogOpen(false)} />}
    </PageLayout>
  )
}
