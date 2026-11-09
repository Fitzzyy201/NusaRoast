import Image from "next/image"
import { cn } from "@/lib/utils"

interface ProductVisualProps {
  name: string
  origin: string
  roastLevel: number
  weight: string
  imageSrc: string | null
  className?: string
  sizes?: string
  variant?: "card" | "detail"
}

function formatRoastLevel(level: number): string {
  return `Roast ${String(level).padStart(2, "0")}`
}

function BeanMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 160"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <ellipse cx="60" cy="80" rx="45" ry="65" fill="currentColor" />
      <path
        d="M60 18C38 42 38 118 60 142"
        stroke="var(--background)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M36 34C48 56 48 104 36 126"
        stroke="var(--background)"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M84 34C72 56 72 104 84 126"
        stroke="var(--background)"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ProductVisual({
  name,
  origin,
  roastLevel,
  weight,
  imageSrc,
  className,
  sizes,
  variant = "card",
}: ProductVisualProps) {
  if (imageSrc) {
    return (
      <Image
        src={imageSrc}
        alt={name}
        fill
        unoptimized
        className="object-cover"
        sizes={sizes}
      />
    )
  }

  const isDetail = variant === "detail"

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex h-full w-full flex-col justify-between overflow-hidden bg-card text-primary",
        isDetail ? "p-7 sm:p-10" : "p-3 sm:p-5",
        className
      )}
    >
      <span className="flex items-start justify-between gap-4">
        <span
          className={cn(
            "font-jakarta font-semibold uppercase text-muted",
            isDetail ? "text-[11px] tracking-[0.18em]" : "text-[8px] tracking-[0.1em] sm:text-[9px] sm:tracking-[0.14em]"
          )}
        >
          Single origin
        </span>
        <span
          className={cn(
            "font-jakarta font-semibold uppercase text-muted",
            isDetail ? "text-[11px] tracking-[0.18em]" : "hidden text-[8px] tracking-[0.1em] sm:inline sm:text-[9px] sm:tracking-[0.14em]"
          )}
        >
          {formatRoastLevel(roastLevel)}
        </span>
      </span>

      <BeanMark
        className={cn(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary/10",
          isDetail ? "h-48 w-36 sm:h-64 sm:w-48" : "h-20 w-14 sm:h-28 sm:w-20"
        )}
      />

      <span className="relative flex flex-col items-center gap-1.5 px-2 text-center sm:gap-2.5 sm:px-3">
        <span className="h-px w-6 bg-primary/25 sm:w-8" />
        <span
          className={cn(
            "font-display font-semibold leading-[1.02] tracking-[-0.025em]",
            isDetail ? "text-4xl sm:text-6xl" : "text-lg sm:text-[1.7rem]"
          )}
        >
          {name}
        </span>
        <span
          className={cn(
            "font-jakarta uppercase text-muted",
            isDetail ? "text-xs tracking-[0.18em]" : "text-[8px] tracking-[0.1em] sm:text-[9px] sm:tracking-[0.12em]"
          )}
        >
          {origin}
        </span>
      </span>

      <span className="relative hidden items-end justify-between gap-4 border-t border-primary/20 pt-3 sm:flex">
        <span
          className={cn(
            "font-jakarta font-semibold uppercase text-primary",
            isDetail ? "text-xs tracking-[0.14em]" : "text-[9px] tracking-[0.12em]"
          )}
        >
          {weight}
        </span>
        <span
          className={cn(
            "font-jakarta font-semibold uppercase text-muted",
            isDetail ? "text-[11px] tracking-[0.16em]" : "text-[8px] tracking-[0.12em]"
          )}
        >
          NusaRoast
        </span>
      </span>
    </span>
  )
}
