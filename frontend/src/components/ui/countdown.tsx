"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface CountdownProps {
  targetTime: string | Date
  onExpire?: () => void
  className?: string
}

export function Countdown({ targetTime, onExpire, className }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    const target = new Date(targetTime).getTime()
    let expired = false

    const tick = () => {
      const diff = target - Date.now()

      if (diff <= 0) {
        setTimeLeft(0)
        if (!expired) {
          expired = true
          onExpireRef.current?.()
        }
        return
      }

      setTimeLeft(diff)
    }

    tick()
    if (expired) return

    const interval = setInterval(() => {
      tick()
      if (expired) clearInterval(interval)
    }, 1000)

    return () => clearInterval(interval)
  }, [targetTime])

  if (timeLeft === null) {
    return (
      <span className={cn("font-jakarta text-xs font-medium tabular-nums text-muted", className)}>
        --:--
      </span>
    )
  }

  if (timeLeft <= 0) {
    return (
      <span className={cn("font-jakarta text-xs font-medium text-danger", className)}>
        Waktu habis
      </span>
    )
  }

  const minutes = Math.floor(timeLeft / (1000 * 60))
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

  return (
    <span className={cn("font-jakarta text-xs font-medium tabular-nums text-primary", className)}>
      {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
    </span>
  )
}