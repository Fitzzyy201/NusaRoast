"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { cartApi, getAuthUser, loginApi } from "@/services/api"
import { loginDestination } from "@/lib/auth-routes"
import { AuthShell } from "@/components/ui/auth-shell"

function LoginContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const clearError = () => {
    if (error) setError(null)
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await loginApi.login({ email: email.trim(), password })
      const role = response.user?.role ?? getAuthUser()?.role
      if (role !== "ADMIN") {
        await cartApi.mergeGuestCart().catch(() => {})
      }
      const target = loginDestination(role, searchParams.get("redirect"))
      router.replace(target)
    } catch (err) {
      let message = err instanceof Error ? err.message : "Login gagal"
      if (message.toLowerCase().includes("banned")) {
        message = "Email atau password salah, atau akun ini diblokir. Hubungi admin jika akun Anda seharusnya aktif."
      } else if (message.toLowerCase().includes("invalid credentials")) {
        message = "Email atau password salah."
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Masuk"
      title="Lanjutkan belanja"
      description="Masuk untuk mengakses keranjang, riwayat pesanan, dan pembayaran."
    >
      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-md border border-danger/25 bg-danger/5 px-3.5 py-3">
            <p className="font-jakarta text-sm font-medium text-danger">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              clearError()
            }}
            required
            autoComplete="email"
            className="input"
            placeholder="nama@email.com"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor="password" className="font-jakarta text-sm font-medium text-primary">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="inline-flex min-h-11 items-center font-jakarta text-xs font-medium text-muted hover:text-primary"
            >
              Lupa password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                clearError()
              }}
              required
              autoComplete="current-password"
              className="input pr-12"
              placeholder="Masukkan password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-r-md text-muted hover:text-primary"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading || undefined}
          className="button button-primary w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Memproses
            </>
          ) : (
            "Masuk ke akun"
          )}
        </button>

        <p className="py-2 text-center font-jakarta text-sm text-muted">
          Belum punya akun?{" "}
          <Link
            href="/register"
            className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
          >
            Buat akun
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-background">
          <p className="font-jakarta text-sm text-muted">Memuat halaman masuk...</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
