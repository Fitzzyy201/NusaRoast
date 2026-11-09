"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Check, Coffee, Loader2, Search, X } from "lucide-react"
import { Product, Promotion, PromotionCreateData } from "@/services/api"
import { cn, formatPrice } from "@/lib/utils"

interface PromotionFormDialogProps {
  promotion: Promotion | null
  products: Product[]
  initialProductId?: number | null
  saving: boolean
  error: string | null
  onClose: () => void
  onSubmit: (data: PromotionCreateData) => Promise<void>
}

function imageSource(image: string | null): string | null {
  if (!image) return null
  return image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`
}

export function PromotionFormDialog({
  promotion,
  products,
  initialProductId,
  saving,
  error,
  onClose,
  onSubmit,
}: PromotionFormDialogProps) {
  const currentProductId = promotion?.product.id
  const selectableProducts = products.filter(
    (product) => product.isActive || product.id === currentProductId
  )
  const [productId, setProductId] = useState(
    currentProductId
      ? String(currentProductId)
      : initialProductId
        ? String(initialProductId)
        : ""
  )
  const [productSearch, setProductSearch] = useState("")
  const [title, setTitle] = useState(promotion?.title ?? "")
  const [description, setDescription] = useState(promotion?.description ?? "")
  const [sortOrder, setSortOrder] = useState(String(promotion?.sortOrder ?? 0))
  const [localError, setLocalError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const savingRef = useRef(saving)
  const onCloseRef = useRef(onClose)

  const selectedProduct = selectableProducts.find(
    (product) => String(product.id) === productId
  )
  const normalizedSearch = productSearch.trim().toLowerCase()
  const filteredProducts = normalizedSearch
    ? selectableProducts.filter((product) =>
        [
          product.name,
          product.origin,
          product.category === "ARABICA" ? "Arabika" : "Robusta",
        ].some((value) => value.toLowerCase().includes(normalizedSearch))
      )
    : selectableProducts

  useEffect(() => {
    savingRef.current = saving
    if (saving) dialogRef.current?.focus()
  }, [saving])

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    document.body.style.overflow = "hidden"
    titleInputRef.current?.focus()

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !savingRef.current) {
        onCloseRef.current()
        return
      }

      if (event.key !== "Tab" || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
        )
      )
      if (focusable.length === 0) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", handleKey)
      previousFocus?.focus()
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLocalError(null)

    const parsedProductId = Number(productId)
    const parsedSortOrder = Number(sortOrder)
    if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
      setLocalError("Pilih produk yang akan dipromosikan.")
      return
    }
    if (title.trim().length < 3) {
      setLocalError("Judul promosi minimal 3 karakter.")
      return
    }
    if (description.trim().length < 10) {
      setLocalError("Deskripsi promosi minimal 10 karakter.")
      return
    }
    if (!Number.isInteger(parsedSortOrder) || parsedSortOrder < 0 || parsedSortOrder > 99) {
      setLocalError("Urutan promosi harus bilangan bulat 0 sampai 99.")
      return
    }

    await onSubmit({
      productId: parsedProductId,
      title: title.trim(),
      description: description.trim(),
      sortOrder: parsedSortOrder,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-primary/50 p-4 sm:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promotion-dialog-title"
        aria-describedby="promotion-dialog-description"
        aria-busy={saving || undefined}
        tabIndex={-1}
        className="my-auto w-full max-w-xl rounded-lg border border-border bg-paper shadow-2xl focus:outline-none"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 id="promotion-dialog-title" className="font-display text-2xl font-semibold text-primary">
              {promotion ? "Ubah promosi" : "Promosi baru"}
            </h2>
            <p id="promotion-dialog-description" className="mt-1 font-jakarta text-xs text-muted">
              Promosi tampil sebagai iklan bergulir di halaman utama.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted hover:bg-primary/5 hover:text-primary disabled:opacity-50"
            aria-label="Tutup formulir promosi"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          {(localError || error) && (
            <div role="alert" className="rounded-md border border-danger/25 bg-danger/5 px-3.5 py-3">
              <p className="font-jakarta text-sm font-medium text-danger">{localError ?? error}</p>
            </div>
          )}

          <div>
            <label id="promotion-product-label" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
              Produk
            </label>
            {selectableProducts.length === 0 ? (
              <div className="rounded-md border border-border bg-background px-4 py-5">
                <p className="font-jakarta text-sm font-medium text-primary">Belum ada produk aktif.</p>
                <p className="mt-1 font-jakarta text-xs text-muted">
                  Tambahkan atau aktifkan produk terlebih dahulu sebelum membuat promosi.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="promotion-product-search"
                    type="search"
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    className="input pl-9"
                    placeholder="Cari nama, origin, atau kategori"
                    aria-label="Cari produk untuk promosi"
                    autoComplete="off"
                  />
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-background px-4 py-6 text-center">
                    <p className="font-jakarta text-sm font-medium text-primary">
                      Produk tidak ditemukan.
                    </p>
                    <button
                      type="button"
                      onClick={() => setProductSearch("")}
                      className="mt-2 font-jakarta text-xs font-semibold text-primary underline underline-offset-2"
                    >
                      Hapus pencarian
                    </button>
                  </div>
                ) : (
                  <div
                    role="group"
                    aria-labelledby="promotion-product-label"
                    className="max-h-72 space-y-2 overflow-y-auto pr-1"
                  >
                    {filteredProducts.map((product) => {
                      const selected = String(product.id) === productId

                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => setProductId(String(product.id))}
                          aria-pressed={selected}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors",
                            selected
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background hover:border-primary/40 hover:bg-primary/5"
                          )}
                        >
                          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
                            {imageSource(product.imageBase64) ? (
                              <Image
                                src={imageSource(product.imageBase64) as string}
                                alt={product.name}
                                fill
                                unoptimized
                                className="object-cover"
                                sizes="56px"
                              />
                            ) : (
                              <Coffee className="h-5 w-5 text-muted" aria-hidden="true" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-jakarta text-sm font-semibold text-primary">
                              {product.name}
                            </span>
                            <span className="mt-0.5 block truncate font-jakarta text-xs text-muted">
                              {product.origin} · {(product.variants?.length ?? 0)} varian · Mulai{" "}
                              {formatPrice(product.price)}
                            </span>
                            <span
                              className={cn(
                                "mt-0.5 block font-jakarta text-xs font-semibold",
                                product.stock === 0 ? "text-danger" : "text-muted"
                              )}
                            >
                              {product.stock === 0
                                ? "Stok habis"
                                : `Total stok ${product.stock}`}
                              {product.isActive ? "" : " · Nonaktif"}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                              selected
                                ? "border-primary bg-primary text-background"
                                : "border-border bg-background"
                            )}
                            aria-hidden="true"
                          >
                            {selected && <Check className="h-3 w-3" />}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedProduct && (
            <div className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
              <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
                {imageSource(selectedProduct.imageBase64) ? (
                  <Image
                    src={imageSource(selectedProduct.imageBase64) as string}
                    alt={selectedProduct.name}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <Coffee className="h-5 w-5 text-muted" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate font-jakarta text-sm font-semibold text-primary">
                  {selectedProduct.name}
                </p>
                <p className="mt-0.5 truncate font-jakarta text-xs text-muted">
                  {selectedProduct.origin} · {(selectedProduct.variants?.length ?? 0)} varian · Mulai{" "}
                  {formatPrice(selectedProduct.price)}
                </p>
                <p
                  className={cn(
                    "mt-0.5 font-jakarta text-xs font-semibold",
                    selectedProduct.stock === 0 ? "text-danger" : "text-muted"
                  )}
                >
                  {selectedProduct.stock === 0
                    ? "Stok habis"
                    : `Total stok ${selectedProduct.stock}`}
                </p>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="promotion-title" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
              Judul promosi
            </label>
            <input
              ref={titleInputRef}
              id="promotion-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={120}
              className="input"
              placeholder="Contoh: Gayo spesial minggu ini"
            />
            <p className="mt-1.5 font-jakarta text-xs text-muted">3–120 karakter.</p>
          </div>

          <div>
            <label htmlFor="promotion-description" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
              Deskripsi
            </label>
            <textarea
              id="promotion-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              maxLength={400}
              rows={3}
              className="input min-h-24 resize-y py-2.5"
              placeholder="Jelaskan alasan pembeli perlu mencoba produk ini."
            />
            <p className="mt-1.5 font-jakarta text-xs text-muted">10–400 karakter.</p>
          </div>

          <div>
            <label htmlFor="promotion-order" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
              Urutan tampil
            </label>
            <input
              id="promotion-order"
              type="number"
              min={0}
              max={99}
              step={1}
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              required
              className="input"
            />
            <p className="mt-1.5 font-jakarta text-xs text-muted">
              Angka lebih kecil tampil lebih awal.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className="button button-outline">
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || selectableProducts.length === 0}
              className="button button-primary"
              aria-busy={saving || undefined}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Menyimpan
                </>
              ) : promotion ? (
                "Simpan perubahan"
              ) : (
                "Tambah promosi"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
