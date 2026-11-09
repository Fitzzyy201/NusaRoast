import { CategoryFilter } from "@/components/category-filter"
import { HashLink } from "@/components/ui/hash-link"
import { ProductGrid } from "@/components/product/product-grid"
import { Footer } from "@/components/ui/footer"
import { BackButton } from "@/components/ui/back-button"

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string | string[]
    search?: string | string[]
  }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { category: rawCategory, search: rawSearch } = await searchParams
  const categoryValue = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory
  const searchValue = Array.isArray(rawSearch) ? rawSearch[0] : rawSearch
  const category =
    categoryValue === "ARABICA" || categoryValue === "ROBUSTA" ? categoryValue : undefined
  const search = searchValue?.trim() || undefined

  return (
    <div className="min-h-[calc(100vh-72px)] bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-12 lg:py-16">
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <BackButton />
              <p className="eyebrow">Katalog</p>
              <h1 className="mt-2 font-display text-2xl font-semibold leading-[1.05] tracking-[-0.03em] text-primary sm:mt-3 sm:text-5xl">
                Biji kopi dari berbagai daerah Indonesia
              </h1>
              <p className="mt-2 line-clamp-2 max-w-2xl font-jakarta text-[13px] leading-5 text-muted sm:mt-4 sm:line-clamp-none sm:text-sm sm:leading-7 md:text-base">
                Semua biji kopi NusaRoast berasal dari berbagai daerah Indonesia,
                dipanggang untuk menjaga karakter dan kesegarannya.
              </p>
              <HashLink
                href="/#panduan-roast"
                className="inline-flex min-h-11 items-center font-jakarta text-xs font-semibold text-primary underline underline-offset-4 sm:mt-2 sm:text-sm"
              >
                Pelajari panduan roast
              </HashLink>
            </div>
            <div className="hidden border-l border-border pl-6 lg:block">
              <p className="eyebrow">Cara memilih</p>
              <p className="mt-2 max-w-48 font-jakarta text-sm leading-6 text-muted">
                Gunakan kategori, pencarian nama, dan panduan roast untuk memilih kopi.
              </p>
            </div>
          </div>
        </div>
      </header>

      <CategoryFilter category={category} search={search} />

      <ProductGrid
        category={category}
        search={search}
        limit={12}
        showLoadMore
        title="Katalog kopi"
      />

      <Footer />
    </div>
  )
}
