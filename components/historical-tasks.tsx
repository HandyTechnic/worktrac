"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Filter, ArrowUpDown, Users } from "lucide-react"
import { ProgressIndicator } from "@/components/progress-indicator"
import { useAuth } from "@/contexts/auth-context"
import { useTasks } from "@/contexts/task-context"
import { useWorkspace } from "@/contexts/workspace-context"
import { getAllUsers } from "@/lib/firebase/auth"
import { formatAssignees } from "@/lib/utils"

export default function HistoricalTasks() {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState("endDate")
  const [sortDirection, setSortDirection] = useState("desc")
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const { user } = useAuth()
  const { tasks } = useTasks()
  const { userRole } = useWorkspace()

  const isManager = userRole === "manager" || userRole === "admin" || userRole === "owner"

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsers = await getAllUsers()
        setUsers(allUsers)
      } catch (error) {
        console.error("Error loading users:", error)
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [])

  // Get historical tasks based on user role
  const getHistoricalTasks = () => {
    if (!tasks) return []

    if (isManager) {
      return tasks.filter((task) => task.status === "approved")
    }
    return tasks.filter((task) => task.status === "approved" && task.assigneeIds.includes(user?.id))
  }

  const approvedTasks = getHistoricalTasks().filter(
    (task) =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assigneeIds.some((id) => {
        const staffMember = users.find((s) => s.id === id)
        return staffMember?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      }),
  )

  // Sort tasks
  const sortedTasks = [...approvedTasks].sort((a, b) => {
    if (sortField === "endDate") {
      const dateA = new Date(a.endDate).getTime()
      const dateB = new Date(b.endDate).getTime()
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA
    }

    if (sortField === "complexity" || sortField === "workload") {
      return sortDirection === "asc" ? a[sortField] - b[sortField] : b[sortField] - a[sortField]
    }

    if (sortField === "assignee") {
      const nameA = formatAssignees(a.assigneeIds, users)
      const nameB = formatAssignees(b.assigneeIds, users)
      return sortDirection === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
    }

    return sortDirection === "asc" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
  })

  // Toggle sort
  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historical Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Historical Tasks</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tasks..."
              className="w-[200px] pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]">Status</TableHead>
              <TableHead>
                <Button variant="ghost" className="p-0 h-8 font-medium" onClick={() => toggleSort("title")}>
                  Task <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" className="p-0 h-8 font-medium" onClick={() => toggleSort("assignee")}>
                  Assignees <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" className="p-0 h-8 font-medium" onClick={() => toggleSort("endDate")}>
                  Completion Date <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" className="p-0 h-8 font-medium" onClick={() => toggleSort("complexity")}>
                  Complexity <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" className="p-0 h-8 font-medium" onClick={() => toggleSort("workload")}>
                  Workload <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.length > 0 ? (
              sortedTasks.map((task) => {
                const hasMultipleAssignees = task.assigneeIds.length > 1

                return (
                  <TableRow key={task.id}>
                    <TableCell>
                      <ProgressIndicator status={task.status} />
                    </TableCell>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {hasMultipleAssignees && <Users className="h-3 w-3 text-muted-foreground" />}
                        <span>{formatAssignees(task.assigneeIds, users)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(task.endDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>{task.complexity}/5</TableCell>
                    <TableCell>{task.workload}/5</TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  No approved tasks found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
