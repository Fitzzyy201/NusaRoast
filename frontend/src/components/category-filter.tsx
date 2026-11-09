import Link from "next/link"
import { cn } from "@/lib/utils"

const categories = [
  { value: "all", label: "Semua" },
  { value: "ARABICA", label: "Arabika" },
  { value: "ROBUSTA", label: "Robusta" },
] as const

interface CategoryFilterProps {
  category?: string
  search?: string
}

export function CategoryFilter({ category, search }: CategoryFilterProps) {
  const currentCategory = category ?? "all"

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <nav
          className="flex min-h-12 items-center gap-1.5 overflow-x-auto py-1 sm:min-h-16 sm:gap-2 sm:py-3"
          aria-label="Filter kategori"
        >
          <span className="mr-1 hidden shrink-0 font-jakarta text-xs font-semibold uppercase tracking-[0.12em] text-muted sm:inline sm:mr-2">
            Kategori
          </span>
          {categories.map((cat) => {
            const isActive = currentCategory === cat.value
            const params = new URLSearchParams()
            if (cat.value !== "all") params.set("category", cat.value)
            if (search) params.set("search", search)
            const queryString = params.toString()
            const href = queryString ? `/products?${queryString}` : "/products"

            return (
              <Link
                key={cat.value}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center rounded-md px-3 font-jakarta text-xs font-medium transition-colors sm:px-3.5 sm:text-sm",
                  isActive
                    ? "bg-primary text-white"
                    : "border border-border-strong bg-paper text-muted hover:border-primary hover:text-primary"
                )}
              >
                {cat.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </section>
  )
}
