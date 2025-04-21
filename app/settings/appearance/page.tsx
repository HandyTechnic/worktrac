"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Moon, Sun } from "lucide-react"

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { toast } = useToast()
  const { user, loading } = useAuth()
  const router = useRouter()
  const [redirectToLogin, setRedirectToLogin] = useState(false)

  // Wait for component to mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Set the correct tab value when on appearance page
    const tabsList = document.querySelector('[role="tablist"]')
    if (tabsList) {
      const appearanceTab = tabsList.querySelector('[value="appearance"]')
      if (appearanceTab) {
        ;(appearanceTab as HTMLElement).click()
      }
    }
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      setRedirectToLogin(true)
    }
  }, [loading, user])

  useEffect(() => {
    if (redirectToLogin) {
      router.push("/login")
    }
  }, [redirectToLogin, router])

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    toast({
      title: "Theme Updated",
      description: `Theme has been changed to ${newTheme} mode.`,
    })
  }

  if (!mounted || loading) {
    return null // Loading handled by layout
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Appearance</h1>
        <p className="text-muted-foreground">Customize the look and feel</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Theme Settings</CardTitle>
          <CardDescription>Adjust the visual appearance of the application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="theme-toggle">Dark Mode</Label>
              <div className="text-sm text-muted-foreground">Switch between light and dark themes</div>
            </div>
            <div className="flex items-center space-x-2">
              <Sun className="h-5 w-5 text-muted-foreground" />
              <Switch id="theme-toggle" checked={theme === "dark"} onCheckedChange={toggleTheme} />
              <Moon className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
