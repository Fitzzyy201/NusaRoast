"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { forwardRef, type ComponentPropsWithoutRef, type MouseEvent } from "react"
import { scrollToHash, setHash } from "@/lib/scroll"

interface HashLinkProps extends Omit<ComponentPropsWithoutRef<typeof Link>, "onClick"> {
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
  onBeforeNavigate?: () => void
}

export const HashLink = forwardRef<HTMLAnchorElement, HashLinkProps>(function HashLink(
  { href, onClick, onBeforeNavigate, scroll = false, ...props },
  ref
) {
  const pathname = usePathname()
  const router = useRouter()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
    if (typeof href !== "string") return

    const url = new URL(href, window.location.href)
    if (url.origin !== window.location.origin || !url.hash) return

    event.preventDefault()
    onBeforeNavigate?.()

    if (url.pathname === pathname) {
      setHash(url.hash)
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          scrollToHash(url.hash)
        })
      })
      return
    }

    router.push(`${url.pathname}${url.search}${url.hash}`, { scroll: false })
  }

  return <Link ref={ref} href={href} scroll={scroll} onClick={handleClick} {...props} />
})
