"use client"

import { Mail, MessageCircle, Globe, MapPin } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"

export default function KontakPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-paper">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
          <BackButton />
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-primary sm:text-4xl">
            Kontak Kami
          </h1>
          <p className="mt-2 font-jakarta text-sm leading-6 text-muted sm:text-base">
            Punya pertanyaan seputar produk atau pesanan? Hubungi kami melalui saluran di bawah ini.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-paper p-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/5 text-primary">
              <Mail className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold text-primary">Email (Gmail)</h2>
            <p className="mt-2 font-jakarta text-sm text-muted">Kirim pertanyaan via email</p>
            <a
              href="mailto:nusaroastadmin@gmail.com"
              className="mt-4 inline-block font-jakarta text-sm font-semibold text-primary underline underline-offset-2 hover:text-accent"
            >
              nusaroastadmin@gmail.com
            </a>
          </div>

          <div className="rounded-lg border border-border bg-paper p-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/5 text-primary">
              <MessageCircle className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold text-primary">WhatsApp</h2>
            <p className="mt-2 font-jakarta text-sm text-muted">Chat langsung dengan admin</p>
            <a
              href="https://wa.me/628388198544"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block font-jakarta text-sm font-semibold text-primary underline underline-offset-2 hover:text-accent"
            >
              +62 838-8198-544
            </a>
          </div>

          <div className="rounded-lg border border-border bg-paper p-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/5 text-primary">
              <Globe className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold text-primary">Instagram</h2>
            <p className="mt-2 font-jakarta text-sm text-muted">Ikuti update terbaru kami</p>
            <a
              href="https://instagram.com/nusaroast"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block font-jakarta text-sm font-semibold text-primary underline underline-offset-2 hover:text-accent"
            >
              @nusaroast
            </a>
          </div>
        </div>

        <div className="mt-10 rounded-lg border border-border bg-paper p-6">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 className="font-display text-xl font-semibold text-primary">Gudang & Roastery</h2>
          </div>
          <p className="mt-3 font-jakarta text-sm leading-6 text-muted">
            Bekasi Barat, Kota Bekasi, Jawa Barat.<br />
            Jam operasional: Senin - Sabtu, 09.00 - 17.00 WIB.
          </p>
        </div>
      </div>
    </div>
  )
}
