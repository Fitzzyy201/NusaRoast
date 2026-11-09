"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2 } from "lucide-react"
import { forgotApi } from "@/services/api"
import { AuthShell } from "@/components/ui/auth-shell"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const clearError = () => {
    if (error) setError(null)
  }

  const handleForgot = async (event: React.FormEvent) => {
    event.preventDefault()
    setSending(true)
    setError(null)
    try {
      await forgotApi.forgotPassword({ email: email.trim() })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim tautan reset")
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Lupa password"
      title="Atur ulang akses"
      description="Masukkan email akun Anda. Jika terdaftar, kami akan mengirim tautan untuk membuat password baru."
    >
      {sent ? (
        <div>
          <div
            role="status"
            className="flex items-start gap-3 rounded-md border border-success/25 bg-success/5 px-4 py-4"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <div>
              <p className="font-jakarta text-sm font-semibold text-primary">
                Permintaan reset diterima
              </p>
              <p className="mt-1 font-jakarta text-sm leading-6 text-muted">
                Periksa kotak masuk email Anda. Tautan reset hanya berlaku selama satu jam.
              </p>
            </div>
          </div>
          <Link href="/login" className="button button-primary mt-6 w-full">
            Kembali ke halaman masuk
          </Link>
        </div>
      ) : (
        <form onSubmit={handleForgot} className="space-y-4">
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

          <button
            type="submit"
            disabled={sending}
            aria-busy={sending || undefined}
            className="button button-primary w-full"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Mengirim permintaan
              </>
            ) : (
              "Kirim tautan reset"
            )}
          </button>

          <p className="py-2 text-center font-jakarta text-sm text-muted">
            Ingat password Anda?{" "}
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
            >
              Masuk
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}
