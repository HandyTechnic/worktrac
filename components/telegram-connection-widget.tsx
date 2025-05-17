"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { MessageSquare } from "lucide-react"

export function TelegramConnectionWidget() {
  const { user } = useAuth()
  const router = useRouter()
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
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
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.id) {
      checkTelegramConnection()
    } else {
      setIsLoading(false)
    }
  }, [user])

  const handleConnectClick = () => {
    router.push("/settings/notifications")
  }

  if (isLoading) {
    return null
  }

  if (isConnected) {
    return null // Don't show the widget if already connected
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Connect Telegram
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground">Get task updates and notifications directly in Telegram.</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" onClick={handleConnectClick} className="w-full">
          Set Up Now
        </Button>
      </CardFooter>
    </Card>
  )
}
