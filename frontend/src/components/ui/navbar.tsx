"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  Search,
  ShoppingBag,
  UserRound,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Coffee,
  Package,
  Store,
} from "lucide-react"
import {
  getAuthUser,
  clearAuthToken,
  cartApi,
  productApi,
  Product,
  AuthUser,
  AUTH_USER_UPDATED_EVENT,
  CART_UPDATED_EVENT,
} from "@/services/api"
import { avatarDataUrl } from "@/lib/avatar"
import { cn, formatPrice } from "@/lib/utils"
import { HashLink } from "@/components/ui/hash-link"
import { NotificationBell } from "./notification-bell"

function useOutsideClick(
  ref: React.RefObject<HTMLElement | null>,
  onOutside: () => void,
  active: boolean
) {
  useEffect(() => {
    if (!active) return
    const handlePointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutside()
      }
    }
    document.addEventListener("mousedown", handlePointer)
    return () => document.removeEventListener("mousedown", handlePointer)
  }, [ref, onOutside, active])
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileMenuMounted, setMobileMenuMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [user, setUser] = useState<AuthUser | null>(null)

  const [results, setResults] = useState<Product[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const searchRef = useRef<HTMLDivElement>(null)
  const searchButtonRef = useRef<HTMLButtonElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const accountButtonRef = useRef<HTMLButtonElement>(null)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const mobileMenuCloseTimerRef = useRef<number | null>(null)

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery("")
    setResults([])
    setSearchLoading(false)
    setSearchError(null)
  }, [])

  const closeUserMenu = useCallback(() => setUserMenuOpen(false), [])

  const closeMobileMenu = useCallback((restoreFocus = false) => {
    setMobileMenuOpen(false)
    if (mobileMenuCloseTimerRef.current !== null) {
      window.clearTimeout(mobileMenuCloseTimerRef.current)
    }
    mobileMenuCloseTimerRef.current = window.setTimeout(() => {
      setMobileMenuMounted(false)
      mobileMenuCloseTimerRef.current = null
    }, 200)
    if (restoreFocus) mobileMenuButtonRef.current?.focus()
  }, [])

  const openMobileMenu = useCallback(() => {
    if (mobileMenuCloseTimerRef.current !== null) {
      window.clearTimeout(mobileMenuCloseTimerRef.current)
      mobileMenuCloseTimerRef.current = null
    }
    setMobileMenuMounted(true)
    setMobileMenuOpen(false)
    window.requestAnimationFrame(() => setMobileMenuOpen(true))
  }, [])

  useEffect(() => {
    return () => {
      if (mobileMenuCloseTimerRef.current !== null) {
        window.clearTimeout(mobileMenuCloseTimerRef.current)
      }
    }
  }, [])

  useOutsideClick(searchRef, closeSearch, searchOpen)
  useOutsideClick(userMenuRef, closeUserMenu, userMenuOpen)

  const fetchCartCount = useCallback(async () => {
    if (getAuthUser()?.role === "ADMIN") {
      setCartCount(0)
      return
    }
    try {
      const items = await cartApi.getCart()
      setCartCount(items.reduce((sum, item) => sum + item.quantity, 0))
    } catch {
      setCartCount(0)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      setUser(getAuthUser())
      setMobileMenuOpen(false)
      setMobileMenuMounted(false)
      setUserMenuOpen(false)
      if (mobileMenuCloseTimerRef.current !== null) {
        window.clearTimeout(mobileMenuCloseTimerRef.current)
        mobileMenuCloseTimerRef.current = null
      }
      void fetchCartCount()
    })
  }, [pathname, fetchCartCount])

  useEffect(() => {
    const handler = () => fetchCartCount()
    window.addEventListener(CART_UPDATED_EVENT, handler)
    return () => window.removeEventListener(CART_UPDATED_EVENT, handler)
  }, [fetchCartCount])

  useEffect(() => {
    const handler = () => setUser(getAuthUser())
    window.addEventListener(AUTH_USER_UPDATED_EVENT, handler)
    return () => window.removeEventListener(AUTH_USER_UPDATED_EVENT, handler)
  }, [])

  useEffect(() => {
    if (!searchOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSearch()
        searchButtonRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [searchOpen, closeSearch])

  useEffect(() => {
    if (!userMenuOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeUserMenu()
        accountButtonRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [userMenuOpen, closeUserMenu])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const desktopQuery = window.matchMedia("(min-width: 768px)")
    const handleDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) closeMobileMenu()
    }
    desktopQuery.addEventListener("change", handleDesktop)

    return () => {
      document.body.style.overflow = previous
      desktopQuery.removeEventListener("change", handleDesktop)
    }
  }, [mobileMenuOpen, closeMobileMenu])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const menu = mobileMenuRef.current
    if (!menu) return

    menu.focus()

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        closeMobileMenu(true)
        return
      }
      if (event.key !== "Tab") return

      const focusable = Array.from(
        menu.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (!menu.contains(active)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && (active === first || active === menu)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [mobileMenuOpen, closeMobileMenu])

  useEffect(() => {
    const query = searchQuery.trim()
    if (!searchOpen || query.length === 0) return

    let cancelled = false
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      setSearchError(null)
      try {
        const data = await productApi.getProducts(1, 5, undefined, query)
        if (!cancelled) setResults(data.items)
      } catch (error) {
        if (!cancelled) {
          setSearchError(error instanceof Error ? error.message : "Gagal mencari produk")
          setResults([])
        }
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [searchQuery, searchOpen])

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    router.push(`/products?search=${encodeURIComponent(query)}`)
    closeMobileMenu()
    closeSearch()
  }

  const handleLogout = () => {
    clearAuthToken()
    setUser(null)
    setCartCount(0)
    setUserMenuOpen(false)
    closeMobileMenu()
    router.push(user?.role === "ADMIN" ? "/login" : "/")
  }

  if (pathname?.startsWith("/admin")) {
    return null
  }

  const cartAriaLabel =
    cartCount > 0 ? `Keranjang belanja, ${cartCount} item` : "Keranjang belanja, kosong"

  const navLink = (href: string, label: string) => {
    const active =
      href === "/products"
        ? pathname === "/products" || pathname.startsWith("/product")
        : pathname === href
    return (
      <Link
        href={href}
        className={cn(
          "relative flex h-[72px] items-center font-jakarta text-sm transition-colors",
          active ? "font-semibold text-primary" : "font-medium text-muted hover:text-primary"
        )}
      >
        {label}
        {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />}
      </Link>
    )
  }

  const isAdmin = user?.role === "ADMIN"
  const displayName = user?.name?.trim() || "Akun saya"
  const initial = displayName.charAt(0).toUpperCase()
  const avatar = avatarDataUrl(user?.avatarBase64)
  const mobileLinks = isAdmin
    ? [
        { href: "/admin", label: "Dashboard", hash: false },
        { href: "/profile", label: "Profil saya", hash: false },
      ]
    : [
        { href: "/", label: "Beranda", hash: false },
        { href: "/products", label: "Produk", hash: false },
        { href: "/#panduan-roast", label: "Panduan roast", hash: true },
        {
          href: "/cart",
          label: `Keranjang${cartCount > 0 ? ` (${cartCount})` : ""}`,
          hash: false,
        },
        { href: "/orders", label: "Pesanan", hash: false },
        { href: "/profile", label: "Profil saya", hash: false },
      ]

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link
          href={isAdmin ? "/admin" : "/"}
          className="flex min-h-11 shrink-0 items-center gap-2.5 text-primary"
          aria-label={isAdmin ? "NusaRoast, ke dashboard admin" : "NusaRoast, ke beranda"}
        >
          
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden">
            <Image
              src="/images/logo.png"
              alt="Logo NusaRoast"
              fill
              sizes="44px"
              className="object-contain"
              priority
            />
          </span>
          <span className="hidden font-display text-2xl font-semibold tracking-[-0.02em] min-[360px]:inline">
            NusaRoast
          </span>
        </Link>

        <div className="ml-6 hidden items-center gap-7 md:flex">
          {isAdmin ? (
            <>
              {navLink("/admin", "Dashboard")}
              {navLink("/profile", "Profil")}
            </>
          ) : (
            <>
              {navLink("/", "Beranda")}
              {navLink("/products", "Produk")}
              <HashLink
                href="/#panduan-roast"
                className="flex h-[72px] items-center font-jakarta text-sm font-medium text-muted transition-colors hover:text-primary"
              >
                Panduan Roast
              </HashLink>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          {!isAdmin && (
            <>
              <div
                className="relative"
                ref={searchRef}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) closeSearch()
            }}
          >
            <button
              ref={searchButtonRef}
              type="button"
              onClick={() => {
                if (!searchOpen) {
                  setUserMenuOpen(false)
                  closeMobileMenu()
                }
                setSearchOpen((open) => !open)
              }}
              className="flex h-11 min-w-11 items-center gap-2 rounded-md px-2.5 text-muted transition-colors hover:bg-primary/5 hover:text-primary sm:px-3"
              aria-label={searchOpen ? "Tutup pencarian" : "Cari produk"}
              aria-expanded={searchOpen}
              aria-controls="product-search"
              aria-haspopup="dialog"
            >
              {searchOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Search className="h-5 w-5" aria-hidden="true" />
              )}
              <span className="hidden font-jakarta text-sm lg:inline">
                {searchOpen ? "Tutup" : "Cari"}
              </span>
            </button>

            {searchOpen && (
              <div
                id="product-search"
                className="fixed inset-x-4 top-[72px] max-h-[calc(100dvh-88px)] overflow-y-auto rounded-lg border border-border bg-paper shadow-xl shadow-primary/10 md:absolute md:left-auto md:right-0 md:top-full md:mt-3 md:w-[22rem]"
                role="dialog"
                aria-label="Pencarian produk"
              >
                <form onSubmit={submitSearch} className="border-b border-border p-3">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Cari nama kopi"
                      aria-label="Cari produk berdasarkan nama"
                      autoFocus
                      className="min-h-11 w-full rounded-md border border-border-strong bg-background py-2 pl-9 pr-3 text-sm text-primary placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </form>

                <div className="p-2" aria-live="polite">
                  {searchQuery.trim().length === 0 ? (
                    <p className="px-3 py-4 font-jakarta text-sm leading-relaxed text-muted">
                      Mulai ketik nama produk.
                    </p>
                  ) : searchLoading ? (
                    <div className="space-y-2 p-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 rounded-md bg-card" />
                      ))}
                    </div>
                  ) : searchError ? (
                    <p className="px-3 py-4 font-jakarta text-sm text-danger" role="alert">
                      {searchError}
                    </p>
                  ) : results.length === 0 ? (
                    <p className="px-3 py-4 font-jakarta text-sm text-muted">
                      Tidak ada produk yang cocok. Coba kata kunci lain.
                    </p>
                  ) : (
                    <ul>
                      {results.map((product) => (
                        <li key={product.id}>
                          <Link
                            href={`/product?id=${product.id}`}
                            onClick={closeSearch}
                            className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-primary/5"
                          >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
                              {product.imageBase64 ? (
                                <Image
                                  src={`data:image/jpeg;base64,${product.imageBase64}`}
                                  alt=""
                                  width={44}
                                  height={44}
                                  className="h-full w-full object-cover"
                                  unoptimized
                                />
                              ) : (
                                <Coffee className="h-4 w-4 text-muted" aria-hidden="true" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-jakarta text-sm font-semibold text-primary">
                                {product.name}
                              </span>
                              <span className="block truncate font-jakarta text-xs text-muted">
                                {product.origin}
                              </span>
                            </span>
                            <span className="shrink-0 font-jakarta text-xs font-semibold text-primary">
                              {formatPrice(product.price)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/cart"
            className={cn(
              "relative flex h-11 w-11 items-center justify-center rounded-md transition-colors hover:bg-primary/5 hover:text-primary",
              pathname === "/cart" ? "text-primary" : "text-muted"
            )}
            aria-label={cartAriaLabel}
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {cartCount > 0 && (
              <span
                className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-jakarta text-[10px] font-bold text-white"
                aria-hidden="true"
              >
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>

          {user && <NotificationBell />}

            </>
          )}

          <div
            className="relative hidden md:block"
            ref={userMenuRef}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) closeUserMenu()
            }}
          >
            <button
              ref={accountButtonRef}
              type="button"
              onClick={() => {
                if (!userMenuOpen) {
                  closeSearch()
                  closeMobileMenu()
                }
                setUserMenuOpen((open) => !open)
              }}
              className={cn(
                "flex h-11 items-center gap-2 rounded-md border px-2 transition-colors",
                userMenuOpen
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border-strong text-muted hover:border-primary hover:text-primary"
              )}
              aria-label="Menu akun"
              aria-expanded={userMenuOpen}
              aria-controls="account-menu"
            >
              {user ? (
                avatar ? (
                  <span className="relative h-7 w-7 overflow-hidden rounded-sm border border-border bg-card" aria-hidden="true">
                    <Image
                      src={avatar}
                      alt=""
                      fill
                      unoptimized
                      sizes="28px"
                      className="object-cover"
                    />
                  </span>
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary font-jakarta text-xs font-bold text-background" aria-hidden="true">
                    {initial}
                  </span>
                )
              ) : (
                <UserRound className="h-5 w-5" aria-hidden="true" />
              )}
              <span className="hidden max-w-28 truncate font-jakarta text-sm xl:inline">
                {user ? displayName.split(" ")[0] : "Masuk"}
              </span>
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>

            {userMenuOpen && (
              <div
                id="account-menu"
                className="absolute right-0 top-full mt-3 w-60 overflow-hidden rounded-lg border border-border bg-paper py-1.5 shadow-xl shadow-primary/10"
              >
                {user ? (
                  <>
                    <div className="border-b border-border px-4 py-3">
                      <p className="truncate font-jakarta text-sm font-semibold text-primary">
                        {user.name || "Akun NusaRoast"}
                      </p>
                      <p className="mt-0.5 truncate font-jakarta text-xs text-muted">
                        {user.email || (isAdmin ? "Admin" : "Pembeli")}
                      </p>
                      <p className="mt-2 font-jakarta text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                        {isAdmin ? "Akun admin" : "Akun pembeli"}
                      </p>
                    </div>
                    {isAdmin ? (
                      <>
                        <Link
                          href="/admin"
                          className="flex min-h-11 items-center gap-2.5 px-4 font-jakarta text-sm text-muted hover:bg-primary/5 hover:text-primary"
                          onClick={closeUserMenu}
                        >
                          <Store className="h-4 w-4" aria-hidden="true" />
                          Dashboard admin
                        </Link>
                        <Link
                          href="/profile"
                          className="flex min-h-11 items-center gap-2.5 px-4 font-jakarta text-sm text-muted hover:bg-primary/5 hover:text-primary"
                          onClick={closeUserMenu}
                        >
                          <UserRound className="h-4 w-4" aria-hidden="true" />
                          Profil saya
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/profile"
                          className="flex min-h-11 items-center gap-2.5 px-4 font-jakarta text-sm text-muted hover:bg-primary/5 hover:text-primary"
                          onClick={closeUserMenu}
                        >
                          <UserRound className="h-4 w-4" aria-hidden="true" />
                          Profil saya
                        </Link>
                        <Link
                          href="/orders"
                          className="flex min-h-11 items-center gap-2.5 px-4 font-jakarta text-sm text-muted hover:bg-primary/5 hover:text-primary"
                          onClick={closeUserMenu}
                        >
                          <Package className="h-4 w-4" aria-hidden="true" />
                          Pesanan saya
                        </Link>
                        <Link
                          href="/cart"
                          className="flex min-h-11 items-center gap-2.5 px-4 font-jakarta text-sm text-muted hover:bg-primary/5 hover:text-primary"
                          onClick={closeUserMenu}
                        >
                          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                          Keranjang
                        </Link>
                      </>
                    )}
                    <div className="my-1 border-t border-border" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex min-h-11 w-full items-center gap-2.5 px-4 text-left font-jakarta text-sm text-danger hover:bg-danger/5"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Keluar
                    </button>
                  </>
                ) : (
                  <>
                    <div className="px-4 pb-2 pt-3">
                      <p className="font-jakarta text-sm font-semibold text-primary">Selamat datang</p>
                      <p className="mt-1 font-jakarta text-xs leading-relaxed text-muted">
                        Masuk untuk menyimpan keranjang dan melihat pesanan.
                      </p>
                    </div>
                    <Link
                      href="/login"
                      className="mx-2 flex min-h-11 items-center justify-center rounded-md bg-primary px-4 font-jakarta text-sm font-semibold text-white hover:bg-primary/90"
                      onClick={closeUserMenu}
                    >
                      Masuk
                    </Link>
                    <Link
                      href="/register"
                      className="mx-2 mt-1.5 flex min-h-11 items-center justify-center rounded-md border border-border px-4 font-jakarta text-sm font-medium text-primary hover:bg-primary/5"
                      onClick={closeUserMenu}
                    >
                      Buat akun
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            ref={mobileMenuButtonRef}
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted transition-colors hover:bg-primary/5 hover:text-primary md:hidden"
            onClick={() => {
              if (mobileMenuOpen) {
                closeMobileMenu(true)
                return
              }
              closeSearch()
              setUserMenuOpen(false)
              openMobileMenu()
            }}
            aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuMounted && (
        <div className="md:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Tutup menu"
            onClick={() => closeMobileMenu(true)}
            className={cn(
              "fixed inset-x-0 bottom-0 top-[72px] z-40 bg-primary/35 transition-opacity duration-150",
              mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          />

          <div
            id="mobile-menu"
            ref={mobileMenuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
            aria-hidden={!mobileMenuOpen}
            inert={!mobileMenuOpen}
            tabIndex={-1}
            className={cn(
              "fixed bottom-0 right-0 top-[72px] z-50 flex w-[min(88vw,22rem)] flex-col overflow-y-auto overscroll-contain border-l border-border bg-background shadow-2xl shadow-primary/15 transition-transform duration-200 ease-out",
              mobileMenuOpen ? "translate-x-0" : "translate-x-full"
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="font-display text-xl font-semibold text-primary">Menu</p>
              <button
                type="button"
                onClick={() => closeMobileMenu(true)}
                className="flex h-11 w-11 items-center justify-center rounded-md text-muted transition-colors hover:bg-primary/5 hover:text-primary"
                aria-label="Tutup menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
              {!isAdmin && (
                <form onSubmit={submitSearch} className="mb-5 flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Search
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Cari nama kopi"
                      aria-label="Cari produk berdasarkan nama"
                      className="min-h-11 w-full rounded-md border border-border-strong bg-paper py-2 pl-9 pr-3 text-sm text-primary placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!searchQuery.trim()}
                    className="button button-primary shrink-0 px-4"
                  >
                    Cari
                  </button>
                </form>
              )}

              {user && (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  {avatar ? (
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm border border-border bg-paper">
                      <Image
                        src={avatar}
                        alt=""
                        fill
                        unoptimized
                        sizes="40px"
                        className="object-cover"
                      />
                    </span>
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary font-jakarta text-sm font-bold text-background">
                      {initial}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-jakarta text-sm font-semibold text-primary">{displayName}</p>
                    <p className="truncate font-jakarta text-xs text-muted">
                      {user.email || (isAdmin ? "Akun admin" : "Akun pembeli")}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col">
                {mobileLinks.map((item) =>
                  item.hash ? (
                    <HashLink
                      key={item.href}
                      href={item.href}
                      onBeforeNavigate={() => closeMobileMenu()}
                      className="flex min-h-11 items-center border-b border-border/70 px-1 py-3 font-jakarta text-base font-medium text-primary"
                    >
                      {item.label}
                    </HashLink>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => closeMobileMenu()}
                      className="flex min-h-11 items-center border-b border-border/70 px-1 py-3 font-jakarta text-base font-medium text-primary"
                    >
                      {item.label}
                    </Link>
                  )
                )}
              </div>

              <div className="mt-5 space-y-2">
                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex min-h-11 w-full items-center gap-2 rounded-md border border-danger/20 px-4 text-left font-jakarta text-sm font-medium text-danger"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Keluar
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => closeMobileMenu()}
                      className="flex min-h-11 items-center justify-center rounded-md bg-primary px-4 font-jakarta text-sm font-semibold text-white"
                    >
                      Masuk
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => closeMobileMenu()}
                      className="flex min-h-11 items-center justify-center rounded-md border border-border px-4 font-jakarta text-sm font-medium text-primary"
                    >
                      Buat akun
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
