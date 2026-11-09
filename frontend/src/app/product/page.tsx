"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
} from "lucide-react"
import { cartApi, isAuthenticated, productApi, Product } from "@/services/api"
import { formatPrice } from "@/lib/utils"
import { getRoastLevelInfo } from "@/lib/roast-levels"
import { Button } from "@/components/ui/button"
import { HashLink } from "@/components/ui/hash-link"
import { ProductVisual } from "@/components/product/product-visual"

function ProductDetailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const rawProductId = searchParams.get("id")
  const productId = rawProductId ? Number(rawProductId) : Number.NaN

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [addStatus, setAddStatus] = useState<"idle" | "loading" | "added">("idle")
  const [addError, setAddError] = useState<string | null>(null)
  const [addedQuantity, setAddedQuantity] = useState(0)
  const [showStickyCta, setShowStickyCta] = useState(false)
  const addToCartButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let cancelled = false
    const loadProduct = async () => {
      if (!Number.isInteger(productId) || productId <= 0) {
        setProduct(null)
        setError(null)
        setAddError(null)
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        setError(null)
        setAddStatus("idle")
        setAddError(null)
        const data = await productApi.getProduct(productId)
        if (!cancelled) {
          setProduct(data)
          setSelectedVariantId(data.variants?.[0]?.id ?? null)
          setQuantity(1)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal memuat produk")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadProduct()
    return () => {
      cancelled = true
    }
  }, [productId])

  useEffect(() => {
    if (addStatus !== "added") return
    const timer = window.setTimeout(() => setAddStatus("idle"), 2400)
    return () => window.clearTimeout(timer)
  }, [addStatus])

  useEffect(() => {
    if (!product || loading || error) return

    const button = addToCartButtonRef.current
    if (!button) return

    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCta(!entry.isIntersecting),
      { rootMargin: "-72px 0px 0px 0px", threshold: 0 }
    )
    observer.observe(button)
    return () => observer.disconnect()
  }, [product, loading, error])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-16">
        <div className="grid gap-6 sm:gap-10 lg:grid-cols-2">
          <div className="aspect-square rounded-lg border border-border bg-card" />
          <div className="space-y-4 py-1 sm:space-y-5 sm:py-2">
            <div className="h-3 w-28 rounded bg-card" />
            <div className="h-10 w-3/4 rounded bg-card sm:h-12" />
            <div className="h-5 w-36 rounded bg-card" />
            <div className="h-20 w-full rounded bg-card sm:h-24" />
            <div className="h-12 w-full rounded bg-card sm:h-14" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center sm:px-6 sm:py-20">
        <p className="eyebrow">Produk</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-primary sm:mt-3 sm:text-3xl">
          {error ? "Produk gagal dimuat" : "Produk tidak ditemukan"}
        </h1>
        <p className="mt-2 font-jakarta text-[13px] leading-5 text-muted sm:mt-3 sm:text-sm sm:leading-relaxed">
          {error ?? "Produk yang Anda cari mungkin sudah tidak tersedia."}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/products" className="button button-primary">
            Kembali ke katalog
          </Link>
          {Number.isInteger(productId) && productId > 0 && (
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Coba lagi
            </Button>
          )}
        </div>
      </div>
    )
  }

  const variants = product.variants ?? []
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? variants[0]
  const isOutOfStock =
    !selectedVariant || selectedVariant.stock === 0 || !product.isActive
  const flavorNotes = product.flavorNotes ?? []
  const roastInfo = getRoastLevelInfo(product.roastLevel)
  const roastLabel = roastInfo?.name ?? "-"
  const maxQuantity = Math.max(1, selectedVariant?.stock ?? 0)
  const selectedPrice = selectedVariant?.price ?? product.price
  const selectedWeight = selectedVariant?.weight ?? product.weight

  const handleSelectVariant = (variantId: number) => {
    const variant = variants.find((item) => item.id === variantId)
    setSelectedVariantId(variantId)
    setQuantity((current) => Math.min(current, Math.max(1, variant?.stock ?? 1)))
  }

  const handleAddToCart = async () => {
    if (isOutOfStock || !selectedVariant || addStatus === "loading") return

    setAddStatus("loading")
    setAddError(null)
    try {
      await cartApi.addToCart(selectedVariant.id, quantity)
      setAddedQuantity(quantity)
      setAddStatus("added")
    } catch (err) {
      setAddStatus("idle")
      setAddError(err instanceof Error ? err.message : "Gagal menambahkan ke keranjang")
    }
  }

  const handleBuyNow = () => {
    if (isOutOfStock || !selectedVariant) return
    const target = `/checkout?buyNow=1&variantId=${selectedVariant.id}&quantity=${quantity}`
    if (!isAuthenticated()) {
      router.push(`/login?redirect=${encodeURIComponent(target)}`)
      return
    }
    router.push(target)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-28 sm:px-6 sm:pt-8 lg:py-12">
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 font-jakarta text-xs text-muted sm:mb-8 sm:gap-2 sm:text-sm" aria-label="Breadcrumb">
        <Link
          href="/"
          className="inline-flex min-h-11 min-w-11 items-center justify-center transition-colors hover:text-primary"
        >
          Beranda
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href="/products"
          className="inline-flex min-h-11 min-w-11 items-center justify-center transition-colors hover:text-primary"
        >
          Produk
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-primary" aria-current="page">
          {product.name}
        </span>
      </nav>

      <div className="grid gap-6 sm:gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-card">
            <ProductVisual
              name={product.name}
              origin={product.origin}
              roastLevel={product.roastLevel}
              weight={selectedWeight}
              imageSrc={
                product.imageBase64
                  ? `data:image/jpeg;base64,${product.imageBase64}`
                  : null
              }
              variant="detail"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          <div className="mt-2 flex items-center justify-between border border-border bg-paper px-3 py-2.5 sm:mt-3 sm:px-4 sm:py-3">
            <span className="font-jakarta text-xs font-medium text-muted">Asal</span>
            <span className="font-jakarta text-sm font-semibold text-primary">{product.origin}</span>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-primary text-background">
              {product.category === "ARABICA" ? "Arabika" : "Robusta"}
            </span>
            <span className="badge border border-border text-muted">
              {roastLabel}
            </span>
          </div>

          <h1 className="mt-3 font-display text-3xl font-semibold leading-[1.05] tracking-[-0.03em] text-primary sm:mt-4 sm:text-5xl">
            {product.name}
          </h1>

          {variants.length > 0 && (
            <div className="mt-5 sm:mt-6">
              <p className="eyebrow">Pilih berat</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Pilih berat produk">
                {variants.map((variant) => {
                  const active = variant.id === selectedVariant?.id
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => handleSelectVariant(variant.id)}
                      aria-pressed={active}
                      className={
                        active
                          ? "min-h-11 rounded-md border border-primary bg-primary px-3.5 font-jakarta text-sm font-semibold text-background"
                          : "min-h-11 rounded-md border border-border bg-paper px-3.5 font-jakarta text-sm font-medium text-primary transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-45"
                      }
                      disabled={variant.stock === 0}
                    >
                      {variant.weight}
                      {variant.stock === 0 ? " · habis" : ""}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 sm:mt-5 sm:gap-x-3">
            <span className="font-jakarta text-xl font-bold text-primary sm:text-2xl">
              {formatPrice(selectedPrice)}
            </span>
            <span className="font-jakarta text-xs text-muted sm:text-sm">/ {selectedWeight}</span>
          </div>

          <p className="mt-4 max-w-xl font-jakarta text-[13px] leading-6 text-muted sm:mt-6 sm:text-sm sm:leading-7 md:text-base">
            {product.description || "Belum ada deskripsi untuk produk ini."}
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-y border-border py-5 sm:mt-7 sm:gap-x-6 sm:gap-y-5 sm:py-6">
            <div>
              <dt className="eyebrow">Roast level</dt>
              <dd className="mt-1.5 font-jakarta text-sm font-semibold text-primary">
                {product.roastLevel} dari 5
              </dd>
              <HashLink
                href="/#panduan-roast"
                className="mt-1 inline-flex min-h-11 items-center font-jakarta text-xs font-semibold text-primary underline underline-offset-4"
              >
                Pelajari panduan roast
              </HashLink>
            </div>
            <div>
              <dt className="eyebrow">Ketersediaan</dt>
              <dd className="mt-1.5 font-jakarta text-sm font-semibold text-primary">
                {isOutOfStock
                  ? "Stok habis"
                  : `${selectedVariant?.stock ?? 0} tersedia`}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="eyebrow">Catatan rasa</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {flavorNotes.length > 0 ? (
                  flavorNotes.map((note) => (
                    <span
                      key={note}
                      className="rounded-sm border border-border bg-paper px-2.5 py-1 font-jakarta text-xs font-medium text-primary"
                    >
                      {note}
                    </span>
                  ))
                ) : (
                  <span className="font-jakarta text-sm text-muted">Belum dicantumkan</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-5 sm:mt-6">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <div
                className="inline-flex min-h-12 items-center rounded-md border border-border bg-paper"
                role="group"
                aria-label="Jumlah produk"
              >
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="flex h-12 w-12 items-center justify-center text-primary transition-colors hover:bg-primary/5 disabled:opacity-40"
                  aria-label="Kurangi jumlah"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="w-10 text-center font-jakarta text-sm font-semibold text-primary" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                  disabled={quantity >= maxQuantity || isOutOfStock}
                  className="flex h-12 w-12 items-center justify-center text-primary transition-colors hover:bg-primary/5 disabled:opacity-40"
                  aria-label="Tambah jumlah"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <button
                ref={addToCartButtonRef}
                type="button"
                onClick={() => void handleAddToCart()}
                disabled={isOutOfStock || addStatus === "loading"}
                className="button button-outline min-h-12 flex-1 text-sm sm:text-base"
              >
                {isOutOfStock ? (
                  "Stok habis"
                ) : addStatus === "loading" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    <span className="sm:hidden">Memuat</span>
                    <span className="hidden sm:inline">Menambahkan</span>
                  </>
                ) : addStatus === "added" ? (
                  <>
                    <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span className="sm:hidden">Lagi</span>
                    <span className="hidden sm:inline">Tambah lagi</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span className="sm:hidden">Tambah</span>
                    <span className="hidden sm:inline">Tambah ke keranjang</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="button button-primary min-h-12 flex-1 text-sm sm:text-base"
              >
                <ShoppingBag className="mr-2 h-4 w-4" aria-hidden="true" />
                <span className="sm:hidden">Beli</span>
                <span className="hidden sm:inline">Beli langsung</span>
              </button>
            </div>

            {addError && (
              <p role="alert" className="mt-3 font-jakarta text-sm text-danger">
                {addError}
              </p>
            )}

            {addStatus === "added" && (
              <div
                className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-success/25 bg-success/5 px-4 py-3"
                role="status"
              >
                <p className="font-jakarta text-sm font-medium text-success">
                  {addedQuantity} item ditambahkan ke keranjang.
                </p>
                <Link
                  href="/cart"
                  className="inline-flex min-h-11 items-center font-jakarta text-sm font-semibold text-primary underline"
                >
                  Buka keranjang
                </Link>
              </div>
            )}

            <Link
              href="/products"
              className="mt-6 inline-flex min-h-11 items-center gap-2 font-jakarta text-sm font-medium text-muted transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Kembali ke katalog
            </Link>
          </div>
        </div>
      </div>

      {showStickyCta && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(42,26,18,0.08)] lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-jakarta text-xs text-muted">{product.name}</p>
              <p className="font-jakarta text-sm font-semibold text-primary">
                {formatPrice(selectedPrice)} · {selectedWeight}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleAddToCart()}
              disabled={isOutOfStock || addStatus === "loading"}
              className="button button-outline min-h-12 shrink-0 px-3"
              aria-label={
                isOutOfStock
                  ? `Stok ${product.name} habis`
                  : `Tambah ${product.name} ke keranjang`
              }
            >
              {isOutOfStock ? (
                "Stok habis"
              ) : addStatus === "loading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Menambahkan
                </>
              ) : addStatus === "added" ? (
                <>
                  <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                  Tambah lagi
                </>
              ) : (
                <>
                  <ShoppingBag className="mr-2 h-4 w-4" aria-hidden="true" />
                  Tambah
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className="button button-primary min-h-12 shrink-0 px-4"
            >
              Beli
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="aspect-square rounded-lg bg-card" />
        </div>
      }
    >
      <ProductDetailContent />
    </Suspense>
  )
}
