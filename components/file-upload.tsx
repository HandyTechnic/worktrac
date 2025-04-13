"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addTaskFile } from "@/lib/firebase/db"
import { useAuth } from "@/contexts/auth-context"
import { Upload, Check, AlertCircle } from "lucide-react"

interface FileUploadProps {
  taskId: string
}

export function FileUpload({ taskId }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const { user } = useAuth()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setUploadStatus("idle")
      setErrorMessage("")
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !user) return

    try {
      setUploading(true)
      setUploadStatus("idle")

      // Create file data object
      const fileData = {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        uploadedBy: user.id,
        uploadedAt: new Date().toISOString(),
        url: URL.createObjectURL(selectedFile), // In a real app, you'd upload to storage and get a URL
      }

      // Add file to database
      await addTaskFile(taskId, fileData)

      setUploadStatus("success")
      setSelectedFile(null)

      // Reset the file input
      const fileInput = document.getElementById("file-upload") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    } catch (error) {
      console.error("Error uploading file:", error)
      setUploadStatus("error")
      setErrorMessage("Failed to upload file. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4 border rounded-lg p-4">
      <div className="space-y-2">
        <Label htmlFor="file-upload">Upload File</Label>
        <div className="flex items-center gap-2">
          <Input id="file-upload" type="file" onChange={handleFileChange} className="flex-1" />
          <Button onClick={handleUpload} disabled={!selectedFile || uploading} className="whitespace-nowrap">
            {uploading ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </div>
      </div>

      {uploadStatus === "success" && (
        <div className="flex items-center text-sm text-green-600 bg-green-50 p-2 rounded">
          <Check className="mr-2 h-4 w-4" />
          File uploaded successfully!
        </div>
      )}

      {uploadStatus === "error" && (
        <div className="flex items-center text-sm text-red-600 bg-red-50 p-2 rounded">
          <AlertCircle className="mr-2 h-4 w-4" />
          {errorMessage}
        </div>
      )}

      {selectedFile && (
        <div className="text-sm text-muted-foreground">
          Selected file: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
        </div>
      )}
    </div>
  )
}
