"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Loader2, Plus } from "lucide-react"
import { cn, formatPrice } from "@/lib/utils"
import { getRoastLevelLabel } from "@/lib/roast-levels"
import { cartApi } from "@/services/api"
import { ProductVisual } from "./product-visual"

export interface ProductCardProps {
  product: {
    id: number
    name: string
    origin: string
    roastLevel: 1 | 2 | 3 | 4 | 5
    price: number
    weight: string
    image: string | null
    category: string
    stock: number
    isActive: boolean
    variants: {
      id: number
      weight: string
      price: number
      stock: number
    }[]
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter()
  const [status, setStatus] = useState<"idle" | "loading" | "added" | "error">("idle")
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    product.variants[0]?.id ?? null
  )

  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    product.variants[0]
  const isOutOfStock =
    !selectedVariant || selectedVariant.stock === 0 || !product.isActive
  const selectedPrice = selectedVariant?.price ?? product.price
  const selectedWeight = selectedVariant?.weight ?? product.weight
  const roastLabel = getRoastLevelLabel(product.roastLevel)
  const buyNowHref = selectedVariant
    ? `/checkout?buyNow=1&variantId=${selectedVariant.id}&quantity=1`
    : `/product?id=${product.id}`

  useEffect(() => {
    if (status === "idle" || status === "loading") return
    const timer = window.setTimeout(() => setStatus("idle"), status === "added" ? 1800 : 2200)
    return () => window.clearTimeout(timer)
  }, [status])

  const handleAddToCart = async () => {
    if (isOutOfStock || !selectedVariant || status === "loading") return
    setStatus("loading")
    try {
      await cartApi.addToCart(selectedVariant.id, 1)
      setStatus("added")
    } catch {
      setStatus("error")
    }
  }

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-paper transition-colors hover:border-primary/40">
      <Link
        href={`/product?id=${product.id}`}
        className="relative block aspect-square overflow-hidden border-b border-border sm:aspect-[4/5]"
        aria-label={`Lihat detail ${product.name}`}
      >
        <ProductVisual
          name={product.name}
          origin={product.origin}
          roastLevel={product.roastLevel}
          weight={selectedWeight}
          imageSrc={product.image}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
        />
        <span className="absolute left-2 top-2 rounded-sm bg-background/90 px-1.5 py-1 font-jakarta text-[9px] font-semibold uppercase tracking-[0.12em] text-primary sm:left-3 sm:top-3 sm:px-2 sm:text-[10px]">
          {product.category === "ARABICA" ? "Arabika" : "Robusta"}
        </span>
        <span className="absolute right-2 top-2 rounded-sm bg-background/90 px-1.5 py-1 font-jakarta text-[9px] font-semibold uppercase tracking-[0.1em] text-primary sm:hidden">
          Roast {String(product.roastLevel).padStart(2, "0")}
        </span>
        {isOutOfStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-primary/60">
            <span className="rounded-sm bg-background px-3 py-1.5 font-jakarta text-xs font-semibold text-primary sm:text-sm">
              Stok habis
            </span>
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-2.5 sm:p-4">
        <Link
          href={`/product?id=${product.id}`}
          className="flex min-h-11 items-center"
        >
          <h3 className="line-clamp-1 font-jakarta text-sm font-semibold text-primary transition-colors group-hover:text-accent sm:text-base">
            {product.name}
          </h3>
        </Link>
        <p className="mt-0.5 line-clamp-1 font-jakarta text-[11px] text-muted sm:mt-1 sm:text-xs">
          {product.origin}
        </p>

        <div className="mt-3 hidden items-center gap-1.5 sm:flex" title={roastLabel}>
          <span className="flex items-center gap-1" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((level) => (
              <span
                key={level}
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  level <= product.roastLevel ? "bg-primary" : "border border-primary/40"
                )}
              />
            ))}
          </span>
          <span className="font-jakarta text-[11px] text-muted">{roastLabel}</span>
        </div>

        <div className="mt-auto pt-1.5 sm:pt-4">
          {product.variants.length > 1 && (
            <label className="mb-1.5 block">
              <span className="sr-only">Pilih berat {product.name}</span>
              <select
                value={selectedVariant?.id ?? ""}
                onChange={(event) => {
                  setSelectedVariantId(Number(event.target.value))
                  setStatus("idle")
                }}
                className="min-h-9 w-full rounded-md border border-border bg-background px-2 font-jakarta text-[11px] font-medium text-primary outline-none focus:border-primary sm:min-h-10 sm:text-xs"
              >
                {product.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.weight}
                    {variant.stock === 0 ? " (habis)" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-jakarta text-sm font-bold text-primary sm:text-lg">
              {formatPrice(selectedPrice)}
            </span>
            <span className="font-jakarta text-[11px] text-muted sm:text-xs">/ {selectedWeight}</span>
          </div>
          <p
            className={cn(
              "mt-0.5 font-jakarta text-[10px] font-semibold sm:mt-1 sm:text-[11px]",
              !isOutOfStock && (selectedVariant?.stock ?? 0) > 5 && "hidden sm:block",
              isOutOfStock
                ? "text-danger"
                : (selectedVariant?.stock ?? 0) <= 5
                  ? "text-accent"
                  : "text-muted"
            )}
          >
            {isOutOfStock
              ? "Stok habis"
              : (selectedVariant?.stock ?? 0) <= 5
                ? `Sisa ${selectedVariant?.stock ?? 0}`
                : `Stok ${selectedVariant?.stock ?? 0}`}
          </p>

          <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:mt-3 sm:gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock || status === "loading"}
            className={cn(
              "flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md px-2 font-jakarta text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-3 sm:text-sm",
              status === "added"
                ? "bg-success text-white"
                : "bg-primary text-white hover:bg-primary/90"
            )}
            aria-live="polite"
          >
            {isOutOfStock ? (
              "Stok habis"
            ) : status === "loading" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" aria-hidden="true" />
                <span className="sm:hidden">Memuat</span>
                <span className="hidden sm:inline">Menambahkan</span>
              </>
            ) : status === "added" ? (
              <>
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                <span className="sm:hidden">Lagi</span>
                <span className="hidden sm:inline">Tambah lagi</span>
              </>
            ) : status === "error" ? (
              <>
                <span className="sm:hidden">Coba lagi</span>
                <span className="hidden sm:inline">Gagal, coba lagi</span>
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                <span className="sm:hidden">Tambah</span>
                <span className="hidden sm:inline">Tambah ke keranjang</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.push(buyNowHref)}
            disabled={isOutOfStock}
            className="flex min-h-11 w-full items-center justify-center rounded-md border border-primary bg-paper px-2 font-jakarta text-xs font-semibold text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm"
          >
            <span className="sm:hidden">Beli</span>
            <span className="hidden sm:inline">Beli langsung</span>
          </button>
          </div>
        </div>
      </div>
    </article>
  )
}
