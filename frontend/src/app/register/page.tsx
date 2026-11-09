"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { cartApi, registerApi, Region } from "@/services/api"
import { AuthShell } from "@/components/ui/auth-shell"
import { CitySelect } from "@/components/ui/city-select"
import { PhoneInput } from "@/components/ui/phone-input"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [city, setCity] = useState<Region | null>(null)
  const [address, setAddress] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const clearError = () => {
    if (error) setError(null)
  }

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Password dan konfirmasi password tidak cocok.")
      return
    }
    if (password.length < 6) {
      setError("Password minimal 6 karakter.")
      return
    }
    if (!phone.trim()) {
      setError("Nomor telepon wajib diisi.")
      return
    }
    if (!/^\d{10,14}$/.test(phone.trim())) {
      setError("Nomor telepon harus terdiri dari 10 sampai 14 digit angka.")
      return
    }
    if (!city) {
      setError("Pilih kota/kabupaten.")
      return
    }

    setLoading(true)
    try {
      await registerApi.register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.name,
        cityCode: city.code,
        password,
      })
      await cartApi.mergeGuestCart().catch(() => {})
      router.push("/")
    } catch (err) {
      let message = err instanceof Error ? err.message : "Pendaftaran gagal"
      if (message.toLowerCase().includes("email already exists")) {
        message = "Email sudah terdaftar. Silakan masuk atau gunakan email lain."
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Akun baru"
      title="Buat akun NusaRoast"
      description="Simpan keranjang dan lacak riwayat pesanan Anda dalam satu akun."
    >
      <form onSubmit={handleRegister} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-md border border-danger/25 bg-danger/5 px-3.5 py-3">
            <p className="font-jakarta text-sm font-medium text-danger">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="name" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
            Nama lengkap
          </label>
          <input
            id="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              clearError()
            }}
            required
            autoComplete="name"
            className="input"
            placeholder="Nama lengkap"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
          <PhoneInput
            id="phone"
            label="No. telepon"
            value={phone}
            onChange={(value) => {
              setPhone(value)
              clearError()
            }}
            required
          />
        </div>

        <CitySelect
          onChange={(value) => {
            setCity(value)
            clearError()
          }}
          required
        />

        <div>
          <label htmlFor="address" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
            Alamat pengiriman <span className="font-normal text-muted">(opsional)</span>
          </label>
          <textarea
            id="address"
            value={address}
            onChange={(event) => {
              setAddress(event.target.value)
              clearError()
            }}
            rows={3}
            autoComplete="street-address"
            className="input min-h-24 resize-y py-2.5"
            placeholder="Jalan, nomor rumah, kota, kode pos"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
              Password
            </label>
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
              Ulangi password
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
              placeholder="Ulangi password"
            />
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
              Membuat akun
            </>
          ) : (
            "Buat akun"
          )}
        </button>

        <p className="py-2 text-center font-jakarta text-sm text-muted">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
          >
            Masuk
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
