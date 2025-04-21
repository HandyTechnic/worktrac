"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center p-4">
      <div className="space-y-4 max-w-md">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">404</h1>
        <h2 className="text-xl font-semibold">Page not found</h2>
        <p className="text-muted-foreground">
          Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or never existed.
        </p>
        <div className="flex justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button size="sm" variant="default" onClick={() => history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  )
}
