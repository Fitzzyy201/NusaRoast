import { ArrowDownRight, Flame, MapPin } from "lucide-react"
import { HashLink } from "@/components/ui/hash-link"

const origins = [
  { region: "Gayo", island: "Aceh" },
  { region: "Toraja", island: "Sulawesi" },
  { region: "Kintamani", island: "Bali" },
]

function BeanMark() {
  return (
    <svg viewBox="0 0 160 220" fill="none" className="h-full w-full" aria-hidden="true">
      <ellipse cx="80" cy="110" rx="62" ry="88" fill="currentColor" />
      <path
        d="M80 26C50 58 50 162 80 194"
        stroke="var(--primary)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M48 48C64 78 64 142 48 172"
        stroke="var(--primary)"
        strokeOpacity="0.25"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M112 48C96 78 96 142 112 172"
        stroke="var(--primary)"
        strokeOpacity="0.25"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function OriginPanel() {
  return (
    <div className="relative overflow-hidden rounded-lg bg-primary p-5 text-white sm:p-8"
    style={{ 
      backgroundImage: `
      linear-gradient(
      rgba(20, 10, 5, 0.70),
      rgba(20, 10, 5, 0.80)
      ),
      url('/images/kopi.jpg')
      `,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-background/20 pb-4 sm:gap-6 sm:pb-5">
        <div>
          <p className="font-jakarta text-[10px] font-semibold uppercase tracking-[0.18em] text-background/55">
            Roastery notes
          </p>
          <p className="mt-1.5 font-display text-xl font-semibold tracking-[-0.02em] sm:mt-2 sm:text-2xl">
            Single origin
          </p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-background/20 text-background/70 sm:h-10 sm:w-10">
          <Flame className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 py-5 sm:grid-cols-[1fr_150px] sm:gap-5 sm:py-7">
        <div className="flex flex-col justify-center">
          <p className="font-display text-3xl font-semibold leading-none tracking-[-0.03em] sm:text-5xl">
            Nusantara
          </p>
          <p className="mt-3 max-w-52 font-jakarta text-[13px] leading-5 text-background/65 sm:mt-4 sm:text-sm sm:leading-6">
            Tiga daerah, tiga karakter rasa. Dipanggang untuk setiap seduhan.
          </p>
        </div>
        <div className="hidden items-center justify-center text-background/15 sm:flex">
          <BeanMark />
        </div>
      </div>

      <div className="border-t border-background/20">
        {origins.map((origin, index) => (
          <div
            key={origin.region}
            className="flex items-center justify-between gap-4 border-b border-background/10 py-3 last:border-b-0 sm:py-3.5"
          >
            <div className="flex items-baseline gap-3">
              <span className="font-jakarta text-[10px] font-semibold text-background/55">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-jakarta text-sm font-semibold">{origin.region}</span>
            </div>
            <span className="flex items-center gap-1.5 font-jakarta text-xs text-background/55">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {origin.island}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 font-jakarta text-[10px] font-semibold uppercase tracking-[0.18em] text-background/55 sm:mt-5">
        Gayo, Toraja, Kintamani
      </p>
    </div>
  )
}

export default function HeroSection() {
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:py-20">
        <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-accent sm:w-10" aria-hidden="true" />
              <p className="font-jakarta text-[10px] font-semibold uppercase tracking-[0.16em] text-accent sm:text-[11px]">
                Kopi specialty Indonesia
              </p>
            </div>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1.5 sm:mt-5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent"></span>
              </span>
              <span className="font-jakarta text-xs font-semibold tracking-wide text-accent sm:text-sm">
                Kurir Lokal 1–4 Jam • Area Jawa Barat & Jakarta
              </span>
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[0.98] tracking-[-0.04em] text-primary sm:mt-5 sm:text-6xl lg:text-[4.75rem]">
              Rasa yang tumbuh dari tanah Nusantara.
            </h1>

            <p className="mt-4 max-w-xl font-jakarta text-[13px] leading-6 text-muted sm:mt-6 sm:text-base sm:leading-7 md:text-lg md:leading-8">
              Jelajahi biji kopi pilihan dari Gayo, Toraja, dan Kintamani.
              Dipanggang dengan cermat untuk setiap seduhan.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2.5 sm:mt-8 sm:gap-3">
              <HashLink
                href="#pilihan-biji-kopi"
                className="button button-primary min-h-12 px-4 text-sm sm:px-5 sm:text-base"
              >
                Pilih biji kopi
                <ArrowDownRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </HashLink>
              <HashLink href="#panduan-roast" className="button button-outline text-sm sm:text-base">
                Panduan tingkat roast
              </HashLink>
            </div>

            <div className="mt-7 flex max-w-lg items-start gap-3 border-t border-border pt-4 sm:mt-10 sm:pt-5">
              <Flame className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <p className="font-jakarta text-[13px] leading-5 text-muted sm:text-sm sm:leading-6">
                Setiap batch dipanggang untuk menonjolkan karakter daerah asalnya,
                bukan menutupinya dengan tingkat roast yang seragam.
              </p>
            </div>
          </div>

          <OriginPanel />
        </div>
      </div>
    </section>
  )
}
