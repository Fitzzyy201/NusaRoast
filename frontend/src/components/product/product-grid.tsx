"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { ProductCard, ProductCardProps } from "./product-card"
import { productApi, Product } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface ProductGridProps {
  category?: string
  search?: string
  limit?: number
  showLoadMore?: boolean
  showCategories?: boolean
  viewAllHref?: string
  title?: string
  subtitle?: string
}

const CATEGORIES = [
  { value: "all", label: "Semua" },
  { value: "ARABICA", label: "Arabika" },
  { value: "ROBUSTA", label: "Robusta" },
] as const

function mapProductToCardProps(product: Product): ProductCardProps["product"] {
  return {
    id: product.id,
    name: product.name,
    origin: product.origin,
    roastLevel: product.roastLevel as 1 | 2 | 3 | 4 | 5,
    price: product.price,
    weight: product.weight || "250g",
    image: product.imageBase64 ? `data:image/jpeg;base64,${product.imageBase64}` : null,
    category: product.category,
    stock: product.stock,
    isActive: product.isActive,
    variants: (product.variants ?? []).map((variant) => ({
      id: variant.id,
      weight: variant.weight,
      price: variant.price,
      stock: variant.stock,
    })),
  }
}

export function ProductGrid({
  category: categoryProp,
  search,
  limit = 8,
  showLoadMore = true,
  showCategories = false,
  viewAllHref,
  title = "Pilihan Biji Kopi",
  subtitle = "Biji kopi single origin dari berbagai daerah Indonesia, dipanggang untuk menjaga kesegarannya.",
}: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const requestIdRef = useRef(0)

  const activeCategory = selectedCategory ?? categoryProp ?? "all"
  const apiCategory = activeCategory === "all" ? undefined : activeCategory

  useEffect(() => {
    const requestId = ++requestIdRef.current
    const run = async () => {
      await Promise.resolve()
      if (requestId !== requestIdRef.current) return
      setLoading(true)
      setLoadingMore(false)
      setError(null)
      setLoadMoreError(null)
      setProducts([])
      setTotal(0)
      setHasMore(false)
      setPage(1)
      try {
        const data = await productApi.getProducts(1, limit, apiCategory, search)
        if (requestId !== requestIdRef.current) return
        setProducts(data.items)
        setTotal(data.total)
        setHasMore(1 < data.totalPages)
        setPage(1)
      } catch (err) {
        if (requestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : "Gagal memuat produk")
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    }
    void run()
  }, [apiCategory, search, limit, reloadKey])

  const handleLoadMore = async () => {
    if (loadingMore) return
    const requestId = requestIdRef.current
    const nextPage = page + 1
    try {
      setLoadingMore(true)
      setLoadMoreError(null)
      const data = await productApi.getProducts(nextPage, limit, apiCategory, search)
      if (requestId !== requestIdRef.current) return
      setProducts((prev) => [...prev, ...data.items])
      setHasMore(nextPage < data.totalPages)
      setPage(nextPage)
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setLoadMoreError(err instanceof Error ? err.message : "Gagal memuat produk")
      }
    } finally {
      if (requestId === requestIdRef.current) setLoadingMore(false)
    }
  }

  const isInitialLoading = loading && products.length === 0
  const clearSearchHref =
    activeCategory === "all" ? "/products" : `/products?category=${activeCategory}`
  const clearCategoryHref = search
    ? `/products?search=${encodeURIComponent(search)}`
    : "/products"
  const viewAllTarget = viewAllHref
    ? `${viewAllHref}${
        activeCategory !== "all"
          ? `${viewAllHref.includes("?") ? "&" : "?"}category=${activeCategory}`
          : ""
      }`
    : null

  return (
    <section id="pilihan-biji-kopi" className="scroll-mt-24 border-b border-border bg-background py-5 sm:py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-2 flex flex-col gap-3 border-b border-border pb-3 sm:mb-8 sm:gap-5 sm:pb-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">{search ? "Pencarian" : "Pilihan roastery"}</p>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.025em] text-primary sm:mt-2 sm:text-4xl">
              {search ? `Hasil untuk "${search}"` : title}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 sm:mt-2">
              <p
                aria-live="polite"
                className="font-jakarta text-[13px] leading-5 text-muted sm:text-sm sm:leading-relaxed md:text-base"
              >
                {search
                  ? loading
                    ? "Mencari produk..."
                    : error
                      ? "Pencarian gagal dimuat."
                      : `${total} produk ditemukan.`
                  : subtitle}
              </p>
              {search && (
                <Link
                  href={clearSearchHref}
                  className="inline-flex min-h-11 items-center font-jakarta text-xs font-semibold text-primary underline underline-offset-4 sm:text-sm"
                >
                  Hapus pencarian
                </Link>
              )}
            </div>
          </div>

          {showCategories && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter kategori">
              {CATEGORIES.map((cat) => {
                const active = activeCategory === cat.value
                return (
                  <button
                    key={cat.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={cn(
                      "min-h-11 rounded-md px-3 font-jakarta text-xs font-medium transition-colors sm:px-3.5 sm:text-sm",
                      active
                        ? "bg-primary text-white"
                        : "text-muted hover:bg-primary/5 hover:text-primary"
                    )}
                  >
                    {cat.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {isInitialLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-lg border border-border bg-paper">
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="space-y-2 p-3 sm:space-y-3 sm:p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-full sm:h-9" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-border bg-paper p-6 text-center sm:p-10">
            <h3 className="font-display text-xl font-semibold text-primary sm:text-2xl">Katalog gagal dimuat</h3>
            <p className="mt-2 font-jakarta text-sm text-muted">{error}</p>
            <p className="mt-1 font-jakarta text-sm text-muted">
              Periksa koneksi ke server lalu coba lagi.
            </p>
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Coba lagi
            </Button>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-border bg-paper p-6 text-center sm:p-10">
            <h3 className="font-display text-xl font-semibold text-primary sm:text-2xl">
              {search
                ? "Tidak ada hasil"
                : activeCategory !== "all"
                  ? "Kategori ini masih kosong"
                  : "Belum ada produk"}
            </h3>
            <p className="mt-2 font-jakarta text-sm text-muted">
              {search
                ? `Tidak ada produk yang cocok dengan "${search}". Coba kata kunci atau kategori lain.`
                : activeCategory !== "all"
                  ? "Coba lihat kategori lain untuk menemukan kopi yang tersedia."
                  : "Produk akan muncul di sini setelah ditambahkan oleh penjual."}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {activeCategory !== "all" &&
                (showCategories ? (
                  <Button variant="outline" onClick={() => setSelectedCategory("all")}>
                    Lihat semua kategori
                  </Button>
                ) : (
                  <Link href={clearCategoryHref} className="button button-outline">
                    Lihat semua kategori
                  </Link>
                ))}
              <Link
                href="/products"
                className="inline-flex min-h-11 items-center font-jakarta text-sm font-semibold text-primary underline underline-offset-4"
              >
                Lihat katalog lengkap
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={mapProductToCardProps(product)} />
              ))}
            </div>
            {loadMoreError && (
              <div
                className="mt-5 rounded-md border border-danger/20 bg-danger/5 px-4 py-3 text-center sm:mt-8"
                role="alert"
              >
                <p className="font-jakarta text-sm text-danger">
                  Produk tambahan gagal dimuat. Produk yang sudah tampil tetap bisa dilihat.
                </p>
                <p className="mt-1 font-jakarta text-xs text-muted">{loadMoreError}</p>
              </div>
            )}
            {showLoadMore && (viewAllTarget ? products.length > 0 : hasMore) && (
              <div className="mt-6 text-center sm:mt-10">
                {viewAllTarget ? (
                  <Link href={viewAllTarget} className="button button-outline">
                    Lihat selengkapnya
                  </Link>
                ) : (
                  <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
                    {loadingMore ? "Memuat..." : loadMoreError ? "Coba muat lagi" : "Muat lebih banyak"}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
