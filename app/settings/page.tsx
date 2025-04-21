"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function SettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    } else if (!loading && user) {
      router.push("/profile")
    }
  }, [loading, user, router])

  return null // Loading handled by layout
}
