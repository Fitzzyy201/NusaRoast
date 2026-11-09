"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Coffee,
  Loader2,
  MapPin,
  PackageCheck,
  Pencil,
  Truck,
} from "lucide-react"
import {
  cartApi,
  CartItem,
  getAuthToken,
  paymentApi,
  productApi,
  profileApi,
  Profile,
  shippingApi,
  ShippingQuote,
} from "@/services/api"
import { cn, formatPrice } from "@/lib/utils"
import { payWithSnap } from "@/lib/snap"
import { SHIPPING_OPTIONS, ShippingMethod } from "@/lib/shipping"

function itemImageSource(image: string): string | null {
  if (!image) return null
  return image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const buyNow = searchParams.get("buyNow") === "1"
  const rawVariantId = Number(searchParams.get("variantId"))
  const variantId = Number.isInteger(rawVariantId) && rawVariantId > 0 ? rawVariantId : 0
  const rawQuantity = Number(searchParams.get("quantity") ?? "1")
  const buyNowQuantity =
    Number.isInteger(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1
  const variantsParam = searchParams.get("variants")
  const checkoutHref = searchParams.toString()
    ? `/checkout?${searchParams.toString()}`
    : "/checkout"

  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("REGULAR")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [signedIn, setSignedIn] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [address, setAddress] = useState("")
  const [editingAddress, setEditingAddress] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)

  const loadCheckout = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    setShippingQuote(null)
    setQuoteError(null)

    if (!getAuthToken()) {
      setSignedIn(false)
      setCartItems([])
      setLoading(false)
      return
    }

    setSignedIn(true)
    try {
      const profileData = await profileApi.getProfile()
      setProfile(profileData)
      setAddress(profileData.address ?? "")
      if (!profileData.address?.trim()) {
        setEditingAddress(true)
      }

      setQuoteLoading(true)
      setQuoteError(null)
      try {
        const quote = await shippingApi.getQuote()
        setShippingQuote(quote)
      } catch (err) {
        setShippingQuote(null)
        setQuoteError(
          err instanceof Error ? err.message : "Gagal menghitung ongkir"
        )
      } finally {
        setQuoteLoading(false)
      }

      if (buyNow) {
        if (variantId === 0) {
          setCartItems([])
          setLoadError("Varian produk tidak valid")
          return
        }

        const variant = await productApi.getVariant(variantId)
        setCartItems([
          {
            id: -1,
            productId: variant.productId,
            variantId: variant.id,
            variantWeight: variant.weight,
            quantity: buyNowQuantity,
            price: variant.price,
            productName: variant.product.name,
            productImage: variant.product.imageBase64 ?? "",
            stock: variant.stock,
          },
        ])
        return
      }

      const cart = await cartApi.getCart()

      if (variantsParam !== null) {
        const wantedVariantIds = new Set(
          variantsParam
            .split(",")
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0)
        )
        const filtered = cart.filter((item) =>
          wantedVariantIds.has(item.variantId)
        )

        if (wantedVariantIds.size === 0 || filtered.length !== wantedVariantIds.size) {
          setCartItems([])
          setLoadError(
            "Item keranjang yang dipilih tidak ditemukan. Kembali ke keranjang dan pilih ulang."
          )
          return
        }

        setCartItems(filtered)
        return
      }

      setCartItems(cart)
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : buyNow
            ? "Gagal memuat varian produk"
            : "Gagal memuat keranjang"
      )
    } finally {
      setLoading(false)
    }
  }, [buyNow, buyNowQuantity, variantId, variantsParam])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void loadCheckout()
    })
    return () => {
      cancelled = true
    }
  }, [loadCheckout])

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const selectedShippingOption = shippingQuote?.options.find(
    (option) => option.method === shippingMethod
  )
  const shippingCost = selectedShippingOption?.cost ?? 0
  const totalAmount = subtotal + shippingCost
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const handleSaveAddress = async () => {
    const trimmedAddress = address.trim()
    if (!trimmedAddress) {
      setAddressError("Alamat pengiriman wajib diisi.")
      return
    }

    setSavingAddress(true)
    setAddressError(null)
    try {
      const updated = await profileApi.updateProfile({ address: trimmedAddress })
      setProfile(updated)
      setAddress(updated.address ?? trimmedAddress)
      setEditingAddress(false)
    } catch (err) {
      setAddressError(
        err instanceof Error ? err.message : "Alamat gagal disimpan"
      )
    } finally {
      setSavingAddress(false)
    }
  }

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0 || paymentLoading) return

    if (!shippingQuote || quoteLoading) {
      setPaymentError(
        quoteError ??
          "Ongkir belum tersedia. Lengkapi kota/kabupaten di profil lalu coba lagi."
      )
      return
    }

    const trimmedAddress = address.trim()
    if (!trimmedAddress) {
      setPaymentError("Alamat pengiriman wajib diisi sebelum membuat pesanan.")
      setEditingAddress(true)
      return
    }

    setPaymentLoading(true)
    setPaymentError(null)

    try {
      if (trimmedAddress !== (profile?.address ?? "").trim()) {
        const updated = await profileApi.updateProfile({
          address: trimmedAddress,
        })
        setProfile(updated)
        setAddress(updated.address ?? trimmedAddress)
      }

      const payment = buyNow
        ? await paymentApi.createBuyNowPayment(
            variantId,
            buyNowQuantity,
            shippingMethod
          )
        : await paymentApi.createPayment(
            shippingMethod,
            totalAmount,
            cartItems.map((item) => item.id)
          )

      if (!payment.snapToken) {
        router.push("/orders")
        return
      }

      try {
        await payWithSnap(payment.snapToken, {
          onSuccess: async () => {
            const orderId = payment.order?.id
            if (orderId) {
              const maxAttempts = 10
              for (let i = 0; i < maxAttempts; i++) {
                await new Promise((r) => setTimeout(r, 1500))
                try {
                  const statusData = await paymentApi.syncPayment(orderId)
                  if (
                    statusData.status === "PAID" ||
                    statusData.status === "PROCESSING" ||
                    statusData.status === "SHIPPED" ||
                    statusData.status === "COMPLETED"
                  ) {
                    router.push("/orders")
                    return
                  }
                } catch {}
              }
            }
            router.push("/orders")
          },
          onPending: () => router.push("/orders"),
          onError: () => {
            setPaymentError(
              "Pembayaran gagal atau dibatalkan. Pesanan tetap tersimpan dan dapat dibayar dari halaman pesanan."
            )
            setPaymentLoading(false)
          },
          onClose: () => router.push("/orders"),
        })
      } catch {
        router.push("/orders")
      }
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Gagal membuat pesanan")
      setPaymentLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:py-14">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4 sm:gap-4 sm:pb-6">
          <div>
            <p className="eyebrow">Checkout</p>
            <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-[-0.025em] text-primary sm:mt-2 sm:text-5xl">
              Selesaikan pesanan
            </h1>
          </div>
          <Link
            href={buyNow ? `/product?id=${cartItems[0]?.productId ?? ""}` : "/cart"}
            className="inline-flex min-h-11 items-center gap-2 font-jakarta text-xs font-medium text-muted transition-colors hover:text-primary sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {buyNow ? "Kembali ke produk" : "Kembali ke keranjang"}
          </Link>
        </div>

        {loading ? (
          <div className="mt-5 grid gap-5 sm:mt-8 sm:gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3 sm:space-y-4">
              <div className="h-36 rounded-lg border border-border bg-paper sm:h-40" />
              <div className="h-52 rounded-lg border border-border bg-paper sm:h-56" />
            </div>
            <div className="h-72 rounded-lg border border-border bg-paper sm:h-80" />
          </div>
        ) : !signedIn ? (
          <section className="mx-auto mt-8 max-w-lg rounded-lg border border-border bg-paper px-5 py-8 text-center sm:mt-14 sm:px-6 sm:py-12">
            <h2 className="font-display text-xl font-semibold text-primary sm:text-2xl">
              Masuk untuk checkout
            </h2>
            <p className="mt-2 font-jakarta text-[13px] leading-5 text-muted sm:text-sm sm:leading-relaxed">
              Pesanan terhubung ke akun Anda agar status dan pembayaran dapat dilacak.
            </p>
            <Link
              href={`/login?redirect=${encodeURIComponent(checkoutHref)}`}
              className="button button-primary mt-5 sm:mt-6"
            >
              Masuk ke akun
            </Link>
          </section>
        ) : loadError ? (
          <section className="mx-auto mt-8 max-w-lg rounded-lg border border-border bg-paper px-5 py-8 text-center sm:mt-14 sm:px-6 sm:py-12">
            <h2 className="font-display text-xl font-semibold text-primary sm:text-2xl">
              Checkout tidak dapat dimuat
            </h2>
            <p className="mt-2 font-jakarta text-[13px] text-muted sm:text-sm">{loadError}</p>
            <button type="button" onClick={() => void loadCheckout()} className="button button-primary mt-5 sm:mt-6">
              Coba lagi
            </button>
          </section>
        ) : cartItems.length === 0 ? (
          <section className="mx-auto mt-8 max-w-lg rounded-lg border border-border bg-paper px-5 py-8 text-center sm:mt-14 sm:px-6 sm:py-12">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-card text-primary sm:h-14 sm:w-14">
              <Coffee className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold text-primary sm:mt-5 sm:text-2xl">
              Keranjang masih kosong
            </h2>
            <p className="mt-2 font-jakarta text-[13px] leading-5 text-muted sm:text-sm sm:leading-relaxed">
              Tambahkan kopi ke keranjang sebelum melanjutkan ke checkout.
            </p>
            <Link href="/products" className="button button-primary mt-5 sm:mt-6">
              Lihat katalog kopi
            </Link>
          </section>
        ) : (
          <div className="mt-5 grid items-start gap-5 sm:mt-8 sm:gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3 sm:space-y-4">
              <section className="rounded-lg border border-border bg-paper p-4 sm:p-6">
                <div className="flex items-center justify-between gap-4 border-b border-border pb-3 sm:pb-4">
                  <div>
                    <h2 className="font-display text-xl font-semibold text-primary sm:text-2xl">Pesanan Anda</h2>
                    <p className="mt-0.5 font-jakarta text-[13px] text-muted sm:mt-1 sm:text-sm">{totalQuantity} item</p>
                  </div>
                  {!buyNow && (
                    <Link
                      href="/cart"
                      className="inline-flex min-h-11 min-w-11 items-center justify-center font-jakarta text-xs font-medium text-primary underline underline-offset-4 sm:text-sm"
                    >
                      Ubah
                    </Link>
                  )}
                </div>

                <ul className="divide-y divide-border">
                  {cartItems.map((item) => {
                    const imageSrc = itemImageSource(item.productImage)
                    return (
                      <li key={item.id} className="flex items-center gap-2.5 py-3 sm:gap-3 sm:py-3.5">
                        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card sm:h-14 sm:w-14">
                          {imageSrc ? (
                            <Image
                              src={imageSrc}
                              alt={item.productName}
                              fill
                              unoptimized
                              className="object-cover"
                              sizes="56px"
                            />
                          ) : (
                            <Coffee className="h-5 w-5 text-muted" aria-hidden="true" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-jakarta text-[13px] font-semibold text-primary sm:text-sm">
                            {item.productName} · {item.variantWeight}
                          </p>
                          <p className="mt-0.5 font-jakarta text-[11px] text-muted sm:text-xs">
                            {item.quantity} x {formatPrice(item.price)}
                          </p>
                        </div>
                        <span className="shrink-0 font-jakarta text-[13px] font-semibold text-primary sm:text-sm">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>

              <section className="rounded-lg border border-border bg-paper p-4 sm:p-6">
                <div className="flex items-center justify-between gap-4 border-b border-border pb-3 sm:pb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h2 className="font-display text-xl font-semibold text-primary sm:text-2xl">
                      Alamat pengiriman
                    </h2>
                  </div>
                  {!editingAddress && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddress(true)
                        setAddressError(null)
                      }}
                      disabled={paymentLoading}
                      className="inline-flex min-h-11 items-center gap-1.5 font-jakarta text-xs font-medium text-primary underline underline-offset-4 disabled:opacity-50 sm:text-sm"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      Ubah
                    </button>
                  )}
                </div>

                <div className="pt-3 sm:pt-4">
                  {editingAddress ? (
                    <>
                      <label htmlFor="shipping-address" className="sr-only">
                        Alamat pengiriman
                      </label>
                      <textarea
                        id="shipping-address"
                        value={address}
                        onChange={(event) => {
                          setAddress(event.target.value)
                          setAddressError(null)
                          setPaymentError(null)
                        }}
                        rows={3}
                        disabled={paymentLoading || savingAddress}
                        className="input min-h-24 resize-y py-2.5"
                        placeholder="Jalan, nomor rumah, kota, kode pos"
                      />
                      {addressError && (
                        <p role="alert" className="mt-2 font-jakarta text-sm text-danger">
                          {addressError}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleSaveAddress()}
                          disabled={savingAddress || paymentLoading}
                          className="button button-primary min-h-11 px-4 text-sm disabled:opacity-50"
                        >
                          {savingAddress ? "Menyimpan..." : "Simpan alamat"}
                        </button>
                        {profile?.address && (
                          <button
                            type="button"
                            onClick={() => {
                              setAddress(profile.address ?? "")
                              setEditingAddress(false)
                              setAddressError(null)
                            }}
                            disabled={savingAddress || paymentLoading}
                            className="button button-outline min-h-11 px-4 text-sm disabled:opacity-50"
                          >
                            Batal
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="font-jakarta text-sm leading-6 text-primary">
                      {address || "Alamat belum diisi."}
                    </p>
                  )}
                </div>
              </section>

              <fieldset className="rounded-lg border border-border bg-paper p-4 sm:p-6">
                <legend className="px-1 font-display text-xl font-semibold text-primary sm:text-2xl">
                  Metode pengiriman
                </legend>
                <p className="mt-1 font-jakarta text-[13px] text-muted sm:text-sm">
                  Pilih kecepatan kurir lokal. Ongkir dihitung otomatis berdasarkan jarak.
                </p>

                {quoteError ? (
                  <div role="alert" className="mt-3 rounded-md border border-danger/25 bg-danger/5 px-3.5 py-3">
                    <p className="font-jakarta text-sm font-medium text-danger">{quoteError}</p>
                    {quoteError.toLowerCase().includes("jangkauan") && (
                      <Link
                        href="/bantuan"
                        className="mt-3 inline-block font-jakarta text-xs font-semibold text-primary underline underline-offset-4"
                      >
                        Pelajari lebih lanjut tentang area layanan kami →
                      </Link>
                    )}
                  </div>
                ) : shippingQuote ? (
                  <div className="mt-3 space-y-1.5 rounded-md border border-border bg-background px-3 py-2.5">
                    <p className="font-jakarta text-xs font-medium text-primary sm:text-sm">
                      📍 Dikirim dari: {shippingQuote.origin.name}
                    </p>
                    <p className="font-jakarta text-xs text-muted sm:text-sm">
                      📍 Jarak ke {shippingQuote.destination.name}: ±
                      {shippingQuote.distanceKm.toLocaleString("id-ID", {
                        maximumFractionDigits: 1,
                      })}{" "}
                      km
                    </p>
                    <p className="font-jakarta text-xs text-muted">
                      Tarif zona {shippingQuote.zone.label}: Rp
                      {shippingQuote.options[0].cost.toLocaleString("id-ID")} (Lokal) / Rp
                      {shippingQuote.options[1].cost.toLocaleString("id-ID")} (Express)
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 font-jakarta text-xs text-muted">
                    {quoteLoading ? "Menghitung ongkir..." : "Ongkir belum tersedia."}
                  </p>
                )}

                <div className="mt-4 grid gap-2.5 sm:mt-5 sm:grid-cols-2 sm:gap-3">
                  {SHIPPING_OPTIONS.map((option) => {
                    const active = shippingMethod === option.value
                    const quotedOption = shippingQuote?.options.find(
                      (item) => item.method === option.value
                    )
                    const Icon = option.value === "REGULAR" ? PackageCheck : Truck
                    const disabled = paymentLoading || quoteLoading || !quotedOption
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "relative cursor-pointer rounded-lg border p-3.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-paper sm:p-4",
                          active
                            ? "border-primary bg-primary/5"
                            : "border-border-strong bg-background hover:border-primary/50",
                          disabled && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <input
                          type="radio"
                          name="shipping"
                          value={option.value}
                          checked={active}
                          disabled={disabled}
                          onChange={() => {
                            setShippingMethod(option.value)
                            setPaymentError(null)
                          }}
                          className="sr-only"
                        />
                        <span className="flex items-start justify-between gap-3">
                          <span className="flex items-center gap-2 font-jakarta text-sm font-semibold text-primary">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                            {option.label}
                          </span>
                          <span
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-full border",
                              active ? "border-primary bg-primary text-white" : "border-border-strong"
                            )}
                            aria-hidden="true"
                          >
                            {active && <Check className="h-3 w-3" />}
                          </span>
                        </span>
                        <span className="mt-2 block font-jakarta text-xs leading-5 text-muted">
                          {option.description}
                        </span>
                        <span className="mt-3 block font-jakarta text-sm font-bold text-primary">
                          {quoteLoading
                            ? "Menghitung..."
                            : quotedOption
                              ? formatPrice(quotedOption.cost)
                              : "Belum tersedia"}
                        </span>
                      </label>
                    )
                  })}
                </div>
                <p className="mt-2 font-jakarta text-[11px] text-muted sm:text-xs">
                  Ongkir dihitung berdasarkan zona jarak dari gudang. Tarif mulai Rp10.000 untuk 0–10 km, bertambah sesuai zona.
                </p>
              </fieldset>
            </div>

            <aside className="rounded-lg border border-border bg-paper p-5 sm:p-6 lg:sticky lg:top-24">
              <h2 className="font-display text-xl font-semibold text-primary sm:text-2xl">Ringkasan</h2>
              <dl className="mt-4 space-y-2.5 font-jakarta text-[13px] sm:mt-5 sm:space-y-3 sm:text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Subtotal produk</dt>
                  <dd className="font-semibold text-primary">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Biaya kirim</dt>
                  <dd className="font-semibold text-primary">
                    {quoteLoading
                      ? "Menghitung..."
                      : shippingQuote
                        ? formatPrice(shippingCost)
                        : "Belum tersedia"}
                  </dd>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-semibold text-primary">Total bayar</dt>
                    <dd className="font-jakarta text-lg font-bold text-primary sm:text-xl">
                      {shippingQuote ? formatPrice(totalAmount) : "Belum tersedia"}
                    </dd>
                  </div>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => void handlePlaceOrder()}
                disabled={paymentLoading || quoteLoading || !shippingQuote}
                aria-busy={paymentLoading || quoteLoading || undefined}
                className="button button-primary mt-5 w-full text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:mt-6 sm:text-base"
              >
                {paymentLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Membuat pesanan
                  </>
                ) : (
                  "Buat pesanan"
                )}
              </button>

              {paymentError && (
                <div role="alert" className="mt-4 rounded-md border border-danger/25 bg-danger/5 px-3 py-3">
                  <p className="font-jakarta text-sm font-medium text-danger">{paymentError}</p>
                  <p className="mt-1.5 font-jakarta text-xs leading-5 text-muted">
                    Jika pesanan sudah tercatat, buka{" "}
                    <Link href="/orders" className="font-semibold text-primary underline">
                      Pesanan saya
                    </Link>{" "}
                    untuk melanjutkan pembayaran.
                  </p>
                </div>
              )}

              <p className="mt-3 font-jakarta text-xs leading-5 text-muted">
                Pesanan dibuat dengan total dari server. Pembayaran dilanjutkan dari halaman Pesanan.
              </p>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:py-14">
          <div className="h-8 w-48 rounded bg-card" />
          <div className="mt-8 h-72 rounded-lg border border-border bg-paper" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
