import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ClientLayout } from "@/components/client-layout"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "WorkTrac - Team Work Management",
  description: "A collaborative work management application with Gantt chart interface",
    generator: 'v0.dev'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4f46e5" />
      </head>
      <body className={inter.className}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
