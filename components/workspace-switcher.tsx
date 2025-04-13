"use client"

import { useState } from "react"
import { useWorkspace } from "@/contexts/workspace-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Building, ChevronDown, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import WorkspaceCreation from "@/components/workspace-creation"

export default function WorkspaceSwitcher() {
  const { workspaces, currentWorkspace, setCurrentWorkspaceId } = useWorkspace()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Building className="mr-2 h-4 w-4" />
            <span className="truncate max-w-[150px]">{currentWorkspace.name}</span>
            <ChevronDown className="ml-2 h-4 w-4" />
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
