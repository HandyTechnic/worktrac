"use client"

import type { ReactNode } from "react"
import { MainNavigation } from "@/components/main-navigation"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

interface PageLayoutProps {
  children: ReactNode
  title: string
  description?: string
  actions?: ReactNode
  fullWidth?: boolean
}

export function PageLayout({ children, title, description, actions, fullWidth = false }: PageLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Get the sidebar collapsed state from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sidebarCollapsed")
      if (stored) {
        setIsCollapsed(JSON.parse(stored))
      }
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <MainNavigation />

      {/* Main content */}
      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
          isCollapsed ? "md:ml-16" : "md:ml-64",
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{title}</h1>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className={cn("p-4", fullWidth ? "max-w-none" : "max-w-7xl mx-auto")}>{children}</div>
        </main>
      </div>
    </div>
  )
}
