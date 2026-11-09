import Link from "next/link"
import Image from "next/image"
import { MapPin } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"

interface AuthShellProps {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  return (
    <div className="min-h-[calc(100vh-72px)] bg-background">
      <div className="mx-auto grid min-h-[calc(100vh-72px)] max-w-7xl lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative isolate hidden overflow-hidden border-r border-border p-10 text-background lg:flex lg:flex-col lg:justify-between bg-cover bg-center"
        style={{ 
          backgroundImage: `
            linear-gradient(
            rgba(25, 15, 10, 0.72),
            rgba(25, 15, 10, 0.82)
            ),
            url('/images/bijikopi.jpg')
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }} 
        >
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-3 self-start rounded-sm focus-visible:outline-background"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white p-1">
              <span className="relative h-full w-full">
                <Image
                  src="/images/logo.png"
                  alt="Logo NusaRoast"
                  fill
                  sizes="44px"
                  className="object-contain"
                />
              </span>
            </span>
            <span className="font-display text-2xl font-semibold">NusaRoast</span>
          </Link>

          <div className="max-w-sm">
            <p className="font-jakarta text-[11px] font-semibold uppercase tracking-[0.18em] text-background/60">
              Single origin Indonesia
            </p>
            <p className="mt-4 font-display text-4xl font-semibold leading-[1.02] tracking-[-0.03em]">
              Kopi yang menjaga asal dan karakter rasanya.
            </p>
            <div className="mt-8 space-y-3 border-t border-background/20 pt-5">
              {[
                { region: "Gayo", island: "Aceh" },
                { region: "Toraja", island: "Sulawesi" },
                { region: "Kintamani", island: "Bali" },
              ].map((origin) => (
                <div key={origin.region} className="flex items-center justify-between gap-4">
                  <span className="font-jakarta text-sm font-semibold">{origin.region}</span>
                  <span className="flex items-center gap-1.5 font-jakarta text-xs text-background/55">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {origin.island}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-lg border border-background/20 bg-background/5 p-4">
              <p className="font-jakarta text-xs font-semibold uppercase tracking-[0.1em] text-background/80">
                📦 Layanan Pengiriman
              </p>
              <p className="mt-2 font-jakarta text-sm leading-5 text-background/75">
                Saat ini kami hanya melayani pengiriman untuk area Jawa Barat, DKI Jakarta, dan Banten (Radius 150 km dari Bekasi).
              </p>
              <Link
                href="/bantuan"
                className="mt-3 inline-block font-jakarta text-xs font-semibold text-accent underline underline-offset-2"
              >
                Pelajari lebih lanjut →
              </Link>
            </div>
          </div>

          <p className="font-jakarta text-xs text-background/65">
            Dipanggang di Indonesia.
          </p>
        </aside>

        <div className="flex items-center justify-center px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
          <div className="w-full max-w-md">
            <Link href="/" className="mb-4 inline-flex min-h-11 items-center gap-2.5 sm:mb-6 lg:hidden">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white p-1">
                <span className="relative h-full w-full">
                  <Image
                    src="/images/logo.png"
                    alt="Logo NusaRoast"
                    fill
                    sizes="40px"
                    className="object-contain"
                  />
                </span>
              </span>
              <span className="font-display text-2xl font-semibold text-primary">NusaRoast</span>
            </Link>

            <BackButton className="mb-2" />
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-1.5 font-display text-3xl font-semibold leading-[1.05] tracking-[-0.03em] text-primary sm:mt-2 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 font-jakarta text-[13px] leading-5 text-muted sm:mt-3 sm:text-sm sm:leading-6">
              {description}
            </p>

            <div className="mt-5 sm:mt-7">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
