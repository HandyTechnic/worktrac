"use client"

import { memo } from "react"

// Create a separate component for the staff list to improve performance
function StaffList({ staffMembers, selectedStaff, onSelectStaff }) {
  // Get burden color
  const getBurdenColor = (score) => {
    if (score < 4) return "text-success"
    if (score < 7) return "text-warning"
    return "text-destructive"
  }

  return (
    <div className="divide-y">
      {staffMembers.map((staff) => (
        <button
          key={staff.id}
          className={`w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors ${
            staff.id === selectedStaff ? "bg-muted" : ""
          }`}
          onClick={() => onSelectStaff(staff.id)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              {staff.name.charAt(0)}
            </div>
            <div>
              <p className="font-medium">{staff.name}</p>
              <p className="text-xs text-muted-foreground">{staff.role}</p>
            </div>
          </div>
          <div className={`font-bold ${getBurdenColor(staff.burdenScore)}`}>{staff.burdenScore}</div>
        </button>
      ))}
    </div>
  )
}

export default memo(StaffList)
