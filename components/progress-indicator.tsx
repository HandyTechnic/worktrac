import { Square, CheckSquare } from "lucide-react"

interface ProgressIndicatorProps {
  status: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function ProgressIndicator({ status, size = "md", className = "" }: ProgressIndicatorProps) {
  const getSize = () => {
    switch (size) {
      case "sm":
        return "h-3 w-3"
      case "lg":
        return "h-5 w-5"
      default:
        return "h-4 w-4"
    }
  }

  const sizeClass = getSize()

  switch (status) {
    case "pending":
      // Empty square for not started
      return <div className={`${sizeClass} border-2 rounded-sm ${className}`} />
    case "in-progress":
      // Half-filled square for in progress
      return (
        <div className={`${sizeClass} relative ${className}`}>
          <div className="absolute inset-0 border-2 rounded-sm" />
          <div
            className="absolute inset-0 bg-primary rounded-sm"
            style={{ clipPath: "polygon(0 0, 0% 100%, 100% 100%)" }}
          />
        </div>
      )
    case "completed":
      // Filled square for completed
      return <div className={`${sizeClass} bg-primary border-2 border-primary rounded-sm ${className}`} />
    case "approved":
      // Checked square for approved
      return <CheckSquare className={`${sizeClass} text-success ${className}`} />
    default:
      return <Square className={`${sizeClass} text-muted-foreground ${className}`} />
  }
}
