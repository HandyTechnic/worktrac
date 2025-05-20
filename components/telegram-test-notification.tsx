"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

export function TelegramTestNotification() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSending, setIsSending] = useState(false)

  const handleSendTest = async () => {
    if (!user?.id) return

    setIsSending(true)
    try {
      // Use the dedicated API route for testing
      const response = await fetch("/api/telegram/test-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Test notification API error:", errorData)
        throw new Error(errorData.error || "Failed to send test notification")
      }

      toast({
        title: "Test Notification Sent",
        description: "If your Telegram account is connected, you should receive a message shortly.",
      })
    } catch (error) {
      console.error("Error sending test notification:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send test notification. Please check your connection.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Notification</CardTitle>
        <CardDescription>Send a test notification to verify your Telegram connection</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Click the button below to send a test notification to your connected Telegram account.
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSendTest} disabled={isSending}>
          {isSending ? "Sending..." : "Send Test Notification"}
        </Button>
      </CardFooter>
    </Card>
  )
}
