"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function WorkspaceMembersRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new workspace settings page with members tab active
    router.push("/workspace/settings?tab=members")
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}
