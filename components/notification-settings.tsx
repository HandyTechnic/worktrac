"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import {
  type NotificationPreferences,
  defaultNotificationPreferences,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
} from "@/lib/notification-service"
import { AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function NotificationSettings() {
  const { toast } = useToast()
  const { user } = useAuth()
  
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Check if push notifications are supported
  useEffect(() => {
    const checkPushSupport = () => {
      if (!('serviceWorker' in navigator)) {
        setPushSupported(false)
        return
      }
      
      if (!('PushManager' in window)) {
        setPushSupported(false)
        return
      }
      
      setPushSupported(true)
    }
    
    checkPushSupport()
  }, [])
  
  // Load user notification preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return
      
      setLoading(true)
      try {
        // Get notification preferences
        const prefs = await getUserNotificationPreferences(user.id as string)
        setPreferences(prefs)
        
        // Check if push is enabled
        const userDoc = await getDoc(doc(db, "users", user.id as string))
        if (userDoc.exists()) {
          setPushEnabled(!!userDoc.data().pushSubscription)
        }
      } catch (error) {
        console.error("Error loading notification preferences:", error)
        toast({
          title: "Error",
          description: "Failed to load notification preferences.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    
    loadPreferences()
  }, [user, toast])
  
  // Save notification preferences
  const savePreferences = async () => {
    if (!user) return
    
    setSaving(true)
    try {
      await updateUserNotificationPreferences(user.id as string, preferences)
      
      toast({
        title: "Preferences Saved",
        description: "Your notification preferences have been updated.",
      })
    } catch (error) {
      console.error("Error saving notification preferences:", error)
      toast({
        title: "Error",
        description: "Failed to save notification preferences.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }
  
  // Subscribe to push notifications
  const subscribeToPush = async () => {
    if (!user) return
    
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/service-worker.js')
      console.log('Service Worker registered with scope:', registration.scope)
      
      // Request permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Permission not granted for notifications')
      }
      
      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''),
      })
      
      // Save subscription to user document
      const userRef = doc(db, "users", user.id as string)
      await updateDoc(userRef, {
        pushSubscription: JSON.parse(JSON.stringify(subscription))
      })
      
      setPushEnabled(true)
      
      toast({
        title: "Push Notifications Enabled",
        description: "You will now receive push notifications.",
      })
    } catch (error) {
      console.error("Error subscribing to push notifications:", error)
      toast({
        title: "Error",
        description: "Failed to enable push notifications. Please try again.",
        variant: "destructive",
      })
    }
  }
  
  // Unsubscribe from push notifications
  const unsubscribeFromPush = async () => {
    if (!user) return
    
    try {
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready
      
      // Get push subscription
      const subscription = await registration.pushManager.getSubscription()
      
      // Unsubscribe if exists
      if (subscription) {
        await subscription.unsubscribe()
      }
      
      // Remove subscription from user document
      const userRef = doc(db, "users", user.id as string)
      await updateDoc(userRef, {
        pushSubscription: null
      })
      
      setPushEnabled(false)
      
      toast({
        title: "Push Notifications Disabled",
        description: "You will no longer receive push notifications.",
      })
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error)
      toast({
        title: "Error",
        description: "Failed to disable push notifications. Please try again.",
        variant: "destructive",
      })
    }
  }
  
  // Handle preference change
  const handlePreferenceChange = (key: keyof NotificationPreferences, value: string) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
      value: string) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }))
  }
  
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>Manage how and when you receive notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push Notifications Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Push Notifications</h3>
          
          {!pushSupported && (
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Push Notifications Not Supported</AlertTitle>
              <AlertDescription>
                Your browser doesn't support push notifications. Try using a modern browser like Chrome, Firefox, or Edge.
              </AlertDescription>
            </Alert>
          )}
          
          {pushSupported && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications on your device even when you're not using the app
                </p>
              </div>
              <Button 
                variant={pushEnabled ? "destructive" : "default"}
                onClick={pushEnabled ? unsubscribeFromPush : subscribeToPush}
              >
                {pushEnabled ? "Disable" : "Enable"}
              </Button>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Notification Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Choose how you want to receive different types of notifications
          </p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="font-medium">Notification Type</div>
              <div className="font-medium">Delivery Method</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 items-center">
              <Label htmlFor="taskAssignment">Task Assignment</Label>
              <Select 
                value={preferences.taskAssignment} 
                onValueChange={(value) => handlePreferenceChange('taskAssignment', value)}
              >
                <SelectTrigger id="taskAssignment">
                  <SelectValue placeholder="Select delivery method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="push">Push Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="both">Push & Email</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4 items-center">
              <Label htmlFor="taskInvitation">Task Invitations</Label>
              <Select 
                value={preferences.taskInvitation} 
                onValueChange={(value) => handlePreferenceChange('taskInvitation', value)}
              >
                <SelectTrigger id="taskInvitation">
                  <SelectValue placeholder="Select delivery method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="push">Push Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="both">Push & Email</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4 items-center">
              <Label htmlFor="taskCompletion">Task Completion</Label>
              <Select 
                value={preferences.taskCompletion} 
                onValueChange={(value) => handlePreferenceChange('taskCompletion', value)}
              >
                <SelectTrigger id="taskCompletion">
                  <SelectValue placeholder="Select delivery method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="push">Push Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="both">Push & Email</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4 items-center">
              <Label htmlFor="taskApproval">Task Approval</Label>
              <Select 
                value={preferences.taskApproval} 
                onValueChange={(value) => handlePreferenceChange('taskApproval', value)}
              >
                <SelectTrigger id="taskApproval">
                  <SelectValue placeholder="Select delivery method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="push">Push Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="both">Push & Email</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4 items-center">
              <Label htmlFor="workspaceInvitation">Workspace Invitations</Label>
              <Select 
                value={preferences.workspaceInvitation} 
                onValueChange={(value) => handlePreferenceChange('workspaceInvitation', value)}
              >
                <SelectTrigger id="workspaceInvitation">
                  <SelectValue placeholder="Select delivery method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="push">Push Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="both">Push & Email</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4 items-center">
              <Label htmlFor="comments">Comments</Label>
              <Select 
                value={preferences.comments} 
                onValueChange={(value) => handlePreferenceChange('comments', value)}
              >
                <SelectTrigger id="comments">
                  <SelectValue placeholder="Select delivery method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="push">Push Only</SelectItem>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="both">Push & Email</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </CardFooter>
    </Card>
  )
}

// Helper function to convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
