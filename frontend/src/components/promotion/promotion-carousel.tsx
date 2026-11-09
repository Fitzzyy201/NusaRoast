"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Coffee, Megaphone, Pause, Play } from "lucide-react"
import { cn, formatPrice } from "@/lib/utils"
import { promotionApi, Promotion } from "@/services/api"
import { ProductVisual } from "@/components/product/product-visual"

function imageSource(image: string | null): string | null {
  if (!image) return null
  return image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`
}

function PromotionCarouselSkeleton() {
  return (
    <section
      className="border-b border-border bg-paper"
      aria-label="Promosi pilihan"
      aria-busy="true"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div className="overflow-hidden rounded-lg border border-border bg-primary">
          <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
            <div className="min-h-52 animate-pulse bg-background/10 sm:min-h-64 lg:min-h-80" />
            <div className="p-5 sm:p-8 lg:p-10">
              <div className="h-3 w-28 animate-pulse rounded bg-background/15" />
              <div className="mt-3 h-10 w-4/5 animate-pulse rounded bg-background/15" />
              <div className="mt-4 h-16 w-full animate-pulse rounded bg-background/15" />
              <div className="mt-5 h-8 w-40 animate-pulse rounded bg-background/15" />
              <div className="mt-5 h-11 w-32 animate-pulse rounded bg-background/15" />
              <div className="mt-5 flex items-center justify-between border-t border-background/15 pt-3">
                <div className="h-4 w-10 animate-pulse rounded bg-background/15" />
                <div className="h-11 w-36 animate-pulse rounded bg-background/15" />
              </div>
            </div>
          </div>
        </div>
        <span className="sr-only" role="status">
          Memuat promosi
        </span>
      </div>
    </section>
  )
}

export function PromotionCarousel() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [manualPaused, setManualPaused] = useState(false)
  const [hoverPaused, setHoverPaused] = useState(false)
  const [focusPaused, setFocusPaused] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const isPaused = manualPaused || hoverPaused || focusPaused || reduceMotion

  useEffect(() => {
    let cancelled = false

    promotionApi
      .getPromotions()
      .then((data) => {
        if (cancelled) return
        setPromotions(data)
        setActiveIndex(0)
      })
      .catch(() => {
        if (!cancelled) setPromotions([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduceMotion(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    if (promotions.length <= 1 || isPaused) return

    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % promotions.length)
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [activeIndex, isPaused, promotions.length])

  if (loading) return <PromotionCarouselSkeleton />
  if (promotions.length === 0) return null

  const promotion = promotions[activeIndex]
  const product = promotion.product
  const outOfStock = product.stock === 0 || !product.isActive
  const variantCount = product.variants?.length ?? 0
  const displayWeight = product.variants?.[0]?.weight ?? product.weight
  const hasMultiple = promotions.length > 1

  const showPrevious = () => {
    setActiveIndex((current) => (current - 1 + promotions.length) % promotions.length)
  }

  const showNext = () => {
    setActiveIndex((current) => (current + 1) % promotions.length)
  }

  const togglePause = () => {
    if (manualPaused) {
      setManualPaused(false)
      setFocusPaused(false)
      return
    }

    setManualPaused(true)
  }

  return (
    <section className="border-b border-border bg-paper" aria-label="Promosi pilihan">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div
          aria-roledescription="carousel"
          aria-label="Promosi produk pilihan"
          className="overflow-hidden rounded-lg border border-border bg-primary text-background"
          onMouseEnter={() => setHoverPaused(true)}
          onMouseLeave={() => setHoverPaused(false)}
          onFocus={() => setFocusPaused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setFocusPaused(false)
            }
          }}
        >
          <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
            <div className="relative min-h-52 overflow-hidden bg-card sm:min-h-64 lg:min-h-80">
              <div key={promotion.id} className="promotion-fade absolute inset-0">
                <ProductVisual
                  name={product.name}
                  origin={product.origin}
                  roastLevel={product.roastLevel}
                  weight={displayWeight}
                  imageSrc={imageSource(product.imageBase64)}
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  variant="detail"
                />
              </div>
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-sm bg-background/90 px-2.5 py-1.5 font-jakarta text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
                Promosi pilihan
              </span>
            </div>

            <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-10">
              <div key={promotion.id} className="promotion-fade">
                <p className="font-jakarta text-[10px] font-semibold uppercase tracking-[0.16em] text-background/55">
                  {product.category === "ARABICA" ? "Arabika" : "Robusta"} · {product.origin}
                  {variantCount > 0 ? ` · ${variantCount} varian` : ""}
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold leading-[1.05] tracking-[-0.03em] sm:mt-3 sm:text-4xl">
                  {promotion.title}
                </h2>
                <p className="mt-3 max-w-xl font-jakarta text-sm leading-6 text-background/70 sm:leading-7">
                  {promotion.description}
                </p>

                <div className="mt-5 flex flex-wrap items-end gap-x-5 gap-y-2">
                  <div>
                    <p className="font-jakarta text-[10px] uppercase tracking-[0.14em] text-background/55">
                      Mulai dari
                    </p>
                    <p className="font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "pb-1 font-jakarta text-xs font-semibold",
                      outOfStock
                        ? "text-background/60"
                        : product.stock <= 5
                          ? "text-warning"
                          : "text-background/60"
                    )}
                  >
                    {outOfStock
                      ? "Stok habis"
                      : product.stock <= 5
                        ? `Sisa ${product.stock}`
                        : `Total stok ${product.stock}`}
                  </p>
                </div>

                <div className="mt-5">
                  {outOfStock ? (
                    <span className="button cursor-not-allowed border border-background/20 text-background/50">
                      Stok habis
                    </span>
                  ) : (
                    <Link
                      href={`/product?id=${product.id}`}
                      className="button border border-background/25 text-background hover:bg-background/10"
                    >
                      Lihat produk
                      <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>

              {hasMultiple && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-background/15 pt-3">
                  <div className="flex min-w-0 items-center gap-0.5">
                    <div
                      className="hidden flex-wrap items-center gap-0.5 sm:flex"
                      role="group"
                      aria-label="Pilih promosi"
                    >
                      {promotions.map((item, index) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveIndex(index)}
                          aria-label={`Tampilkan promosi ${index + 1}: ${item.title}`}
                          aria-current={index === activeIndex}
                          className="flex h-11 w-11 items-center justify-center"
                        >
                          <span
                            className={cn(
                              "h-2.5 rounded-full transition-all",
                              index === activeIndex
                                ? "w-7 bg-background"
                                : "w-2.5 bg-background/35"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                    <span
                      className="font-jakarta text-xs font-semibold text-background/65 sm:hidden"
                      aria-hidden="true"
                    >
                      {activeIndex + 1} / {promotions.length}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {!reduceMotion && (
                      <button
                        type="button"
                        onClick={togglePause}
                        aria-pressed={manualPaused}
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-md border border-background/20 text-background/75 hover:bg-background/10 hover:text-background",
                          manualPaused && "bg-background/10 text-background"
                        )}
                        aria-label={
                          manualPaused
                            ? "Lanjutkan putar otomatis"
                            : "Jeda putar otomatis"
                        }
                      >
                        {manualPaused ? (
                          <Play className="h-5 w-5" aria-hidden="true" />
                        ) : (
                          <Pause className="h-5 w-5" aria-hidden="true" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={showPrevious}
                      className="flex h-11 w-11 items-center justify-center rounded-md border border-background/20 text-background/75 hover:bg-background/10 hover:text-background"
                      aria-label="Promosi sebelumnya"
                    >
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={showNext}
                      className="flex h-11 w-11 items-center justify-center rounded-md border border-background/20 text-background/75 hover:bg-background/10 hover:text-background"
                      aria-label="Promosi berikutnya"
                    >
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="sr-only" aria-live={isPaused ? "polite" : "off"} aria-atomic="true">
            Promosi {activeIndex + 1} dari {promotions.length}: {promotion.title}
          </div>
        </div>

        {hasMultiple && (
          <p className="mt-2 hidden items-center justify-end gap-1.5 font-jakarta text-[11px] text-muted sm:flex">
            <Coffee className="h-3.5 w-3.5" aria-hidden="true" />
            {activeIndex + 1} / {promotions.length}
          </p>
        )}
      </div>
    </section>
  )
}
