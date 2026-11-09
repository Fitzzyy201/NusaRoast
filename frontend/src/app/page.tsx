import HeroSection from "@/components/ui/hero-section"
import { PromotionCarousel } from "@/components/promotion/promotion-carousel"
import { ProductGrid } from "@/components/product/product-grid"
import { RoastLevelGuide } from "@/components/roast-level-guide"
import { Footer } from "@/components/ui/footer"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <PromotionCarousel />
      <ProductGrid limit={6} showLoadMore={true} showCategories={true} viewAllHref="/products" />
      <RoastLevelGuide />
      <Footer />
    </div>
  )
}
