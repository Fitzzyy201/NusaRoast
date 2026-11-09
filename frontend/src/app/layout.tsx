import type { Metadata } from "next"
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google"
import { Suspense } from "react"
import "./globals.css"
import { HashScroll } from "@/components/ui/hash-scroll"
import { Navbar } from "@/components/ui/navbar"
import { RoleGuard } from "@/components/auth/role-guard"

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
})

export const metadata: Metadata = {
  title: "NusaRoast | Kopi Specialty Indonesia",
  description:
    "Biji kopi specialty dari berbagai daerah Indonesia dengan cita rasa autentik.",
}

function NavbarSuspenseFallback() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="font-display text-2xl font-semibold text-primary">NusaRoast</div>
        <div className="flex items-center gap-3">
          <span className="h-9 w-20 rounded-md bg-card" />
          <span className="h-9 w-9 rounded-md bg-card" />
        </div>
      </div>
    </nav>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="id"
      data-scroll-behavior="smooth"
      className={`${plusJakartaSans.variable} ${fraunces.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground">
        <a
          href="#main-content"
          className="sr-only z-[100] rounded-md bg-primary px-4 py-2 font-jakarta text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:inline-flex focus:min-h-11 focus:items-center"
        >
          Lewati ke konten
        </a>
        <Suspense fallback={<NavbarSuspenseFallback />}>
          <Navbar />
        </Suspense>
        <HashScroll />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 pt-[72px] focus:outline-none"
        >
          <RoleGuard>{children}</RoleGuard>
        </main>
      </body>
    </html>
  )
}