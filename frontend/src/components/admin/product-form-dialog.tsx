"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Loader2, Upload, X } from "lucide-react"
import { Product, ProductCreateData } from "@/services/api"
import { ROAST_LEVELS } from "@/lib/roast-levels"

interface ProductFormDialogProps {
  product: Product | null
  saving: boolean
  error: string | null
  onClose: () => void
  onSubmit: (data: ProductCreateData) => Promise<void>
}

const MAX_SOURCE_BYTES = 8_000_000
const MAX_OUTPUT_CHARS = 82_000

function readFileAsImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new window.Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Gambar tidak dapat dibaca."))
    }
    image.src = objectUrl
  })
}

async function compressImage(file: File): Promise<string> {
  const image = await readFileAsImage(file)
  const maxDimension = 900
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d")
  if (!context) throw new Error("Gambar tidak dapat diproses.")
  context.fillStyle = "#fffaf2"
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  let quality = 0.82
  let dataUrl = canvas.toDataURL("image/jpeg", quality)
  while (dataUrl.length > MAX_OUTPUT_CHARS && quality > 0.4) {
    quality -= 0.08
    dataUrl = canvas.toDataURL("image/jpeg", quality)
  }

  if (dataUrl.length > MAX_OUTPUT_CHARS) {
    throw new Error("Gambar masih terlalu besar setelah diperkecil. Pilih foto lain.")
  }

  return dataUrl.includes(",") ? dataUrl.split(",")[1] : ""
}

