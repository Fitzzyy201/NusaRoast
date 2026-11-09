import Link from "next/link"
import { Coffee } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-background px-4 py-14">
      <div className="w-full max-w-lg rounded-lg border border-border bg-paper px-6 py-12 text-center sm:px-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-card text-primary">
          <Coffee className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="eyebrow mt-6">Halaman tidak ditemukan</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.025em] text-primary">
          Halaman ini tidak tersedia
        </h1>
        <p className="mt-3 font-jakarta text-sm leading-7 text-muted">
          Tautan yang Anda buka mungkin sudah berubah atau tidak lagi tersedia.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/" className="button button-primary">
            Kembali ke beranda
          </Link>
          <Link href="/products" className="button button-outline">
            Lihat katalog kopi
          </Link>
        </div>
      </div>
    </div>
  )
}
