const SCROLL_CORRECTION_DELAYS = [350, 800, 1300]
const USER_SCROLL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
])

function normalizeHash(hash: string): string {
  if (!hash) return ""
  return hash.startsWith("#") ? hash.slice(1) : hash
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function getTarget(hash: string): HTMLElement | null {
  const id = normalizeHash(hash)
  if (!id) return null
  return document.getElementById(id)
}

function getTargetTop(target: HTMLElement): number {
  const margin = Number.parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0
  return Math.max(0, window.scrollY + target.getBoundingClientRect().top - margin)
}

export function setHash(hash: string, mode: "push" | "replace" = "push") {
  if (typeof window === "undefined") return
  const nextHash = hash.startsWith("#") ? hash : `#${hash}`
  if (window.location.hash === nextHash) return
  const url = `${window.location.pathname}${window.location.search}${nextHash}`
  if (mode === "replace") {
    window.history.replaceState(null, "", url)
  } else {
    window.history.pushState(null, "", url)
  }
}

export function scrollToHash(hash: string, options?: { cancelOnUserScroll?: boolean }): () => void {
  if (typeof window === "undefined") return () => {}

  let cancelled = false
  let frame: number | null = null
  let maxTimer: number | null = null
  let stableFrames = 0
  let lastTop = Number.NaN
  const correctionTimers: number[] = []
  const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth"

  const clearTimers = () => {
    if (frame !== null) {
      window.cancelAnimationFrame(frame)
      frame = null
    }
    if (maxTimer !== null) {
      window.clearTimeout(maxTimer)
      maxTimer = null
    }
    correctionTimers.forEach((timer) => window.clearTimeout(timer))
    correctionTimers.length = 0
  }

  function handleUserScroll() {
    cleanup()
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (USER_SCROLL_KEYS.has(event.key)) cleanup()
  }

  const cleanup = () => {
    if (cancelled) return
    cancelled = true
    clearTimers()
    window.removeEventListener("wheel", handleUserScroll)
    window.removeEventListener("touchstart", handleUserScroll)
    window.removeEventListener("keydown", handleKeyDown)
  }

  const scheduleCorrections = () => {
    SCROLL_CORRECTION_DELAYS.forEach((delay) => {
      const timer = window.setTimeout(() => {
        if (cancelled) return
        const target = getTarget(hash)
        if (!target) return
        const top = getTargetTop(target)
        if (Math.abs(top - lastTop) <= 4) return
        lastTop = top
        window.scrollTo({ top, behavior: "auto" })
      }, delay)
      correctionTimers.push(timer)
    })
  }

  const check = () => {
    if (cancelled) return
    const target = getTarget(hash)
    if (!target) {
      frame = window.requestAnimationFrame(check)
      return
    }

    const top = getTargetTop(target)
    if (Math.abs(top - lastTop) < 1) {
      stableFrames += 1
    } else {
      stableFrames = 0
      lastTop = top
    }

    if (stableFrames >= 2) {
      window.scrollTo({ top, behavior })
      scheduleCorrections()
      return
    }

    frame = window.requestAnimationFrame(check)
  }

  if (options?.cancelOnUserScroll !== false) {
    window.addEventListener("wheel", handleUserScroll, { passive: true })
    window.addEventListener("touchstart", handleUserScroll, { passive: true })
    window.addEventListener("keydown", handleKeyDown)
  }

  maxTimer = window.setTimeout(cleanup, 1800)
  check()
  return cleanup
}
