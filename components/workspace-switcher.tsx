"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useWorkspace } from "@/contexts/workspace-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Building, ChevronDown, Plus, Settings } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import WorkspaceCreation from "@/components/workspace-creation"

interface WorkspaceSwitcherProps {
  collapsed?: boolean
}

export default function WorkspaceSwitcher({ collapsed = false }: WorkspaceSwitcherProps) {
  const { workspaces, currentWorkspace, setCurrentWorkspaceId, userRole } = useWorkspace()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const router = useRouter()

  // Only owners can access workspace settings
  const isOwner = userRole === "owner"

  if (!currentWorkspace) {
    return (
      <Button variant="outline" size="sm" disabled className="h-9">
        <Building className="mr-2 h-4 w-4" />
        <span>No Workspace</span>
      </Button>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={collapsed ? "w-full px-0" : "h-9"}>
              <Building className={collapsed ? "h-4 w-4" : "mr-2 h-4 w-4"} />
              {!collapsed && (
                <>
                  <span className="truncate max-w-[150px]">{currentWorkspace.name}</span>
                  <ChevronDown className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[220px]">
            <DropdownMenuLabel>Your Workspaces</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => setCurrentWorkspaceId(workspace.id)}
                className={workspace.id === currentWorkspace.id ? "bg-muted" : ""}
              >
                <Building className="mr-2 h-4 w-4" />
                <span className="truncate">{workspace.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Create New Workspace</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Only show settings button to owners */}
        {isOwner && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={(e) => {
              e.preventDefault()
              router.push("/workspace/settings/profile")
            }}
            title="Workspace Settings"
          >
            <Settings size={16} />
          </Button>
        )}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
          </DialogHeader>
          <WorkspaceCreation />
        </DialogContent>
      </Dialog>
    </>
  )
}
