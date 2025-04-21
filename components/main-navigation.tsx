"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useWorkspace } from "@/contexts/workspace-context"
import WorkspaceSwitcher from "@/components/workspace-switcher"
import {
  LayoutDashboard,
  BarChart3,
  Users,
  History,
  Menu,
  ChevronLeft,
  ChevronRight,
  Bell,
  User,
  CheckSquare,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function MainNavigation() {
  const { user, signOut } = useAuth()
  const { currentWorkspace, userRole } = useWorkspace()
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Check if user is owner
  const isOwner = userRole === "owner"

  // Check if user is owner or admin
  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin"

  useEffect(() => {
    // Load collapsed state from localStorage
    const savedCollapsed = localStorage.getItem("sidebarCollapsed")
    if (savedCollapsed !== null) {
      setIsCollapsed(savedCollapsed === "true")
    }

    // Close mobile menu when route changes
    setIsMobileOpen(false)
  }, [pathname])

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem("sidebarCollapsed", String(newState))
  }

  // Build navigation items based on user role
  const navItems = [
    {
      name: "Gantt Chart",
      href: "/gantt",
      icon: BarChart3,
      active: pathname === "/gantt",
    },
    // Dashboard is a separate page from Staff Overview
    ...(isOwner
      ? [
          {
            name: "Dashboard",
            href: "/dashboard", // Update to correct path if needed
            icon: LayoutDashboard,
            active: pathname === "/dashboard",
          },
        ]
      : []),
    // Staff Overview is its own separate page
    ...(isOwnerOrAdmin
      ? [
          {
            name: "Staff Overview",
            href: "/staff",
            icon: Users,
            active: pathname === "/staff",
          },
        ]
      : []),
    {
      name: "My Tasks",
      href: "/my-tasks",
      icon: CheckSquare,
      active: pathname === "/my-tasks",
    },
    {
      name: "Historical",
      href: "/historical",
      icon: History,
      active: pathname === "/historical",
    },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Mobile menu button */}
      <button
        className="fixed left-4 top-4 z-50 rounded-md bg-primary p-2 text-white md:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        <Menu size={20} />
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-background transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="font-bold">WorkTrac</div>
            </div>
          )}
          <button onClick={toggleCollapsed} className="ml-auto rounded-md p-1 hover:bg-muted">
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Workspace switcher */}
        <div className="border-b border-border p-2">
          {isCollapsed ? (
            <div className="flex justify-center py-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-medium">{currentWorkspace?.name?.charAt(0) || "W"}</span>
              </div>
            </div>
          ) : (
            <WorkspaceSwitcher />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
                    item.active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                    isCollapsed && "justify-center px-2",
                  )}
                >
                  <item.icon size={20} />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-2">
          <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <div className="font-medium">{user?.name}</div>
                  <div className="text-xs text-muted-foreground">{userRole}</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-1">
              {isCollapsed ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <User size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/profile")}>Profile</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut?.()}>Log out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                        <Bell size={18} />
                        <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary"></span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <div className="text-xs text-center py-2 text-muted-foreground">No new notifications</div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Settings size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push("/profile")}>Profile</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => signOut?.()}>Log out</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
