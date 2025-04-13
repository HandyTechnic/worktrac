"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function TaskPage({ params }) {
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard - we're using dialogs instead of full pages
    router.push("/")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-2">Redirecting...</span>
    </div>
  )
}
