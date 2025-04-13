"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { Building, Briefcase, Users } from "lucide-react"
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

export default function WorkspaceCreation() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Improve the handleSubmit function to ensure proper workspace creation and membership

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a workspace",
        variant: "destructive",
      })
      return
    }

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Workspace name is required",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      console.log("Creating workspace for user:", user.id)

      // Create workspace document directly
      const workspaceRef = doc(collection(db, "workspaces"))
      const workspaceId = workspaceRef.id

      // Set workspace data
      await setDoc(workspaceRef, {
        id: workspaceId,
        name,
        description: description || "",
        ownerId: user.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        settings: {},
      })

      console.log("Workspace created with ID:", workspaceId)

      // Add owner as a member
      const memberRef = doc(collection(db, "workspaceMembers"))
      await setDoc(memberRef, {
        workspaceId,
        userId: user.id,
        role: "owner",
        joinedAt: serverTimestamp(),
      })

      console.log("Owner added as workspace member")

      // Set the current workspace ID in localStorage
      localStorage.setItem("currentWorkspaceId", workspaceId)

      toast({
        title: "Workspace Created",
        description: "Your workspace has been created successfully.",
      })

      // Wait a moment before redirecting
      setTimeout(() => {
        window.location.href = "/" // Force a full page reload
      }, 1000)
    } catch (error) {
      console.error("Error creating workspace:", error)
      toast({
        title: "Error",
        description: "Failed to create workspace. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Create Your Workspace</CardTitle>
        <CardDescription>A workspace is where you and your team will manage tasks and collaborate</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Team" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does your team work on?"
              rows={3}
            />
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-3 mt-4">
            <h3 className="font-medium flex items-center">
              <Building className="h-4 w-4 mr-2" />
              What is a workspace?
            </h3>
            <p className="text-sm text-muted-foreground">
              A workspace is a shared environment where you and your team can:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start">
                <Briefcase className="h-4 w-4 mr-2 mt-0.5" />
                <span>Manage and track tasks with the Gantt chart</span>
              </li>
              <li className="flex items-start">
                <Users className="h-4 w-4 mr-2 mt-0.5" />
                <span>Invite team members and assign them tasks</span>
              </li>
            </ul>
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Workspace"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
