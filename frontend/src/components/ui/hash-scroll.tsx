"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { scrollToHash } from "@/lib/scroll"

export function HashScroll() {
  const pathname = usePathname()

  useEffect(() => {
    let cancel: (() => void) | undefined

    const run = () => {
      cancel?.()
      cancel = undefined
      if (!window.location.hash) return
      cancel = scrollToHash(window.location.hash)
    }

    run()
    window.addEventListener("hashchange", run)

    return () => {
      cancel?.()
      window.removeEventListener("hashchange", run)
    }
  }, [pathname])

  return null
}
