"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWorkspace } from "@/contexts/workspace-context"

export default function Home() {
  const router = useRouter()
  const { userRole, loading } = useWorkspace()

  useEffect(() => {
    if (!loading) {
      if (userRole === "owner") {
        router.push("/gantt")
      } else {
        router.push("/my-tasks")
      }
    }
  }, [loading, userRole, router])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}
