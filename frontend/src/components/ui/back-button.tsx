"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface BackButtonProps {
  fallback?: string
  className?: string
}

export function BackButton({ fallback = "/", className }: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(fallback)
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Kembali ke halaman sebelumnya"
      className={cn(
        "inline-flex min-h-11 items-center gap-2 font-jakarta text-xs font-medium text-muted transition-colors hover:text-primary sm:text-sm",
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Kembali
    </button>
  )
}
