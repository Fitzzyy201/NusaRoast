const AUTH_PATHS = new Set(["/login", "/register", "/forgot-password", "/reset-password"])

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/")
}

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.has(pathname)
}

export function safeRedirectPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null
  return raw
}

export function loginDestination(
  role: string | null | undefined,
  rawRedirect: string | null | undefined
): string {
  if (role === "SELLER") return "/admin"

  const redirect = safeRedirectPath(rawRedirect)
  if (redirect && !isAdminPath(redirect) && !isAuthPath(redirect)) return redirect

  return "/"
}

export function roleRedirect(
  pathname: string,
  role: string | null | undefined,
  hasToken: boolean
): string | null {
  if (!hasToken) {
    return isAdminPath(pathname)
      ? `/login?redirect=${encodeURIComponent(pathname)}`
      : null
  }

  if (role === "SELLER") {
    if (isAdminPath(pathname) || pathname === "/profile") return null
    return "/admin"
  }

  if (isAdminPath(pathname)) return "/"

  return null
}
