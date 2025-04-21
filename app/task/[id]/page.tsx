"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useTasks } from "@/contexts/task-context"
import { useWorkspace } from "@/contexts/workspace-context"
import ComprehensiveTaskView from "@/components/comprehensive-task-view"
import { PageLayout } from "@/components/page-layout"

export default function TaskPage({ params }) {
  const { id } = params
  const { user, loading: authLoading } = useAuth()
  const { tasks, loading: tasksLoading } = useTasks()
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace()
  const router = useRouter()
  const [task, setTask] = useState(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (tasks && id) {
      const foundTask = tasks.find((t) => t.id === id)
      if (foundTask) {
        setTask(foundTask)
      } else {
        // Task not found, redirect to home
        router.push("/")
      }
    }
  }, [tasks, id, router])

  if (authLoading || tasksLoading || workspaceLoading || !user || !currentWorkspace) {
    return (
      <div className="flex min-h-screen items-center justify-center w-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex min-h-screen items-center justify-center w-full">
        <div className="text-center">
          <p className="text-muted-foreground">Task not found</p>
        </div>
      </div>
    )
  }

  return (
    <PageLayout title={task.title} description={`Task details and progress tracking`}>
      <ComprehensiveTaskView task={task} />
    </PageLayout>
  )
}
