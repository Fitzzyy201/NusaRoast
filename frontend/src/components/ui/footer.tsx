import Link from "next/link"
import Image from "next/image"

const kontakLinks = [
  { href: "mailto:nusaroastadmin@gmail.com", label: "Email: nusaroastadmin@gmail.com" },
  { href: "https://wa.me/628388198544", label: "WhatsApp: +62 838-8198-544" },
  { href: "https://instagram.com/nusaroast", label: "Instagram: @nusaroast" },
]

export function Footer() {
  return (
    <footer className="bg-primary text-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="grid gap-8 sm:gap-12 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white p-1 sm:h-12 sm:w-12">
                <span className="relative h-full w-full">
                  <Image
                    src="/images/logo.png"
                    alt="Logo NusaRoast"
                    fill
                    sizes="48px"
                    className="object-contain"
                  />
                </span>
              </span>
              <span className="font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                NusaRoast
              </span>
            </div>
            <p className="mt-4 max-w-md font-jakarta text-[13px] leading-6 text-background/70 sm:mt-6 sm:text-sm sm:leading-7">
              Biji kopi single origin dari berbagai daerah Indonesia, dipanggang
              untuk menjaga karakter dan kesegarannya.
            </p>
          </div>

          <div className="grid gap-6 sm:gap-8">
            <div>
              <h2 className="font-jakarta text-[11px] font-semibold uppercase tracking-[0.16em] text-background/65">
                Kontak
              </h2>
              <ul className="mt-3">
                {kontakLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 min-w-11 items-center font-jakarta text-sm text-background/80 transition-colors hover:text-background focus-visible:outline-background"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-background/15 pt-5 sm:mt-14 sm:gap-3 sm:pt-6 md:flex-row md:items-center md:justify-between">
          <p className="font-jakarta text-xs text-background/65">
            © 2026 NusaRoast. Seluruh hak cipta dilindungi.
          </p>
          <p className="font-jakarta text-[11px] font-semibold uppercase tracking-[0.14em] text-background/65">
            Single origin, dipanggang di Indonesia
          </p>
        </div>
      </div>
    </footer>
  )
}
