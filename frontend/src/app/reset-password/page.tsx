"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react"
import { resetApi } from "@/services/api"
import { AuthShell } from "@/components/ui/auth-shell"

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const clearError = () => {
    if (error) setError(null)
  }

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!token) {
      setError("Tautan reset tidak valid. Minta tautan baru melalui halaman lupa password.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok.")
      return
    }
    if (newPassword.length < 6) {
      setError("Password minimal 6 karakter.")
      return
    }

    setLoading(true)
    try {
      await resetApi.resetPassword({ token, newPassword })
      setSuccess(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mereset password"
      setError(
        message.toLowerCase().includes("invalid or expired")
          ? "Tautan reset sudah tidak berlaku. Minta tautan baru."
          : message
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Password baru"
      title="Buat password baru"
      description="Gunakan minimal 6 karakter. Setelah berhasil, masuk kembali dengan password baru."
    >
      {success ? (
        <div>
          <div
            role="status"
            className="flex items-start gap-3 rounded-md border border-success/25 bg-success/5 px-4 py-4"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <div>
              <p className="font-jakarta text-sm font-semibold text-primary">
                Password berhasil diubah
              </p>
              <p className="mt-1 font-jakarta text-sm leading-6 text-muted">
                Anda sudah bisa masuk menggunakan password baru.
              </p>
            </div>
          </div>
          <Link href="/login" className="button button-primary mt-6 w-full">
            Masuk ke akun
          </Link>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-md border border-danger/25 bg-danger/5 px-3.5 py-3">
              <p className="font-jakarta text-sm font-medium text-danger">{error}</p>
              {!token && (
                <Link
                  href="/forgot-password"
                  className="mt-1 inline-flex min-h-11 items-center font-jakarta text-xs font-semibold text-primary underline"
                >
                  Minta tautan reset baru
                </Link>
              )}
            </div>
          )}

          <div>
            <label htmlFor="new-password" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
              Password baru
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value)
                  clearError()
                }}
                required
                minLength={6}
                autoComplete="new-password"
                className="input pr-12"
                placeholder="Minimal 6 karakter"
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

          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
              Ulangi password baru
            </label>
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value)
                clearError()
              }}
              required
              autoComplete="new-password"
              className="input"
              placeholder="Ulangi password baru"
            />
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
                Menyimpan password
              </>
            ) : (
              "Simpan password baru"
            )}
          </button>

          <p className="py-2 text-center font-jakarta text-sm text-muted">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
            >
              Kembali ke halaman masuk
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-background">
          <p className="font-jakarta text-sm text-muted">Memuat halaman reset...</p>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
