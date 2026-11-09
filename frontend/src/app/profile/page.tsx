"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Camera,
  CheckCircle,
  Loader2,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react"
import {
  ApiError,
  clearAuthToken,
  getAuthToken,
  getAuthUser,
  profileApi,
  Profile,
  Region,
  setAuthUser,
} from "@/services/api"
import { avatarDataUrl, AVATAR_MAX_SOURCE_BYTES, compressAvatar } from "@/lib/avatar"
import { CitySelect } from "@/components/ui/city-select"
import { PhoneInput } from "@/components/ui/phone-input"
import { BackButton } from "@/components/ui/back-button"
import { formatDate } from "@/lib/utils"

type Notice = {
  type: "success" | "error"
  message: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [city, setCity] = useState<Region | null>(null)
  const [address, setAddress] = useState("")
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const syncAuthUser = useCallback((data: Profile) => {
    const stored = getAuthUser()
    if (stored) {
      setAuthUser({
        ...stored,
        name: data.name,
        email: data.email,
        role: data.role,
        avatarBase64: data.avatarBase64,
      })
    }
  }, [])

  const applyProfile = useCallback(
    (data: Profile) => {
      setProfile(data)
      setName(data.name)
      setPhone((data.phone ?? "").replace(/\D/g, "").slice(0, 14))
      setAddress(data.address ?? "")
      setCity(
        data.cityCode
          ? { code: data.cityCode, name: data.city ?? "" }
          : null
      )
      syncAuthUser(data)
    },
    [syncAuthUser]
  )

  const loadProfile = useCallback(async () => {
    if (!getAuthToken()) {
      setSignedIn(false)
      setLoading(false)
      return
    }

    setSignedIn(true)
    setLoading(true)
    setError(null)

    try {
      const data = await profileApi.getProfile()
      applyProfile(data)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAuthToken()
        setSignedIn(false)
      } else {
        setError(err instanceof Error ? err.message : "Gagal memuat profil")
      }
    } finally {
      setLoading(false)
    }
  }, [applyProfile])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void loadProfile()
    })
    return () => {
      cancelled = true
    }
  }, [loadProfile])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    setNotice(null)

    if (!name.trim()) {
      setFormError("Nama wajib diisi.")
      return
    }
    if (!/^\d{10,14}$/.test(phone.trim())) {
      setFormError("Nomor telepon harus terdiri dari 10 sampai 14 digit angka.")
      return
    }
    if (!city) {
      setFormError("Pilih kota/kabupaten.")
      return
    }

    setSaving(true)
    try {
      const updated = await profileApi.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        city: city.name,
        cityCode: city.code,
        address: address.trim(),
      })
      applyProfile(updated)
      setNotice({ type: "success", message: "Profil berhasil disimpan." })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan profil")
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async (file: File | undefined) => {
    setPhotoError(null)
    setNotice(null)
    if (!file) return

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("Gunakan foto JPG, PNG, atau WebP.")
      return
    }
    if (file.size > AVATAR_MAX_SOURCE_BYTES) {
      setPhotoError("Ukuran foto maksimal 8 MB.")
      return
    }

    setPhotoBusy(true)
    try {
      const dataUrl = await compressAvatar(file)
      const base64 = dataUrl.split(",")[1] ?? ""
      const updated = await profileApi.updateProfile({ avatarBase64: base64 })
      setProfile(updated)
      syncAuthUser(updated)
      setNotice({ type: "success", message: "Foto profil berhasil diperbarui." })
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Gagal mengunggah foto.")
    } finally {
      setPhotoBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleRemoveAvatar = async () => {
    setPhotoError(null)
    setNotice(null)
    setPhotoBusy(true)
    try {
      const updated = await profileApi.updateProfile({ avatarBase64: "" })
      setProfile(updated)
      syncAuthUser(updated)
      setNotice({ type: "success", message: "Foto profil dihapus." })
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Gagal menghapus foto.")
    } finally {
      setPhotoBusy(false)
    }
  }

  if (!signedIn) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-background py-6 sm:py-10 lg:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="border-b border-border pb-4 sm:pb-6">
            <p className="eyebrow">Akun</p>
            <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-[-0.025em] text-primary sm:mt-2 sm:text-5xl">
              Profil saya
            </h1>
          </div>
          <section className="mx-auto mt-8 max-w-lg rounded-lg border border-border bg-paper px-5 py-8 text-center sm:mt-12 sm:px-6 sm:py-12">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-card text-primary sm:h-14 sm:w-14">
              <UserRound className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold text-primary sm:mt-5 sm:text-2xl">
              Masuk untuk melihat profil
            </h2>
            <p className="mt-2 font-jakarta text-[13px] leading-5 text-muted sm:text-sm sm:leading-relaxed">
              Data akun dan foto profil tersimpan setelah Anda masuk.
            </p>
            <Link
              href={`/login?redirect=${encodeURIComponent("/profile")}`}
              className="button button-primary mt-5 sm:mt-6"
            >
              Masuk ke akun
            </Link>
          </section>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-background py-6 sm:py-10 lg:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="border-b border-border pb-4 sm:pb-6">
            <p className="eyebrow">Akun</p>
            <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-[-0.025em] text-primary sm:mt-2 sm:text-5xl">
              Profil saya
            </h1>
          </div>
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-paper px-5 py-8 text-muted sm:mt-8 sm:px-6">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            <p className="font-jakarta text-sm">Memuat profil...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-background py-6 sm:py-10 lg:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="border-b border-border pb-4 sm:pb-6">
            <p className="eyebrow">Akun</p>
            <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-[-0.025em] text-primary sm:mt-2 sm:text-5xl">
              Profil saya
            </h1>
          </div>
          <section className="mx-auto mt-8 max-w-lg rounded-lg border border-border bg-paper px-5 py-8 text-center sm:mt-12 sm:px-6 sm:py-12">
            <XCircle className="mx-auto h-9 w-9 text-danger sm:h-10 sm:w-10" aria-hidden="true" />
            <h2 className="mt-3 font-display text-xl font-semibold text-primary sm:mt-4 sm:text-2xl">
              Profil tidak dapat dimuat
            </h2>
            <p className="mt-2 font-jakarta text-[13px] text-muted sm:text-sm">
              {error ?? "Data profil tidak tersedia."}
            </p>
            <button
              type="button"
              onClick={() => void loadProfile()}
              className="button button-outline mt-5 sm:mt-6"
            >
              Coba lagi
            </button>
          </section>
        </div>
      </div>
    )
  }

  const avatar = avatarDataUrl(profile.avatarBase64)
  const initial = profile.name.trim().charAt(0).toUpperCase() || "N"
  const isSeller = profile.role === "SELLER"

  return (
    <div className="min-h-[calc(100vh-72px)] bg-background py-6 sm:py-10 lg:py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="border-b border-border pb-4 sm:pb-6">
          <BackButton />
          <p className="eyebrow">Akun</p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-[-0.025em] text-primary sm:mt-2 sm:text-5xl">
            Profil saya
          </h1>
          <p className="mt-2 max-w-xl font-jakarta text-[13px] leading-5 text-muted sm:text-sm sm:leading-6">
            Kelola data akun dan foto profil Anda. Password tidak ditampilkan di halaman ini.
          </p>
        </div>

        {notice && (
          <div
            role={notice.type === "error" ? "alert" : "status"}
            className={
              notice.type === "success"
                ? "mt-4 flex items-start gap-2 rounded-md border border-success/25 bg-success/5 px-3.5 py-3 text-success sm:mt-6"
                : "mt-4 flex items-start gap-2 rounded-md border border-danger/25 bg-danger/5 px-3.5 py-3 text-danger sm:mt-6"
            }
          >
            {notice.type === "success" ? (
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <p className="font-jakarta text-sm font-medium">{notice.message}</p>
          </div>
        )}

        <div className="mt-5 grid gap-5 sm:mt-7 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
          <section className="rounded-lg border border-border bg-paper p-5 sm:p-6">
            <div className="flex flex-col items-center text-center">
              <span className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt={`Foto profil ${profile.name}`}
                    fill
                    unoptimized
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <span className="font-display text-4xl font-semibold text-primary" aria-hidden="true">
                    {initial}
                  </span>
                )}
              </span>

              <h2 className="mt-4 font-display text-2xl font-semibold text-primary">
                {profile.name}
              </h2>
              <p className="mt-1 max-w-full truncate font-jakarta text-sm text-muted">
                {profile.email}
              </p>

              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span className="badge bg-primary/10 text-primary">
                  {isSeller ? "Penjual" : "Pembeli"}
                </span>
                <span
                  className={
                    profile.status === "ACTIVE"
                      ? "badge bg-success/10 text-success"
                      : "badge bg-danger/10 text-danger"
                  }
                >
                  {profile.status === "ACTIVE" ? "Aktif" : "Diblokir"}
                </span>
              </div>

              <p className="mt-3 font-jakarta text-xs text-muted">
                Bergabung sejak {formatDate(profile.createdAt)}
              </p>
            </div>

            <div className="mt-5 border-t border-border pt-5">
              <p className="font-jakarta text-sm font-semibold text-primary">Foto profil</p>
              <p className="mt-1 font-jakarta text-xs leading-5 text-muted">
                JPG, PNG, atau WebP, maksimal 8 MB. Foto dipotong persegi dan diperkecil otomatis.
              </p>

              <input
                ref={fileInputRef}
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={photoBusy}
                tabIndex={-1}
                onChange={(event) => void handleAvatarChange(event.target.files?.[0])}
                className="sr-only"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoBusy}
                  className="button button-outline min-h-11 px-3.5 text-sm disabled:opacity-50"
                >
                  {photoBusy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Memproses foto
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
                      {avatar ? "Ganti foto" : "Pilih foto"}
                    </>
                  )}
                </button>

                {avatar && (
                  <button
                    type="button"
                    onClick={() => void handleRemoveAvatar()}
                    disabled={photoBusy}
                    className="inline-flex min-h-11 items-center rounded-md px-2 font-jakarta text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-50"
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Hapus foto
                  </button>
                )}
              </div>

              {photoError && (
                <p role="alert" className="mt-2 font-jakarta text-sm text-danger">
                  {photoError}
                </p>
              )}
            </div>

            <dl className="mt-5 space-y-3 border-t border-border pt-5">
              <div>
                <dt className="font-jakarta text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Kota/Kabupaten
                </dt>
                <dd className="mt-1 font-jakarta text-sm text-primary">
                  {profile.city || "Belum diisi."}
                </dd>
              </div>
              <div>
                <dt className="font-jakarta text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Alamat
                </dt>
                <dd className="mt-1 font-jakarta text-sm leading-6 text-primary">
                  {profile.address || "Belum diisi."}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-border bg-paper p-5 sm:p-6">
            <h2 className="font-display text-2xl font-semibold text-primary">Data akun</h2>
            <p className="mt-1 font-jakarta text-sm text-muted">
              Perbarui data yang dipakai saat checkout dan pengiriman.
            </p>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label htmlFor="profile-name" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
                  Nama lengkap
                </label>
                <input
                  id="profile-name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setFormError(null)
                    setNotice(null)
                  }}
                  required
                  autoComplete="name"
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="input bg-card/60 text-muted"
                />
                <p className="mt-1.5 font-jakarta text-xs text-muted">
                  Email tidak dapat diubah dari halaman ini.
                </p>
              </div>

              <PhoneInput
                id="profile-phone"
                label="Nomor telepon"
                value={phone}
                onChange={(value) => {
                  setPhone(value)
                  setFormError(null)
                  setNotice(null)
                }}
                required
                disabled={saving}
              />

              <div>
                <p className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
                  Kota/Kabupaten
                </p>
                <CitySelect
                  initialCityCode={profile.cityCode}
                  onChange={(value) => {
                    setCity(value)
                    setFormError(null)
                    setNotice(null)
                  }}
                  disabled={saving}
                  required
                />
              </div>

              <div>
                <label htmlFor="profile-address" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
                  Alamat pengiriman
                </label>
                <textarea
                  id="profile-address"
                  value={address}
                  onChange={(event) => {
                    setAddress(event.target.value)
                    setFormError(null)
                    setNotice(null)
                  }}
                  rows={3}
                  autoComplete="street-address"
                  className="input min-h-24 resize-y py-2.5"
                  placeholder="Jalan, nomor rumah, kode pos"
                />
              </div>

              {formError && (
                <p role="alert" className="font-jakarta text-sm text-danger">
                  {formError}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving || photoBusy}
                  aria-busy={saving || undefined}
                  className="button button-primary disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      Menyimpan
                    </>
                  ) : (
                    "Simpan perubahan"
                  )}
                </button>
                <Link
                  href={isSeller ? "/admin" : "/orders"}
                  className="inline-flex min-h-11 items-center font-jakarta text-sm font-medium text-primary underline underline-offset-4"
                >
                  {isSeller ? "Kembali ke dashboard" : "Lihat pesanan saya"}
                </Link>
              </div>
              </form>
            </section>
          </div>
        </div>
      </div>
  )
}
