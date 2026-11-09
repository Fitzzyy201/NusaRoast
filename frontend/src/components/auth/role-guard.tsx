"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AUTH_USER_UPDATED_EVENT, getAuthToken, getAuthUser } from "@/services/api"
import { roleRedirect } from "@/lib/auth-routes"

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    let cancelled = false

    const check = () => {
      if (cancelled) return
      const target = roleRedirect(
        pathname ?? "/",
        getAuthUser()?.role,
        Boolean(getAuthToken())
      )
      setBlocked(Boolean(target))
      if (target) router.replace(target)
    }

    queueMicrotask(check)
    window.addEventListener(AUTH_USER_UPDATED_EVENT, check)

    return () => {
      cancelled = true
      window.removeEventListener(AUTH_USER_UPDATED_EVENT, check)
    }
  }, [pathname, router])

  if (blocked) return null

  return <>{children}</>
}
