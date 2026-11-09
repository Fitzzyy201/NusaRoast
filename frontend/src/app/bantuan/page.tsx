"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, MapPin, Package, Clock } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: "Area mana saja yang dilayani?",
    answer:
      "Kami melayani pengiriman untuk area Jawa Barat, DKI Jakarta, dan Banten dengan radius maksimal 150 km dari gudang kami di Bekasi Barat. Total 31 kota/kabupaten termasuk Jakarta Pusat, Jakarta Timur, Kota Bekasi, Tangerang, Bogor, Bandung, dan sekitarnya.",
  },
  {
    question: "Kenapa kota saya tidak ada di daftar?",
    answer:
      "Kami saat ini fokus melayani area lokal dengan kurir cepat agar kopi sampai dalam kondisi terbaik. Kota yang jaraknya lebih dari 150 km dari Bekasi Barat belum bisa kami jangkau dengan layanan kurir lokal.",
  },
  {
    question: "Kenapa ongkir berbeda-beda?",
    answer:
      "Ongkir dihitung otomatis berdasarkan jarak dari gudang ke kota Anda menggunakan sistem zona. Semakin dekat, semakin murah. Zona 1 (0-10 km) dikenakan Rp10.000 untuk pengiriman Regular, sedangkan zona terjauh (>100 km) Rp40.000.",
  },
  {
    question: "Berapa lama pengiriman?",
    answer:
      "Kurir Lokal NusaRoast (Regular): estimasi 2-4 jam. Express NusaRoast: estimasi 1-2 jam. Waktu dihitung sejak pesanan dibayar dan dikemas di hari yang sama.",
  },
  {
    question: "Apakah bisa menggunakan JNE/JNT?",
    answer:
      "Saat ini kami hanya menggunakan kurir lokal sendiri agar kopi yang baru dipanggang (freshly roasted) sampai ke tangan Anda secepat mungkin dengan kondisi terbaik.",
  },
]

const zones = [
  { name: "Zona 1", range: "0-10 km", regular: 10000, fast: 15000 },
  { name: "Zona 2", range: "10-25 km", regular: 15000, fast: 22000 },
  { name: "Zona 3", range: "25-50 km", regular: 20000, fast: 30000 },
  { name: "Zona 4", range: "50-100 km", regular: 30000, fast: 45000 },
  { name: "Zona 5", range: ">100 km", regular: 40000, fast: 60000 },
]

function Accordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-4 py-4 text-left sm:py-5"
      >
        <span className="font-jakarta text-sm font-semibold text-primary sm:text-base">
          {item.question}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="pb-4 sm:pb-5">
          <p className="font-jakarta text-sm leading-6 text-muted">{item.answer}</p>
        </div>
      )}
    </div>
  )
}

export default function BantuanPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-paper">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
          <BackButton />
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.03em] text-primary sm:text-4xl">
            Bantuan & Informasi Pengiriman
          </h1>
          <p className="mt-2 font-jakarta text-sm leading-6 text-muted sm:text-base">
            Informasi lengkap tentang jangkauan layanan, tarif ongkir, dan estimasi pengiriman.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <section>
          <div className="flex items-center gap-2.5">
            <MapPin className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 className="font-display text-2xl font-semibold text-primary">
              Area Layanan
            </h2>
          </div>
          <p className="mt-3 font-jakarta text-sm leading-6 text-muted">
            Saat ini kami melayani pengiriman untuk <strong>31 kota/kabupaten</strong> di area:
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {["DKI Jakarta", "Jawa Barat", "Banten"].map((area) => (
              <li
                key={area}
                className="rounded-md border border-border bg-paper px-4 py-3 font-jakarta text-sm font-medium text-primary"
              >
                {area}
              </li>
            ))}
          </ul>
          <p className="mt-4 font-jakarta text-xs leading-5 text-muted">
            Radius maksimal 150 km dari Gudang NusaRoast, Bekasi Barat. Termasuk kota seperti Jakarta Pusat, Bekasi, Tangerang, Bogor, Depok, Bandung, Cimahi, Sukabumi, Karawang, Purwakarta, Serang, dan sekitarnya.
          </p>
        </section>

        <section className="mt-10 border-t border-border pt-10">
          <div className="flex items-center gap-2.5">
            <Package className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 className="font-display text-2xl font-semibold text-primary">
              Tarif Ongkir per Zona
            </h2>
          </div>
          <p className="mt-3 font-jakarta text-sm leading-6 text-muted">
            Ongkir dihitung otomatis berdasarkan jarak kota Anda dari gudang kami. Berikut rincian tarif per zona:
          </p>
          <div className="mt-6 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left">
              <thead className="border-b border-border bg-card">
                <tr>
                  <th className="px-4 py-3 font-jakarta text-xs font-semibold uppercase tracking-wide text-primary">
                    Zona
                  </th>
                  <th className="px-4 py-3 font-jakarta text-xs font-semibold uppercase tracking-wide text-primary">
                    Jarak
                  </th>
                  <th className="px-4 py-3 text-right font-jakarta text-xs font-semibold uppercase tracking-wide text-primary">
                    Regular
                  </th>
                  <th className="px-4 py-3 text-right font-jakarta text-xs font-semibold uppercase tracking-wide text-primary">
                    Express
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-paper">
                {zones.map((zone) => (
                  <tr key={zone.name}>
                    <td className="px-4 py-3 font-jakarta text-sm font-medium text-primary">
                      {zone.name}
                    </td>
                    <td className="px-4 py-3 font-jakarta text-sm text-muted">
                      {zone.range}
                    </td>
                    <td className="px-4 py-3 text-right font-jakarta text-sm font-semibold text-primary">
                      Rp{zone.regular.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right font-jakarta text-sm font-semibold text-primary">
                      Rp{zone.fast.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 border-t border-border pt-10">
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-accent" aria-hidden="true" />
            <h2 className="font-display text-2xl font-semibold text-primary">
              Estimasi Waktu Pengiriman
            </h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-paper p-5">
              <p className="font-jakarta text-xs font-semibold uppercase tracking-wide text-accent">
                Kurir Lokal NusaRoast
              </p>
              <p className="mt-2 font-jakarta text-2xl font-bold text-primary">2–4 jam</p>
              <p className="mt-1 font-jakarta text-xs text-muted">
                Pengiriman standar di hari yang sama
              </p>
            </div>
            <div className="rounded-lg border border-border bg-paper p-5">
              <p className="font-jakarta text-xs font-semibold uppercase tracking-wide text-accent">
                Express NusaRoast
              </p>
              <p className="mt-2 font-jakarta text-2xl font-bold text-primary">1–2 jam</p>
              <p className="mt-1 font-jakarta text-xs text-muted">
                Prioritas pengiriman lebih cepat
              </p>
            </div>
          </div>
          <p className="mt-4 font-jakarta text-xs text-muted">
            Waktu dihitung sejak pembayaran dikonfirmasi dan pesanan dikemas di gudang kami.
          </p>
        </section>

        <section className="mt-10 border-t border-border pt-10">
          <h2 className="font-display text-2xl font-semibold text-primary">
            Pertanyaan yang Sering Diajukan
          </h2>
          <div className="mt-6">
            {faqs.map((item) => (
              <Accordion key={item.question} item={item} />
            ))}
          </div>
        </section>

        <div className="mt-10 rounded-lg border border-border bg-paper p-6 text-center">
          <p className="font-jakarta text-sm text-muted">
            Masih ada pertanyaan? Hubungi kami melalui halaman{" "}
            <Link href="/" className="font-semibold text-primary underline underline-offset-2">
              kontak
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
