"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft,
  Coffee,
  Loader2,
  Minus,
  Plus,
  Trash2,
} from "lucide-react"
import {
  cartApi,
  CartItem,
  getAuthToken,
  shippingApi,
  ShippingQuote,
} from "@/services/api"
import { formatPrice } from "@/lib/utils"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { BackButton } from "@/components/ui/back-button"

function itemImageSource(image: string): string | null {
  if (!image) return null
  return image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [clearing, setClearing] = useState(false)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [signedIn, setSignedIn] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null)
  const [shippingQuoteError, setShippingQuoteError] = useState<string | null>(null)

  const loadCart = useCallback(async () => {
    setLoading(true)
    setError(null)
    setShippingQuote(null)
    setShippingQuoteError(null)

    const signedIn = !!getAuthToken()
    setSignedIn(signedIn)
    try {
      const data = await cartApi.getCart()
      setItems(data)
      setSelectedIds(new Set(data.map((item) => item.id)))

      if (signedIn) {
        try {
          const quote = await shippingApi.getQuote()
          setShippingQuote(quote)
          setShippingQuoteError(null)
        } catch (err) {
          setShippingQuote(null)
          setShippingQuoteError(
            err instanceof Error ? err.message : "Ongkir belum tersedia"
          )
        }
      } else {
        setShippingQuote(null)
        setShippingQuoteError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat keranjang")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void loadCart()
    })
    return () => {
      cancelled = true
    }
  }, [loadCart])

  const handleRemove = async (itemId: number) => {
    if (removingId !== null || clearing || updatingId !== null) return
    setRemovingId(itemId)
    setError(null)
    try {
      const nextItems = await cartApi.removeFromCart(itemId)
      setItems(nextItems)
      setSelectedIds((current) => {
        const next = new Set(
          [...current].filter((id) => nextItems.some((item) => item.id === id))
        )
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus item")
    } finally {
      setRemovingId(null)
    }
  }

  const handleUpdateQuantity = async (itemId: number, quantity: number) => {
    if (updatingId !== null || removingId !== null || clearing) return

    const item = items.find((entry) => entry.id === itemId)
    if (!item || quantity < 1 || quantity === item.quantity) return

    if (item.stock > 0 && quantity > item.stock) {
      setError("Stok tidak mencukupi")
      return
    }

    setUpdatingId(itemId)
    setError(null)
    try {
      const nextItems = await cartApi.updateCartItem(itemId, quantity)
      setItems(nextItems)
      setSelectedIds((current) => {
        const available = new Set(nextItems.map((entry) => entry.id))
        return new Set([...current].filter((id) => available.has(id)))
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui jumlah")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleClear = async () => {
    if (clearing || removingId !== null || updatingId !== null) return
    setConfirmingClear(false)
    setClearing(true)
    setError(null)
    try {
      await cartApi.clearCart()
      setItems([])
      setSelectedIds(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengosongkan keranjang")
    } finally {
      setClearing(false)
    }
  }

  const toggleItem = (itemId: number) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const selectedItems = items.filter((item) => selectedIds.has(item.id))
  const allSelected = items.length > 0 && selectedIds.size === items.length
  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const selectedQuantity = selectedItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  )
  const shippingEstimate =
    shippingQuote?.options.find((option) => option.method === "REGULAR")?.cost ??
    null
  const estimatedTotal =
    shippingEstimate !== null ? subtotal + shippingEstimate : subtotal
  const selectedVariantIds = selectedItems.map((item) => item.variantId).join(",")
  const checkoutHref = `/checkout?variants=${encodeURIComponent(selectedVariantIds)}`
  const checkoutTarget = signedIn
    ? checkoutHref
    : `/login?redirect=${encodeURIComponent(checkoutHref)}`

  return (
    <div className="min-h-[calc(100vh-72px)] bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:py-14">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4 sm:gap-4 sm:pb-6">
          <div>
            <BackButton fallback="/products" />
            <p className="eyebrow">Keranjang</p>
            <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-[-0.025em] text-primary sm:mt-2 sm:text-5xl">
              Siap diseduh
            </h1>
            {!loading && items.length > 0 && (
              <p className="mt-1.5 font-jakarta text-[13px] text-muted sm:mt-2 sm:text-sm">
                {totalQuantity} item dalam keranjang Anda.
              </p>
            )}
          </div>
          <Link
            href="/products"
            className="inline-flex min-h-11 items-center gap-2 font-jakarta text-xs font-medium text-muted transition-colors hover:text-primary sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Lanjut belanja
          </Link>
        </div>

        {loading ? (
          <div className="mt-5 grid gap-5 sm:mt-8 sm:gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-2.5 sm:space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex gap-3 rounded-lg border border-border bg-paper p-3 sm:gap-4 sm:p-4">
                  <div className="h-20 w-20 rounded-md bg-card sm:h-24 sm:w-24" />
                  <div className="flex-1 space-y-2.5 py-1 sm:space-y-3">
                    <div className="h-4 w-2/3 rounded bg-card" />
                    <div className="h-3 w-1/3 rounded bg-card" />
                    <div className="h-4 w-24 rounded bg-card" />
                  </div>
                </div>
              ))}
            </div>
            <div className="h-56 rounded-lg border border-border bg-paper sm:h-64" />
          </div>
        ) : error && items.length === 0 ? (
          <section className="mx-auto mt-8 max-w-lg rounded-lg border border-border bg-paper px-5 py-8 text-center sm:mt-14 sm:px-6 sm:py-12">
            <h2 className="font-display text-xl font-semibold text-primary sm:text-2xl">
              Keranjang tidak dapat dimuat
            </h2>
            <p className="mt-2 font-jakarta text-[13px] text-muted sm:text-sm">{error}</p>
            <button type="button" onClick={() => void loadCart()} className="button button-primary mt-5 sm:mt-6">
              Coba lagi
            </button>
          </section>
        ) : items.length === 0 ? (
          <section className="mx-auto mt-8 max-w-lg rounded-lg border border-border bg-paper px-5 py-8 text-center sm:mt-14 sm:px-10 sm:py-12">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-card text-primary sm:h-14 sm:w-14">
              <Coffee className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold text-primary sm:mt-5 sm:text-2xl">
              Keranjang masih kosong
            </h2>
            <p className="mt-2 font-jakarta text-[13px] leading-5 text-muted sm:text-sm sm:leading-relaxed">
              Pilih kopi dari katalog, lalu tambahkan ke keranjang untuk mulai menyusun pesanan.
            </p>
            <Link href="/products" className="button button-primary mt-5 sm:mt-6">
              Lihat katalog kopi
            </Link>
          </section>
        ) : (
          <div className="mt-5 grid items-start gap-5 sm:mt-8 sm:gap-8 lg:grid-cols-[1fr_360px]">
            <section aria-label="Item keranjang">
              {error && (
                <div role="alert" className="mb-4 rounded-md border border-danger/25 bg-danger/5 px-4 py-3 font-jakarta text-sm text-danger">
                  {error}
                </div>
              )}

              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-jakarta text-sm font-medium text-primary">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() =>
                      setSelectedIds(
                        allSelected
                          ? new Set()
                          : new Set(items.map((item) => item.id))
                      )
                    }
                    className="h-5 w-5 accent-primary"
                  />
                  Pilih semua
                </label>
                <span className="font-jakarta text-xs text-muted">
                  {selectedIds.size} dari {items.length} item dipilih
                </span>
              </div>

              <ul className="space-y-2.5 sm:space-y-3">
                {items.map((item) => {
                  const imageSrc = itemImageSource(item.productImage)
                  const busy =
                    updatingId !== null || removingId !== null || clearing
                  return (
                    <li
                      key={item.id}
                      className="flex gap-2 rounded-lg border border-border bg-paper p-3 sm:gap-4 sm:p-4"
                    >
                      <label
                        className="flex w-8 shrink-0 cursor-pointer items-center justify-center self-center sm:w-10"
                        aria-label={`Pilih ${item.productName} ${item.variantWeight}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleItem(item.id)}
                          className="h-5 w-5 accent-primary"
                        />
                      </label>
                      <Link
                        href={`/product?id=${item.productId}`}
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-card sm:h-24 sm:w-24"
                        aria-label={`Lihat ${item.productName} ${item.variantWeight}`}
                      >
                        {imageSrc ? (
                          <Image
                            src={imageSrc}
                            alt={`${item.productName} ${item.variantWeight}`}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="96px"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <Coffee className="h-7 w-7 text-muted" aria-hidden="true" />
                          </span>
                        )}
                      </Link>

                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div className="flex gap-3">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/product?id=${item.productId}`}
                              className="inline-flex min-h-11 items-center font-jakarta text-sm font-semibold text-primary hover:text-accent sm:text-base"
                            >
                              {item.productName}  -  {item.variantWeight}
                            </Link>
                            <p className="mt-0.5 font-jakarta text-xs text-muted sm:mt-1 sm:text-sm">
                              {formatPrice(item.price)} per item
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleRemove(item.id)}
                            disabled={busy}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-danger/5 hover:text-danger disabled:opacity-50"
                            aria-label={`Hapus ${item.productName} ${item.variantWeight} dari keranjang`}
                          >
                            {removingId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>

                        <div className="mt-3 flex items-end justify-between gap-3 sm:mt-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex min-h-9 items-center overflow-hidden rounded-md border border-border bg-background">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleUpdateQuantity(item.id, item.quantity - 1)
                                }
                                disabled={busy || item.quantity <= 1}
                                className="flex h-9 w-9 items-center justify-center text-primary transition-colors hover:bg-primary/5 disabled:opacity-35"
                                aria-label={`Kurangi jumlah ${item.productName} ${item.variantWeight}`}
                              >
                                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              <span
                                className="flex min-w-8 items-center justify-center font-jakarta text-xs font-semibold text-primary"
                                aria-live="polite"
                              >
                                {updatingId === item.id ? (
                                  <Loader2
                                    className="h-3.5 w-3.5 animate-spin"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  item.quantity
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleUpdateQuantity(item.id, item.quantity + 1)
                                }
                                disabled={
                                  busy ||
                                  item.stock <= 0 ||
                                  item.quantity >= item.stock
                                }
                                className="flex h-9 w-9 items-center justify-center text-primary transition-colors hover:bg-primary/5 disabled:opacity-35"
                                aria-label={`Tambah jumlah ${item.productName} ${item.variantWeight}`}
                              >
                                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                            {item.stock > 0 && (
                              <span className="font-jakarta text-[11px] text-muted">
                                Stok {item.stock}
                              </span>
                            )}
                          </div>
                          <span className="font-jakarta text-sm font-bold text-primary sm:text-base">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmingClear(true)}
                  disabled={clearing || removingId !== null || updatingId !== null}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 font-jakarta text-sm font-medium text-muted transition-colors hover:bg-danger/5 hover:text-danger disabled:opacity-50"
                >
                  {clearing ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  Kosongkan keranjang
                </button>
              </div>
            </section>

            <aside className="rounded-lg border border-border bg-paper p-5 sm:p-6 lg:sticky lg:top-24">
              <h2 className="font-display text-xl font-semibold text-primary sm:text-2xl">Ringkasan</h2>
              <dl className="mt-4 space-y-2.5 font-jakarta text-[13px] sm:mt-5 sm:space-y-3 sm:text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">
                    Subtotal ({selectedQuantity} item dipilih)
                  </dt>
                  <dd className="font-semibold text-primary">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted">Kurir Lokal (estimasi)</dt>
                    <dd className="text-right font-semibold text-primary">
                      {shippingEstimate !== null
                        ? formatPrice(shippingEstimate)
                        : "Dihitung saat checkout"}
                    </dd>
                  </div>
                  {shippingQuote && (
                    <p className="font-jakarta text-[10px] text-muted">
                      📍 {shippingQuote.distanceKm.toFixed(1)} km dari{" "}
                      {shippingQuote.origin.name}
                    </p>
                  )}
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-semibold text-primary">
                      {shippingEstimate !== null ? "Estimasi total" : "Subtotal"}
                    </dt>
                    <dd className="font-jakarta text-lg font-bold text-primary sm:text-xl">
                      {formatPrice(estimatedTotal)}
                    </dd>
                  </div>
                </div>
              </dl>

              {shippingQuoteError && signedIn && (
                <p className="mt-3 font-jakarta text-xs leading-5 text-danger">
                  {shippingQuoteError}{" "}
                  <Link href="/profile" className="font-semibold text-primary underline">
                    Lengkapi kota/kabupaten
                  </Link>
                </p>
              )}

              {selectedItems.length > 0 ? (
                <Link
                  href={checkoutTarget}
                  className="button button-primary mt-5 w-full text-sm sm:mt-6 sm:text-base"
                >
                  {signedIn ? "Lanjut ke checkout" : "Masuk untuk checkout"}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="button button-primary mt-5 w-full text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:mt-6 sm:text-base"
                >
                  Pilih item untuk checkout
                </button>
              )}
              <p className="mt-2.5 font-jakarta text-[11px] leading-5 text-muted sm:mt-3 sm:text-xs sm:leading-relaxed">
                Ongkir final mengikuti metode pengiriman yang dipilih saat checkout.
              </p>
            </aside>
          </div>
        )}
      </div>

      {confirmingClear && (
        <ConfirmDialog
          title="Kosongkan keranjang?"
          description="Semua item akan dihapus dari keranjang Anda. Tindakan ini tidak dapat dibatalkan."
          confirmLabel="Ya, kosongkan"
          onConfirm={() => void handleClear()}
          onCancel={() => setConfirmingClear(false)}
        />
      )}
    </div>
  )
}
