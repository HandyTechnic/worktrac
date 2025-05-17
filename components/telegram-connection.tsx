"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { generateTelegramVerificationCode } from "@/lib/telegram-service"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { TelegramSetupGuide } from "./telegram-setup-guide"

export function TelegramConnection() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [verificationCode, setVerificationCode] = useState<string | null>(null)

  useEffect(() => {
    // Check if user has already connected Telegram
    const checkTelegramConnection = async () => {
      if (!user?.id) return

      try {
        const userRef = doc(db, "users", user.id)
        const userDoc = await getDoc(userRef)

        if (userDoc.exists()) {
          const userData = userDoc.data()
          setIsConnected(!!userData.telegramLinked)
        }
      } catch (error) {
        console.error("Error checking Telegram connection:", error)
      }
    }

    checkTelegramConnection()
  }, [user])

  const handleConnect = async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      // Generate a verification code
      const code = await generateTelegramVerificationCode(user.id)
      setVerificationCode(code)

      toast({
        title: "Verification Code Generated",
        description: "Please send this code to the WorkTrac bot on Telegram.",
      })
    } catch (error) {
      console.error("Error generating verification code:", error)
      toast({
        title: "Error",
        description: "Failed to generate verification code. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      // Call API to disconnect Telegram
      const response = await fetch("/api/telegram/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      })

      if (response.ok) {
        setIsConnected(false)
        setVerificationCode(null)

        toast({
          title: "Telegram Disconnected",
          description: "Your Telegram account has been disconnected.",
        })
      } else {
        throw new Error("Failed to disconnect Telegram")
      }
    } catch (error) {
      console.error("Error disconnecting Telegram:", error)
      toast({
        title: "Error",
        description: "Failed to disconnect Telegram. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Telegram Notifications</CardTitle>
        <CardDescription>Receive notifications directly in Telegram</CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <Alert>
            <AlertDescription>
              Your Telegram account is connected. You will receive notifications via Telegram.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Telegram account to receive notifications directly in Telegram.
            </p>

            <TelegramSetupGuide />

            {verificationCode && (
              <div className="bg-muted p-4 rounded-md mt-4">
                <p className="text-sm font-medium mb-1">Your verification code:</p>
                <p className="text-lg font-bold">{verificationCode}</p>
                <p className="text-xs text-muted-foreground mt-1">This code will expire in 30 minutes</p>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter>
        {isConnected ? (
          <Button variant="destructive" onClick={handleDisconnect} disabled={isLoading}>
            {isLoading ? "Disconnecting..." : "Disconnect Telegram"}
          </Button>
        ) : (
          <Button onClick={handleConnect} disabled={isLoading}>
            {isLoading ? "Generating Code..." : "Connect Telegram"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