export function ProductFormDialog({
  product,
  saving,
  error,
  onClose,
  onSubmit,
}: ProductFormDialogProps) {
  const [name, setName] = useState(product?.name ?? "")
  const [category, setCategory] = useState<"ARABICA" | "ROBUSTA">(product?.category ?? "ARABICA")
  const [origin, setOrigin] = useState(product?.origin ?? "")
  const [description, setDescription] = useState(product?.description ?? "")
  const [flavorNotes, setFlavorNotes] = useState((product?.flavorNotes ?? []).join(", "))
  const [roastLevel, setRoastLevel] = useState(String(product?.roastLevel ?? 3))
  const [isActive, setIsActive] = useState(product?.isActive ?? true)
  const [variants, setVariants] = useState<
    { id?: number; weight: string; price: string; stock: string }[]
  >(() => {
    if (product?.variants?.length) {
      return product.variants.map((variant) => ({
        id: variant.id,
        weight: variant.weight,
        price: String(variant.price),
        stock: String(variant.stock),
      }))
    }
    return [{ weight: "250g", price: "", stock: "" }]
  })
  const [imageBase64, setImageBase64] = useState(product?.imageBase64 ?? "")
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageBusy, setImageBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const savingRef = useRef(saving)
  const imageBusyRef = useRef(imageBusy)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    savingRef.current = saving
    imageBusyRef.current = imageBusy
    if (saving || imageBusy) dialogRef.current?.focus()
  }, [saving, imageBusy])

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    document.body.style.overflow = "hidden"
    nameInputRef.current?.focus()

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !savingRef.current && !imageBusyRef.current) {
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

  const handleImage = async (file: File | undefined) => {
    setImageError(null)
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageError("Gunakan gambar JPG, PNG, atau WebP.")
      return
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setImageError("Ukuran file maksimal 8 MB.")
      return
    }

    setImageBusy(true)
    try {
      const base64 = await compressImage(file)
      if (!base64) throw new Error("Gambar tidak dapat dibaca.")
      setImageBase64(base64)
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Gambar tidak dapat dibaca.")
    } finally {
      setImageBusy(false)
    }
  }

  const updateVariant = (
    index: number,
    field: "weight" | "price" | "stock",
    value: string
  ) => {
    setVariants((current) =>
      current.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant
      )
    )
  }

  const addVariant = () => {
    setVariants((current) => [
      ...current,
      { weight: "", price: "", stock: "" },
    ])
  }

  const removeVariant = (index: number) => {
    setVariants((current) => current.filter((_, variantIndex) => variantIndex !== index))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLocalError(null)

    if (imageBusy) {
      setLocalError("Tunggu hingga gambar selesai diproses.")
      return
    }

    if (!name.trim() || !origin.trim()) {
      setLocalError("Nama dan origin produk wajib diisi.")
      return
    }

    if (variants.length === 0) {
      setLocalError("Minimal satu varian berat.")
      return
    }

    const seenWeights = new Set<string>()
    const parsedVariants: {
      id?: number
      weight: string
      price: number
      stock: number
      sortOrder: number
    }[] = []

    for (const [index, variant] of variants.entries()) {
      const weight = variant.weight.trim()
      const normalizedWeight = weight.toLowerCase().replace(/\s+/g, "")
      const price = Number(variant.price)
      const stock = Number(variant.stock)

      if (!weight) {
        setLocalError(`Berat varian ${index + 1} wajib diisi.`)
        return
      }
      if (!/^\d+(?:[.,]\d+)?\s?(?:g|kg)$/i.test(weight)) {
        setLocalError(
          `Berat varian ${index + 1} harus menggunakan format seperti 100g, 250g, atau 1kg.`
        )
        return
      }
      if (seenWeights.has(normalizedWeight)) {
        setLocalError(`Berat ${weight} duplikat.`)
        return
      }
      seenWeights.add(normalizedWeight)

      if (!Number.isFinite(price) || price <= 0) {
        setLocalError(`Harga varian ${weight} harus lebih dari 0.`)
        return
      }
      if (!Number.isInteger(stock) || stock < 0) {
        setLocalError(`Stok varian ${weight} harus berupa angka bulat 0 atau lebih.`)
        return
      }

      parsedVariants.push({
        id: variant.id,
        weight,
        price,
        stock,
        sortOrder: index,
      })
    }

    const imageForRequest = imageBase64.startsWith("data:")
      ? imageBase64.split(",")[1] ?? ""
      : imageBase64

    await onSubmit({
      name: name.trim(),
      category,
      origin: origin.trim(),
      description: description.trim() || undefined,
      flavorNotes: flavorNotes
        .split(",")
        .map((note) => note.trim())
        .filter(Boolean),
      roastLevel: Number(roastLevel),
      isActive,
      variants: parsedVariants,
      imageBase64: imageForRequest || (product ? "" : undefined),
    })
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-primary/50 p-4 sm:p-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving && !imageBusy) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-dialog-title"
        aria-describedby="product-dialog-description"
        aria-busy={saving || imageBusy || undefined}
        tabIndex={-1}
        className="my-auto w-full max-w-2xl rounded-lg border border-border bg-paper shadow-2xl focus:outline-none"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 id="product-dialog-title" className="font-display text-2xl font-semibold text-primary">
              {product ? "Ubah produk" : "Produk baru"}
            </h2>
            <p id="product-dialog-description" className="mt-1 font-jakarta text-xs text-muted">
              {product ? "Perubahan langsung diterapkan ke katalog." : "Produk aktif langsung tampil di katalog."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving || imageBusy}
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted hover:bg-primary/5 hover:text-primary disabled:opacity-50"
            aria-label="Tutup formulir produk"
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="product-name" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
                Nama produk
              </label>
              <input
                ref={nameInputRef}
                id="product-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="input"
                placeholder="Contoh: Gayo Wine Process"
              />
            </div>

            <div>
              <label htmlFor="product-category" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
                Kategori
              </label>
              <select
                id="product-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as "ARABICA" | "ROBUSTA")}
                className="input"
              >
                <option value="ARABICA">Arabika</option>
                <option value="ROBUSTA">Robusta</option>
              </select>
            </div>

            <div>
              <label htmlFor="product-origin" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
                Origin
              </label>
              <input
                id="product-origin"
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
                required
                className="input"
                placeholder="Contoh: Gayo, Aceh"
              />
            </div>

            <div>
              <label htmlFor="product-roast" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
                Roast level
              </label>
              <select
                id="product-roast"
                value={roastLevel}
                onChange={(event) => setRoastLevel(event.target.value)}
                className="input"
              >
                {ROAST_LEVELS.map((level) => (
                  <option key={level.level} value={level.level}>
                    {level.level} - {level.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-background p-3 sm:col-span-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
              />
              <span>
                <span className="block font-jakarta text-sm font-medium text-primary">
                  Produk aktif
                </span>
                <span className="mt-0.5 block font-jakarta text-xs leading-5 text-muted">
                  Produk aktif tampil di katalog. Nonaktifkan untuk menyembunyikan tanpa menghapus.
                </span>
              </span>
            </label>

            <div className="sm:col-span-2">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="font-jakarta text-sm font-medium text-primary">
                    Varian berat
                  </p>
                  <p className="mt-1 font-jakarta text-xs text-muted">
                    Setiap berat punya harga dan stok sendiri. Minimal satu varian.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addVariant}
                  disabled={variants.length >= 20}
                  className="button button-outline min-h-10 shrink-0 px-3 text-xs disabled:opacity-50"
                >
                  Tambah varian
                </button>
              </div>

              <div className="mt-3 space-y-2.5">
                {variants.map((variant, index) => (
                  <div
                    key={variant.id ?? `new-${index}`}
                    className="grid gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
                  >
                    <div>
                      <label
                        htmlFor={`variant-weight-${index}`}
                        className="mb-1 block font-jakarta text-xs font-medium text-primary"
                      >
                        Berat
                      </label>
                      <input
                        id={`variant-weight-${index}`}
                        value={variant.weight}
                        onChange={(event) => updateVariant(index, "weight", event.target.value)}
                        required
                        className="input min-h-10"
                        placeholder="250g"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`variant-price-${index}`}
                        className="mb-1 block font-jakarta text-xs font-medium text-primary"
                      >
                        Harga
                      </label>
                      <input
                        id={`variant-price-${index}`}
                        type="number"
                        min={1}
                        step={1}
                        value={variant.price}
                        onChange={(event) => updateVariant(index, "price", event.target.value)}
                        required
                        className="input min-h-10"
                        placeholder="95000"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`variant-stock-${index}`}
                        className="mb-1 block font-jakarta text-xs font-medium text-primary"
                      >
                        Stok
                      </label>
                      <input
                        id={`variant-stock-${index}`}
                        type="number"
                        min={0}
                        step={1}
                        value={variant.stock}
                        onChange={(event) => updateVariant(index, "stock", event.target.value)}
                        required
                        className="input min-h-10"
                        placeholder="20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      disabled={variants.length === 1}
                      className="min-h-10 rounded-md px-3 font-jakarta text-xs font-medium text-muted hover:bg-danger/5 hover:text-danger disabled:opacity-40"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="product-description" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
                Deskripsi
              </label>
              <textarea
                id="product-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="input min-h-24 resize-y py-2.5"
                placeholder="Karakter rasa, proses, dan cara seduh yang disarankan."
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="product-notes" className="mb-1.5 block font-jakarta text-sm font-medium text-primary">
                Catatan rasa
              </label>
              <input
                id="product-notes"
                value={flavorNotes}
                onChange={(event) => setFlavorNotes(event.target.value)}
                className="input"
                placeholder="Cokelat, jeruk, karamel"
              />
              <p className="mt-1.5 font-jakarta text-xs text-muted">Pisahkan dengan koma.</p>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="product-image"
                className="mb-1.5 block font-jakarta text-sm font-medium text-primary"
              >
                Foto produk
              </label>
              <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-3 sm:flex-row sm:items-center">
                <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
                  {imageBase64 ? (
                    <Image
                      src={
                        imageBase64.startsWith("data:")
                          ? imageBase64
                          : `data:image/jpeg;base64,${imageBase64}`
                      }
                      alt="Pratinjau produk"
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <Upload className="h-5 w-5 text-muted" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <input
                    id="product-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={imageBusy}
                    aria-describedby={
                      imageError ? "product-image-help product-image-error" : "product-image-help"
                    }
                    aria-invalid={imageError ? true : undefined}
                    onChange={(event) => {
                      void handleImage(event.target.files?.[0])
                      event.target.value = ""
                    }}
                    className="block w-full font-jakarta text-sm text-muted file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-primary file:px-3 file:font-jakarta file:text-sm file:font-semibold file:text-white hover:file:bg-primary/90 disabled:opacity-60"
                  />
                  <p id="product-image-help" className="mt-1.5 font-jakarta text-xs text-muted">
                    {imageBusy ? "Memproses gambar..." : "JPG, PNG, atau WebP, maksimal 8 MB. Gambar diperkecil otomatis."}
                  </p>
                  {imageError && (
                    <p
                      id="product-image-error"
                      role="alert"
                      className="mt-1 font-jakarta text-xs text-danger"
                    >
                      {imageError}
                    </p>
                  )}
                </div>
                {imageBase64 && (
                  <button
                    type="button"
                    onClick={() => setImageBase64("")}
                    disabled={imageBusy}
                    className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-md px-2 font-jakarta text-xs font-medium text-muted hover:text-danger disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Hapus foto
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || imageBusy}
              className="button button-outline"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || imageBusy}
              className="button button-primary"
              aria-busy={saving || imageBusy || undefined}
            >
              {saving || imageBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {imageBusy ? "Memproses gambar" : "Menyimpan"}
                </>
              ) : product ? (
                "Simpan perubahan"
              ) : (
                "Tambah produk"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
