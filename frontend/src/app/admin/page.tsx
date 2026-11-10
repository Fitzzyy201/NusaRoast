"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  MessageCircle,
  Coffee,
  Eye,
  Loader2,
  LogOut,
  Megaphone,
  Package,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Store,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react"
import {
  AdminDashboard,
  AdminOrder,
  adminApi,
  ApiError,
  AuthUser,
  Buyer,
  clearAuthToken,
  getAuthToken,
  getAuthUser,
  Product,
  ProductCreateData,
  Promotion,
  PromotionCreateData,
} from "@/services/api"
import { cn, formatDate, formatPrice } from "@/lib/utils"
import { avatarDataUrl } from "@/lib/avatar"
import { ProductFormDialog } from "@/components/admin/product-form-dialog"
import { PromotionFormDialog } from "@/components/admin/promotion-form-dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

type Tab = "overview" | "orders" | "products" | "promotions" | "buyers"

interface ConfirmRequest {
  title: string
  description: string
  confirmLabel: string
  reasonRequired?: boolean
  buyerPhone?: string | null
  action: (reason?: string) => Promise<void>
}

function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  const normalized = digits.startsWith("0") ? `62${digits.slice(1)}` : digits
  return `https://wa.me/${normalized}`
}

const orderStatuses = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
] as const

const statusLabels: Record<string, string> = {
  PENDING: "Menunggu bayar",
  PAID: "Dibayar",
  PROCESSING: "Diproses",
  SHIPPED: "Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
}

const statusClasses: Record<string, string> = {
  PENDING: "bg-warning/10 text-warning",
  PAID: "bg-success/10 text-success",
  PROCESSING: "bg-primary/10 text-primary",
  SHIPPED: "bg-primary/10 text-primary",
  COMPLETED: "bg-success/10 text-success",
  CANCELLED: "bg-danger/10 text-danger",
}

const nextStatuses: Record<string, string[]> = {
  PENDING: ["CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
}

function productImageSource(image: string | null): string | null {
  if (!image) return null
  return image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-sm px-2 py-1 font-jakarta text-[10px] font-semibold uppercase tracking-[0.06em]",
        statusClasses[status] ?? "bg-muted/10 text-muted"
      )}
    >
      {statusLabels[status] ?? status}
    </span>
  )
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [authState, setAuthState] = useState<"checking" | "signed-out" | "forbidden" | "authorized">(
    "checking"
  )
  const [user, setUser] = useState<AuthUser | null>(null)
  const [tab, setTab] = useState<Tab>("overview")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const [orderFilter, setOrderFilter] = useState("ALL")
  const [orderSearch, setOrderSearch] = useState("")
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null)
  const [resiEditorId, setResiEditorId] = useState<number | null>(null)
  const [resiValue, setResiValue] = useState("")
  const [resiSavingId, setResiSavingId] = useState<number | null>(null)

  const [productSearch, setProductSearch] = useState("")
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productSaving, setProductSaving] = useState(false)
  const [productError, setProductError] = useState<string | null>(null)
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null)
  const [togglingProductId, setTogglingProductId] = useState<number | null>(null)

  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [promotionInitialProductId, setPromotionInitialProductId] = useState<number | null>(null)
  const [promotionSaving, setPromotionSaving] = useState(false)
  const [promotionError, setPromotionError] = useState<string | null>(null)
  const [deletingPromotionId, setDeletingPromotionId] = useState<number | null>(null)

  const [buyerUpdatingId, setBuyerUpdatingId] = useState<number | null>(null)
  const [buyerSearch, setBuyerSearch] = useState("")
  const [viewingBuyer, setViewingBuyer] = useState<Buyer | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelReasonError, setCancelReasonError] = useState<string | null>(null)
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const handleUnauthorized = useCallback((err: unknown): boolean => {
    if (err instanceof ApiError && err.status === 401) {
      clearAuthToken()
      setUser(null)
      setAuthState("signed-out")
      setLoading(false)
      return true
    }
    return false
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const results = await Promise.allSettled([
        adminApi.getDashboard(),
        adminApi.getOrders(),
        adminApi.getAllProducts(),
        adminApi.getBuyers(),
        adminApi.getPromotions(),
      ])
      const unauthorized = results.find(
        (result) =>
          result.status === "rejected" &&
          result.reason instanceof ApiError &&
          result.reason.status === 401
      )
      if (unauthorized?.status === "rejected") {
        handleUnauthorized(unauthorized.reason)
        return
      }

      let failed = 0
      if (results[0].status === "fulfilled") setDashboard(results[0].value)
      else failed += 1
      if (results[1].status === "fulfilled") setOrders(results[1].value)
      else failed += 1
      if (results[2].status === "fulfilled") setProducts(results[2].value)
      else failed += 1
      if (results[3].status === "fulfilled") setBuyers(results[3].value)
      else failed += 1
      if (results[4].status === "fulfilled") setPromotions(results[4].value)
      else failed += 1

      if (failed === results.length) {
        const firstError = results.find((result) => result.status === "rejected")
        setLoadError(
          firstError?.status === "rejected" && firstError.reason instanceof Error
            ? firstError.reason.message
            : "Dashboard tidak dapat dimuat. Periksa sesi dan koneksi server."
        )
      } else if (failed > 0) {
        setNotice({
          type: "error",
          message: "Sebagian data gagal dimuat. Tab lain tetap dapat digunakan.",
        })
      }
    } finally {
      setLoading(false)
    }
  }, [handleUnauthorized])

  useEffect(() => {
    queueMicrotask(() => {
      if (!getAuthToken()) {
        setAuthState("signed-out")
        setLoading(false)
        return
      }
      const current = getAuthUser()
      setUser(current)
      if (current?.role !== "ADMIN") {
        setAuthState("forbidden")
        setLoading(false)
        return
      }
      setAuthState("authorized")
      void loadData()
    })
  }, [loadData])

  useEffect(() => {
    if (!viewingBuyer) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewingBuyer(null)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [viewingBuyer])

  const handleLogout = () => {
    clearAuthToken()
    router.push("/login")
  }

  const refreshAdmin = async (): Promise<boolean> => {
    setRefreshing(true)
    try {
      const results = await Promise.allSettled([
        adminApi.getDashboard(),
        adminApi.getOrders(),
        adminApi.getAllProducts(),
        adminApi.getBuyers(),
        adminApi.getPromotions(),
      ])
      const unauthorized = results.find(
        (result) =>
          result.status === "rejected" &&
          result.reason instanceof ApiError &&
          result.reason.status === 401
      )
      if (unauthorized?.status === "rejected") {
        handleUnauthorized(unauthorized.reason)
        return false
      }

      let allLoaded = true
      if (results[0].status === "fulfilled") setDashboard(results[0].value)
      else allLoaded = false
      if (results[1].status === "fulfilled") setOrders(results[1].value)
      else allLoaded = false
      if (results[2].status === "fulfilled") setProducts(results[2].value)
      else allLoaded = false
      if (results[3].status === "fulfilled") setBuyers(results[3].value)
      else allLoaded = false
      if (results[4].status === "fulfilled") setPromotions(results[4].value)
      else allLoaded = false
      return allLoaded
    } finally {
      setRefreshing(false)
    }
  }

  const handleManualRefresh = async () => {
    const refreshed = await refreshAdmin()
    setNotice(
      refreshed
        ? null
        : { type: "error", message: "Data terbaru gagal dimuat. Coba lagi." }
    )
  }

  const performStatusUpdate = async (orderId: number, status: string, reason?: string) => {
    setStatusUpdatingId(orderId)
    setNotice(null)
    try {
      const updatedOrder = await adminApi.updateOrderStatus(orderId, status, reason)
      setOrders((prev) =>
        prev.map((item) =>
          item.id === orderId
            ? {
                ...item,
                status: updatedOrder.status,
                cancellationReason: updatedOrder.cancellationReason ?? item.cancellationReason,
              }
            : item
        )
      )
      const refreshed = await refreshAdmin()
      setNotice(
        refreshed
          ? { type: "success", message: "Status pesanan diperbarui." }
          : {
              type: "error",
              message: "Status pesanan diperbarui, tetapi data terbaru gagal dimuat.",
            }
      )
    } catch (err) {
      if (handleUnauthorized(err)) return
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Status pesanan gagal diperbarui.",
      })
    } finally {
      setStatusUpdatingId(null)
    }
  }

  const requestStatusUpdate = (order: AdminOrder, status: string) => {
    if (status === "CANCELLED") {
      setCancelReason("")
      setCancelReasonError(null)
      setConfirmRequest({
        title: "Tolak & batalkan pesanan?",
        description: `Pesanan #${order.id.toString().padStart(6, "0")} akan ditandai dibatalkan. Alasan wajib diisi karena dikirim ke pembeli. Tindakan ini tidak dapat dibatalkan.`,
        confirmLabel: "Tolak pesanan",
        reasonRequired: true,
        buyerPhone: order.buyerPhone,
        action: (reason) => performStatusUpdate(order.id, status, reason),
      })
      return
    }
    void performStatusUpdate(order.id, status)
  }

  const handleResiSave = async (orderId: number) => {
    const value = resiValue.trim()
    if (!value) {
      setNotice({ type: "error", message: "Nomor resi tidak boleh kosong." })
      return
    }
    setResiSavingId(orderId)
    setNotice(null)
    try {
      const updatedOrder = await adminApi.inputResi(orderId, value)
      setOrders((prev) =>
        prev.map((item) =>
          item.id === orderId
            ? { ...item, resiNumber: updatedOrder.resiNumber }
            : item
        )
      )
      setResiEditorId(null)
      setResiValue("")
      const refreshed = await refreshAdmin()
      setNotice(
        refreshed
          ? { type: "success", message: "Nomor resi disimpan." }
          : {
              type: "error",
              message: "Nomor resi disimpan, tetapi data terbaru gagal dimuat.",
            }
      )
    } catch (err) {
      if (handleUnauthorized(err)) return
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Nomor resi gagal disimpan.",
      })
    } finally {
      setResiSavingId(null)
    }
  }

  const handleProductSubmit = async (data: ProductCreateData) => {
    setProductSaving(true)
    setProductError(null)
    try {
      if (editingProduct) {
        await adminApi.updateProduct(editingProduct.id, data)
      } else {
        await adminApi.createProduct(data)
      }
    } catch (err) {
      if (handleUnauthorized(err)) {
        setProductSaving(false)
        return
      }
      setProductError(err instanceof Error ? err.message : "Produk gagal disimpan.")
      setProductSaving(false)
      return
    }

    setProductSaving(false)
    setProductDialogOpen(false)
    setEditingProduct(null)
    setNotice({
      type: "success",
      message: editingProduct ? "Produk diperbarui." : "Produk baru ditambahkan.",
    })
    const results = await Promise.allSettled([
      adminApi.getAllProducts(),
      adminApi.getDashboard(),
      adminApi.getPromotions(),
    ])
    const unauthorized = results.find(
      (result) =>
        result.status === "rejected" &&
        result.reason instanceof ApiError &&
        result.reason.status === 401
    )
    if (unauthorized?.status === "rejected") {
      handleUnauthorized(unauthorized.reason)
      return
    }

    let failed = false
    if (results[0].status === "fulfilled") setProducts(results[0].value)
    else failed = true
    if (results[1].status === "fulfilled") setDashboard(results[1].value)
    else failed = true
    if (results[2].status === "fulfilled") setPromotions(results[2].value)
    else failed = true

    if (failed) {
      setNotice({
        type: "error",
        message: "Produk tersimpan, tetapi sebagian data katalog gagal dimuat ulang.",
      })
    }
  }

  const handleToggleProductActive = async (product: Product) => {
    setTogglingProductId(product.id)
    setNotice(null)
    try {
      const updated = await adminApi.updateProduct(product.id, {
        isActive: !product.isActive,
      })
      setProducts((prev) =>
        prev.map((item) => (item.id === product.id ? updated : item))
      )
      setNotice({
        type: "success",
        message: updated.isActive
          ? "Produk diaktifkan dan kembali tampil di katalog."
          : "Produk dinonaktifkan dan disembunyikan dari katalog.",
      })
      try {
        setDashboard(await adminApi.getDashboard())
      } catch {
        // The product change succeeded; the dashboard will refresh on the next load.
      }
    } catch (err) {
      if (handleUnauthorized(err)) return
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Status produk gagal diperbarui.",
      })
    } finally {
      setTogglingProductId(null)
    }
  }

  const performDeleteProduct = async (product: Product) => {
    setDeletingProductId(product.id)
    setNotice(null)
    try {
      await adminApi.deleteProduct(product.id)
    } catch (err) {
      if (handleUnauthorized(err)) {
        setDeletingProductId(null)
        return
      }
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Produk gagal dihapus.",
      })
      setDeletingProductId(null)
      return
    }

    setDeletingProductId(null)
    setNotice({ type: "success", message: "Produk dihapus dari katalog." })
    try {
      const [productsData, dashboardData] = await Promise.all([
        adminApi.getAllProducts(),
        adminApi.getDashboard(),
      ])
      setProducts(productsData)
      setDashboard(dashboardData)
    } catch (err) {
      if (handleUnauthorized(err)) return
      setNotice({
        type: "error",
        message: "Produk terhapus, tetapi daftar produk gagal dimuat ulang.",
      })
    }
  }

  const requestDeleteProduct = (product: Product) => {
    setConfirmRequest({
      title: "Hapus produk?",
      description: `"${product.name}" akan dihapus permanen dari katalog. Produk yang sudah pernah dipesan, masih ada di keranjang pembeli, atau dipakai promosi tidak dapat dihapus — gunakan tombol "Nonaktifkan" sebagai gantinya.`,
      confirmLabel: "Hapus produk",
      action: () => performDeleteProduct(product),
    })
  }

  const handlePromotionSubmit = async (data: PromotionCreateData) => {
    setPromotionSaving(true)
    setPromotionError(null)
    try {
      if (editingPromotion) {
        await adminApi.updatePromotion(editingPromotion.id, data)
      } else {
        await adminApi.createPromotion(data)
      }
    } catch (err) {
      if (handleUnauthorized(err)) {
        setPromotionSaving(false)
        return
      }
      setPromotionError(err instanceof Error ? err.message : "Promosi gagal disimpan.")
      setPromotionSaving(false)
      return
    }

    setPromotionSaving(false)
    setPromotionDialogOpen(false)
    setEditingPromotion(null)
    setPromotionInitialProductId(null)
    setNotice({
      type: "success",
      message: editingPromotion ? "Promosi diperbarui." : "Promosi baru ditambahkan.",
    })
    try {
      setPromotions(await adminApi.getPromotions())
    } catch (err) {
      if (handleUnauthorized(err)) return
      setNotice({
        type: "error",
        message: "Promosi tersimpan, tetapi daftar promosi gagal dimuat ulang.",
      })
    }
  }

  const performDeletePromotion = async (promotion: Promotion) => {
    setDeletingPromotionId(promotion.id)
    setNotice(null)
    try {
      await adminApi.deletePromotion(promotion.id)
    } catch (err) {
      if (handleUnauthorized(err)) {
        setDeletingPromotionId(null)
        return
      }
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Promosi gagal dihapus.",
      })
      setDeletingPromotionId(null)
      return
    }

    setDeletingPromotionId(null)
    setNotice({ type: "success", message: "Promosi dihapus dari carousel." })
    try {
      setPromotions(await adminApi.getPromotions())
    } catch (err) {
      if (handleUnauthorized(err)) return
      setNotice({
        type: "error",
        message: "Promosi terhapus, tetapi daftar promosi gagal dimuat ulang.",
      })
    }
  }

  const requestDeletePromotion = (promotion: Promotion) => {
    setConfirmRequest({
      title: "Hapus promosi?",
      description: `"${promotion.title}" akan dihapus permanen dari carousel halaman utama. Produknya tetap tersedia di katalog.`,
      confirmLabel: "Hapus promosi",
      action: () => performDeletePromotion(promotion),
    })
  }

  const performBuyerStatus = async (buyer: Buyer, banning: boolean) => {
    setBuyerUpdatingId(buyer.id)
    setNotice(null)
    try {
      await adminApi.banBuyer(buyer.id, banning)
    } catch (err) {
      if (handleUnauthorized(err)) {
        setBuyerUpdatingId(null)
        return
      }
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Status pembeli gagal diperbarui.",
      })
      setBuyerUpdatingId(null)
      return
    }

    setBuyerUpdatingId(null)
    setNotice({
      type: "success",
      message: banning ? "Akun pembeli diblokir." : "Akun pembeli diaktifkan kembali.",
    })
    try {
      setBuyers(await adminApi.getBuyers())
    } catch (err) {
      if (handleUnauthorized(err)) return
      setNotice({
        type: "error",
        message: "Status tersimpan, tetapi daftar pembeli gagal dimuat ulang.",
      })
    }
  }

  const requestBuyerStatus = (buyer: Buyer) => {
    const banning = buyer.status === "ACTIVE"
    setConfirmRequest({
      title: banning ? "Blokir akun pembeli?" : "Aktifkan kembali akun?",
      description: banning
        ? `${buyer.name} tidak akan dapat masuk atau berbelanja sampai akunnya diaktifkan kembali.`
        : `${buyer.name} akan dapat masuk dan berbelanja kembali.`,
      confirmLabel: banning ? "Blokir akun" : "Aktifkan akun",
      action: () => performBuyerStatus(buyer, banning),
    })
  }

  const filteredOrders = orders.filter((order) => {
    if (orderFilter !== "ALL" && order.status !== orderFilter) return false
    const query = orderSearch.trim().toLowerCase()
    if (!query) return true
    return (
      String(order.id).includes(query) ||
      order.buyerName?.toLowerCase().includes(query) ||
      order.items.some((item) => item.productName.toLowerCase().includes(query))
    )
  })

  const filteredProducts = products.filter((product) => {
    const query = productSearch.trim().toLowerCase()
    if (!query) return true
    return (
      product.name.toLowerCase().includes(query) ||
      product.origin.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    )
  })

  const filteredBuyers = buyers.filter((buyer) => {
    const query = buyerSearch.trim().toLowerCase()
    if (!query) return true
    return (
      buyer.name.toLowerCase().includes(query) ||
      buyer.email.toLowerCase().includes(query) ||
      (buyer.phone ?? "").toLowerCase().includes(query) ||
      (buyer.city ?? "").toLowerCase().includes(query)
    )
  })

  const totalRevenue = dashboard?.totalFinance.totalAmount ?? 0

  const adminName = user?.name?.trim() || "Admin"
  const adminInitial = adminName.charAt(0).toUpperCase()
  const adminAvatar = avatarDataUrl(user?.avatarBase64)

  const runConfirm = async () => {
    if (!confirmRequest) return
    const trimmedReason = cancelReason.trim()
    if (confirmRequest.reasonRequired && !trimmedReason) {
      setCancelReasonError("Alasan penolakan wajib diisi.")
      return
    }
    setConfirmBusy(true)
    try {
      await confirmRequest.action(trimmedReason || undefined)
    } finally {
      setConfirmBusy(false)
      setConfirmRequest(null)
      setCancelReason("")
      setCancelReasonError(null)
    }
  }

  if (authState === "checking") {
    return (
      <div className="-mt-[72px] flex min-h-screen items-center justify-center bg-background">
        <p className="font-jakarta text-sm text-muted">Memeriksa akses admin...</p>
      </div>
    )
  }

  if (authState === "signed-out") {
    return (
      <div className="-mt-[72px] flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-paper px-6 py-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-card text-primary">
            <Store className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold text-primary">
            Masuk sebagai admin
          </h1>
          <p className="mt-2 font-jakarta text-sm leading-relaxed text-muted">
            Dashboard pesanan, produk, dan pembeli hanya tersedia untuk akun admin.
          </p>
          <Link
            href={`/login?redirect=${encodeURIComponent("/admin")}`}
            className="button button-primary mt-6 w-full"
          >
            Masuk ke akun
          </Link>
          <Link
            href="/"
            className="mt-2 inline-flex min-h-11 items-center font-jakarta text-sm text-muted hover:text-primary"
          >
            Kembali ke toko
          </Link>
        </div>
      </div>
    )
  }

  if (authState === "forbidden") {
    return (
      <div className="-mt-[72px] flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-paper px-6 py-10 text-center">
          <h1 className="font-display text-3xl font-semibold text-primary">
            Akun ini bukan admin
          </h1>
          <p className="mt-2 font-jakarta text-sm leading-relaxed text-muted">
            Masuk dengan akun berperan ADMIN untuk membuka dashboard admin.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href={`/login?redirect=${encodeURIComponent("/admin")}`}
              className="button button-primary w-full"
            >
              Masuk dengan akun lain
            </Link>
            <Link href="/" className="button button-outline w-full">
              Kembali ke toko
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="-mt-[72px] min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex min-h-11 items-center gap-2.5 text-primary">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-background">
                <Coffee className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="font-display text-xl font-semibold">NusaRoast</span>
            </Link>
            <span className="hidden rounded-sm bg-card px-2 py-1 font-jakarta text-[10px] font-semibold uppercase tracking-[0.1em] text-muted sm:inline">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href="/profile"
              aria-label="Profil admin"
              className="flex min-h-11 items-center gap-2 rounded-md px-2.5 font-jakarta text-sm font-medium text-muted hover:bg-primary/5 hover:text-primary sm:px-3"
            >
              <UserRound className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Profil</span>
            </Link>
            <div className="flex items-center gap-2.5">
              <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border bg-card">
                {adminAvatar ? (
                  <Image
                    src={adminAvatar}
                    alt={`Foto profil ${adminName}`}
                    fill
                    unoptimized
                    sizes="36px"
                    className="object-cover"
                  />
                ) : (
                  <span
                    className="absolute inset-0 flex items-center justify-center font-jakarta text-sm font-semibold text-primary"
                    aria-hidden="true"
                  >
                    {adminInitial}
                  </span>
                )}
              </span>
              <div className="hidden text-right md:block">
                <p className="max-w-36 truncate font-jakarta text-sm font-semibold text-primary">
                  {adminName}
                </p>
                <p className="max-w-36 truncate font-jakarta text-xs text-muted">{user?.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Keluar"
              className="flex min-h-11 items-center gap-2 rounded-md px-2.5 font-jakarta text-sm font-medium text-muted hover:bg-danger/5 hover:text-danger"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6">
          <div className="flex min-w-max gap-1" role="group" aria-label="Bagian dashboard">
            {[
              { value: "overview" as const, label: "Ringkasan" },
              { value: "orders" as const, label: `Pesanan (${orders.length})` },
              { value: "products" as const, label: `Produk (${products.length})` },
              { value: "promotions" as const, label: `Promosi (${promotions.length})` },
              { value: "buyers" as const, label: `Pembeli (${buyers.length})` },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={tab === item.value}
                onClick={() => setTab(item.value)}
                className={cn(
                  "relative min-h-12 px-3 font-jakarta text-sm font-medium transition-colors",
                  tab === item.value ? "text-primary" : "text-muted hover:text-primary"
                )}
              >
                {item.label}
                {tab === item.value && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-accent" />}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        {notice && (
          <div
            role={notice.type === "error" ? "alert" : "status"}
            className={cn(
              "mb-5 rounded-md border px-4 py-3 font-jakarta text-sm font-medium",
              notice.type === "success"
                ? "border-success/25 bg-success/5 text-success"
                : "border-danger/25 bg-danger/5 text-danger"
            )}
          >
            {notice.message}
          </div>
        )}

        {loading ? (
          <div className="rounded-lg border border-border bg-paper px-6 py-16 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted" aria-hidden="true" />
            <p className="mt-3 font-jakarta text-sm text-muted">Memuat data admin...</p>
          </div>
        ) : loadError ? (
          <div className="rounded-lg border border-border bg-paper px-6 py-12 text-center">
            <h1 className="font-display text-2xl font-semibold text-primary">
              Data dashboard gagal dimuat
            </h1>
            <p className="mt-2 font-jakarta text-sm text-muted">{loadError}</p>
            <button type="button" onClick={() => void loadData()} className="button button-primary mt-6">
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Coba lagi
            </button>
          </div>
        ) : tab === "overview" ? (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Dashboard</p>
                <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.03em] text-primary">
                  Halo, {user?.name || "Admin"}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => void handleManualRefresh()}
                disabled={refreshing}
                className="button button-outline"
              >
                <RefreshCw
                  className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")}
                  aria-hidden="true"
                />
                {refreshing ? "Memuat..." : "Muat ulang"}
              </button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
              <section className="rounded-lg bg-primary p-6 text-background sm:p-8">
                <p className="font-jakarta text-[11px] font-semibold uppercase tracking-[0.14em] text-background/55">
                  Pembayaran diterima
                </p>
                <p className="mt-4 font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
                  {formatPrice(totalRevenue)}
                </p>
                <p className="mt-4 max-w-md font-jakarta text-sm leading-6 text-background/60">
                  Dihitung dari pesanan yang sudah dibayar hingga selesai, termasuk biaya pengiriman.
                </p>
              </section>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-lg border border-border bg-paper p-5">
                  <p className="font-jakarta text-sm text-muted">Pesanan diproses</p>
                  <p className="mt-2 font-display text-4xl font-semibold text-primary">
                    {dashboard?.pesananDiproses ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-paper p-5">
                  <p className="font-jakarta text-sm text-muted">Produk aktif</p>
                  <p className="mt-2 font-display text-4xl font-semibold text-primary">
                    {dashboard?.produkAktif ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <section className="mt-6 rounded-lg border border-border bg-paper">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-primary">Pesanan terbaru</h2>
                  <p className="mt-1 font-jakarta text-xs text-muted">
                    Lima pesanan terakhir yang masuk.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTab("orders")}
                  className="inline-flex min-h-11 items-center font-jakarta text-sm font-semibold text-primary underline underline-offset-4"
                >
                  Lihat semua
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Package className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
                  <p className="mt-3 font-jakarta text-sm text-muted">Belum ada pesanan masuk.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {orders.slice(0, 5).map((order) => (
                    <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-jakarta font-mono text-xs font-semibold text-primary">
                            #{order.id.toString().padStart(6, "0")}
                          </span>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="mt-1 truncate font-jakarta text-sm font-medium text-primary">
                          {order.buyerName || "Pembeli"}
                        </p>
                        <p className="mt-0.5 font-jakarta text-xs text-muted">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <p className="font-jakarta text-sm font-bold text-primary">
                        {formatPrice(order.totalAmount)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : tab === "orders" ? (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Operasional</p>
                <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.03em] text-primary">
                  Pesanan
                </h1>
              </div>
              <button
                type="button"
                onClick={() => void handleManualRefresh()}
                disabled={refreshing}
                className="button button-outline"
              >
                <RefreshCw
                  className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")}
                  aria-hidden="true"
                />
                {refreshing ? "Memuat..." : "Muat ulang"}
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter status pesanan">
                {["ALL", ...orderStatuses].map((status) => (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={orderFilter === status}
                    onClick={() => setOrderFilter(status)}
                    className={cn(
                      "min-h-11 rounded-md px-3 font-jakarta text-xs font-medium transition-colors",
                      orderFilter === status
                        ? "bg-primary text-white"
                        : "border border-border-strong bg-paper text-muted hover:border-primary hover:text-primary"
                    )}
                  >
                    {status === "ALL" ? "Semua" : statusLabels[status]}
                  </button>
                ))}
              </div>

              <div className="relative w-full lg:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  type="search"
                  value={orderSearch}
                  onChange={(event) => setOrderSearch(event.target.value)}
                  placeholder="Cari ID, pembeli, produk"
                  aria-label="Cari pesanan berdasarkan ID, pembeli, atau produk"
                  className="input pl-9"
                />
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="mt-5 rounded-lg border border-border bg-paper px-6 py-12 text-center">
                <Package className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
                <p className="mt-3 font-jakarta text-sm text-muted">
                  {orders.length === 0 ? "Belum ada pesanan." : "Tidak ada pesanan yang cocok dengan filter."}
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {filteredOrders.map((order) => {
                  const transitions = nextStatuses[order.status] ?? []
                  const canEditResi = ["PAID", "PROCESSING", "SHIPPED"].includes(order.status)
                  return (
                    <article key={order.id} className="rounded-lg border border-border bg-paper p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-jakarta font-mono text-sm font-semibold text-primary">
                              #{order.id.toString().padStart(6, "0")}
                            </span>
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="mt-2 font-jakarta text-sm font-semibold text-primary">
                            {order.buyerName || "Pembeli"}
                          </p>
                          <p className="mt-0.5 font-jakarta text-xs text-muted">
                            {formatDate(order.createdAt)} · {order.shippingMethod}
                            {order.shippingCityName ? ` · ${order.shippingCityName}` : ""}
                            {typeof order.shippingDistanceKm === "number"
                              ? ` · ±${order.shippingDistanceKm.toLocaleString("id-ID", {
                                  maximumFractionDigits: 1,
                                })} km`
                              : ""}
                          </p>
                        </div>
                        <p className="font-jakarta text-lg font-bold text-primary">
                          {formatPrice(order.totalAmount)}
                        </p>
                      </div>

                      <ul className="mt-4 space-y-1 border-t border-border pt-3">
                        {order.items.map((item, index) => (
                          <li
                            key={`${order.id}-${item.productName}-${index}`}
                            className="flex items-center justify-between gap-3 font-jakarta text-sm"
                          >
                            <span className="min-w-0 truncate text-muted">
                              {item.productName} x{item.quantity}
                            </span>
                            <span className="shrink-0 font-medium text-primary">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {order.status === "CANCELLED" && (
                        <div className="mt-4 rounded-md border border-danger/20 bg-danger/5 px-4 py-3">
                          <p className="font-jakarta text-[11px] font-semibold uppercase tracking-[0.08em] text-danger">
                            Alasan penolakan
                          </p>
                          <p className="mt-1 font-jakarta text-sm text-primary">
                            {order.cancellationReason || "Tidak dicatat."}
                          </p>
                          {order.buyerPhone && (
                            <a
                              href={whatsappLink(order.buyerPhone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-success/25 px-3 font-jakarta text-xs font-semibold text-success transition-colors hover:bg-success/5"
                            >
                              <MessageCircle className="h-4 w-4" aria-hidden="true" />
                              Hubungi pembeli via WhatsApp
                            </a>
                          )}
                          <p className="mt-2 font-jakarta text-xs leading-5 text-muted">
                            Pengembalian dana (jika sudah dibayar) diselesaikan manual lewat WhatsApp.
                          </p>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
                        {transitions.length > 0 ? (
                          <label className="flex flex-col gap-1">
                            <span className="font-jakarta text-[11px] font-medium text-muted">
                              Ubah status
                            </span>
                            <select
                              value=""
                              disabled={statusUpdatingId === order.id}
                              onChange={(event) => {
                                if (event.target.value) requestStatusUpdate(order, event.target.value)
                              }}
                              className="input min-h-11 py-1.5 pr-8 text-sm"
                            >
                              <option value="" disabled>
                                {statusUpdatingId === order.id ? "Menyimpan..." : "Pilih status"}
                              </option>
                              {transitions.map((status) => (
                                <option key={status} value={status}>
                                  {statusLabels[status]}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : (
                          <p className="font-jakarta text-xs text-muted">Status akhir, tidak ada perubahan.</p>
                        )}

                        {canEditResi && (
                          <div className="flex flex-col gap-1">
                            <span className="font-jakarta text-[11px] font-medium text-muted">
                              Nomor resi
                            </span>
                            {resiEditorId === order.id ? (
                              <div className="flex gap-2">
                                <input
                                  value={resiValue}
                                  onChange={(event) => setResiValue(event.target.value)}
                                  placeholder="Masukkan resi"
                                  aria-label={`Nomor resi pesanan ${order.id}`}
                                  className="input min-h-11 w-44 py-1.5 text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => void handleResiSave(order.id)}
                                  disabled={resiSavingId === order.id}
                                  className="button button-primary min-h-11 px-3 py-1.5 text-xs"
                                >
                                  {resiSavingId === order.id ? "Menyimpan..." : "Simpan"}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setResiEditorId(order.id)
                                  setResiValue(order.resiNumber ?? "")
                                }}
                                className="inline-flex min-h-11 max-w-full items-center break-all text-left font-jakarta text-sm font-medium text-primary underline underline-offset-4"
                              >
                                {order.resiNumber ? `Resi: ${order.resiNumber}` : "Atur resi"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        ) : tab === "products" ? (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Katalog</p>
                <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.03em] text-primary">
                  Produk
                </h1>
                <p className="mt-2 font-jakarta text-sm text-muted">
                  Kelola produk, varian, stok, dan status tampilnya di toko.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null)
                  setProductError(null)
                  setProductDialogOpen(true)
                }}
                className="button button-primary"
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Produk baru
              </button>
            </div>

            <div className="relative mt-5 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                type="search"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Cari nama, origin, kategori"
                aria-label="Cari produk berdasarkan nama, origin, atau kategori"
                className="input pl-9"
              />
            </div>

            {filteredProducts.length === 0 ? (
              <div className="mt-5 rounded-lg border border-border bg-paper px-6 py-12 text-center">
                <Coffee className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
                <p className="mt-3 font-jakarta text-sm text-muted">
                  {products.length === 0 ? "Belum ada produk." : "Tidak ada produk yang cocok."}
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                {filteredProducts.map((product) => {
                  const imageSrc = productImageSource(product.imageBase64)
                  return (
                    <article
                      key={product.id}
                      className="flex flex-col gap-4 rounded-lg border border-border bg-paper p-4 sm:flex-row sm:items-center"
                    >
                      <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
                        {imageSrc ? (
                          <Image
                            src={imageSrc}
                            alt={product.name}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <Coffee className="h-5 w-5 text-muted" aria-hidden="true" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-jakarta text-sm font-semibold text-primary">{product.name}</h2>
                          <span className="rounded-sm bg-card px-2 py-0.5 font-jakarta text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                            {product.category === "ARABICA" ? "Arabika" : "Robusta"}
                          </span>
                          <span
                            className={cn(
                              "rounded-sm px-2 py-0.5 font-jakarta text-[10px] font-semibold uppercase tracking-[0.06em]",
                              product.isActive
                                ? "bg-success/10 text-success"
                                : "bg-warning/10 text-warning"
                            )}
                          >
                            {product.isActive ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>
                        <p className="mt-1 font-jakarta text-xs text-muted">
                          {product.origin} · {(product.variants?.length ?? 0)} varian · Roast {product.roastLevel}
                        </p>
                        <p className="mt-1 font-jakarta text-xs text-muted">
                          Total stok {product.stock}
                        </p>
                      </div>

                      <div className="font-jakarta sm:w-32 sm:text-right">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-muted">Mulai dari</p>
                        <p className="text-sm font-bold text-primary">
                          {formatPrice(product.price)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleToggleProductActive(product)}
                          disabled={togglingProductId === product.id}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 font-jakarta text-xs font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
                        >
                          {togglingProductId === product.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Power className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {product.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        {product.isActive && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPromotion(null)
                              setPromotionInitialProductId(product.id)
                              setPromotionError(null)
                              setPromotionDialogOpen(true)
                            }}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 font-jakarta text-xs font-medium text-primary hover:bg-primary/5"
                          >
                            <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
                            Promosikan
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(product)
                            setProductError(null)
                            setProductDialogOpen(true)
                          }}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 font-jakarta text-xs font-medium text-primary hover:bg-primary/5"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDeleteProduct(product)}
                          disabled={deletingProductId === product.id}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-danger/25 px-3 font-jakarta text-xs font-medium text-danger hover:bg-danger/5 disabled:opacity-50"
                        >
                          {deletingProductId === product.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          Hapus
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        ) : tab === "promotions" ? (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Pemasaran</p>
                <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.03em] text-primary">
                  Promosi
                </h1>
                <p className="mt-2 font-jakarta text-sm text-muted">
                  Kelola iklan bergulir yang tampil di halaman utama.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingPromotion(null)
                  setPromotionInitialProductId(null)
                  setPromotionError(null)
                  setPromotionDialogOpen(true)
                }}
                className="button button-primary"
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Promosi baru
              </button>
            </div>

            {promotions.length === 0 ? (
              <div className="mt-5 rounded-lg border border-border bg-paper px-6 py-12 text-center">
                <Megaphone className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
                <p className="mt-3 font-jakarta text-sm text-muted">Belum ada promosi.</p>
                <p className="mt-1 font-jakarta text-xs text-muted">
                  Promosi yang dibuat akan muncul di carousel halaman utama.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-2">
                {promotions.map((promotion) => {
                  const imageSrc = productImageSource(promotion.product.imageBase64)
                  const outOfStock = promotion.product.stock === 0
                  return (
                    <article
                      key={promotion.id}
                      className="flex flex-col gap-4 rounded-lg border border-border bg-paper p-4 sm:flex-row sm:items-center"
                    >
                      <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
                        {imageSrc ? (
                          <Image
                            src={imageSrc}
                            alt={promotion.product.name}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <Coffee className="h-5 w-5 text-muted" aria-hidden="true" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-jakarta text-sm font-semibold text-primary">
                            {promotion.title}
                          </h2>
                          <span
                            className={cn(
                              "rounded-sm px-2 py-0.5 font-jakarta text-[10px] font-semibold uppercase tracking-[0.06em]",
                              promotion.product.isActive
                                ? "bg-success/10 text-success"
                                : "bg-warning/10 text-warning"
                            )}
                          >
                            {promotion.product.isActive ? "Tampil" : "Tersembunyi"}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 font-jakarta text-xs leading-5 text-muted">
                          {promotion.description}
                        </p>
                        <p className="mt-1 font-jakarta text-xs text-muted">
                          {promotion.product.name} · {promotion.product.origin} ·{" "}
                          {(promotion.product.variants?.length ?? 0)} varian · Urutan{" "}
                          {promotion.sortOrder}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                        <div className="text-right">
                          <p className="font-jakarta text-[10px] uppercase tracking-[0.08em] text-muted">
                            Mulai dari
                          </p>
                          <p className="font-jakarta text-sm font-bold text-primary">
                            {formatPrice(promotion.product.price)}
                          </p>
                          <p
                            className={cn(
                              "mt-0.5 font-jakarta text-xs font-semibold",
                              outOfStock ? "text-danger" : "text-muted"
                            )}
                          >
                            {outOfStock ? "Stok habis" : `Total stok ${promotion.product.stock}`}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPromotion(promotion)
                              setPromotionInitialProductId(null)
                              setPromotionError(null)
                              setPromotionDialogOpen(true)
                            }}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 font-jakarta text-xs font-medium text-primary hover:bg-primary/5"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            Ubah
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDeletePromotion(promotion)}
                            disabled={deletingPromotionId === promotion.id}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-danger/25 px-3 font-jakarta text-xs font-medium text-danger hover:bg-danger/5 disabled:opacity-50"
                          >
                            {deletingPromotionId === promotion.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            Hapus
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div>
              <p className="eyebrow">Akun</p>
              <h1 className="font-display text-4xl font-semibold tracking-[-0.03em] text-primary">
                Pembeli
              </h1>
              <p className="mt-2 font-jakarta text-sm text-muted">
                Lihat akun pembeli dan atur aksesnya.
              </p>
            </div>

            {buyers.length === 0 ? (
              <div className="mt-5 rounded-lg border border-border bg-paper px-6 py-12 text-center">
                <Users className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
                <p className="mt-3 font-jakarta text-sm text-muted">Belum ada akun pembeli.</p>
              </div>
            ) : (
              <>
                <div className="relative mt-5 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input
                    type="search"
                    value={buyerSearch}
                    onChange={(event) => setBuyerSearch(event.target.value)}
                    placeholder="Cari nama, email, telepon, kota"
                    aria-label="Cari pembeli berdasarkan nama, email, telepon, atau kota"
                    className="input pl-9"
                  />
                </div>

                {filteredBuyers.length === 0 ? (
                  <div className="mt-5 rounded-lg border border-border bg-paper px-6 py-12 text-center">
                    <Search className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
                    <p className="mt-3 font-jakarta text-sm text-muted">
                      Tidak ada pembeli yang cocok dengan pencarian.
                    </p>
                    <button
                      type="button"
                      onClick={() => setBuyerSearch("")}
                      className="mt-2 inline-flex min-h-11 items-center font-jakarta text-sm font-semibold text-primary underline underline-offset-4"
                    >
                      Bersihkan pencarian
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 space-y-2">
                    {filteredBuyers.map((buyer) => (
                      <article
                        key={buyer.id}
                        className="flex flex-col gap-4 rounded-lg border border-border bg-paper p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-jakarta text-sm font-semibold text-primary">
                              {buyer.name}
                            </h2>
                            <span
                              className={cn(
                                "rounded-sm px-2 py-0.5 font-jakarta text-[10px] font-semibold uppercase tracking-[0.06em]",
                                buyer.status === "ACTIVE"
                                  ? "bg-success/10 text-success"
                                  : "bg-danger/10 text-danger"
                              )}
                            >
                              {buyer.status === "ACTIVE" ? "Aktif" : "Diblokir"}
                            </span>
                          </div>
                          <p className="mt-1 truncate font-jakarta text-xs text-muted">{buyer.email}</p>
                          <p className="mt-0.5 font-jakarta text-xs text-muted">
                            {buyer.phone || "Nomor telepon belum diisi"}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingBuyer(buyer)}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 font-jakarta text-xs font-medium text-primary hover:bg-primary/5"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            Selengkapnya
                          </button>
                          <button
                            type="button"
                            onClick={() => requestBuyerStatus(buyer)}
                            disabled={buyerUpdatingId === buyer.id}
                            className={cn(
                              "button",
                              buyer.status === "ACTIVE"
                                ? "border border-danger/25 text-danger hover:bg-danger/5"
                                : "border border-success/25 text-success hover:bg-success/5"
                            )}
                          >
                            {buyerUpdatingId === buyer.id
                              ? "Menyimpan..."
                              : buyer.status === "ACTIVE"
                                ? "Blokir akun"
                                : "Aktifkan akun"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {confirmRequest && (
        <ConfirmDialog
          title={confirmRequest.title}
          description={confirmRequest.description}
          confirmLabel={confirmRequest.confirmLabel}
          busy={confirmBusy}
          onConfirm={() => void runConfirm()}
          onCancel={() => {
            setConfirmRequest(null)
            setCancelReason("")
            setCancelReasonError(null)
          }}
        >
          {confirmRequest.reasonRequired && (
            <div className="space-y-2">
              <label
                htmlFor="cancel-reason"
                className="block font-jakarta text-sm font-medium text-primary"
              >
                Alasan penolakan <span className="text-danger">*</span>
              </label>
              <textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(event) => {
                  setCancelReason(event.target.value)
                  if (cancelReasonError) setCancelReasonError(null)
                }}
                maxLength={255}
                rows={3}
                placeholder="Contoh: stok habis atau alamat di luar jangkauan"
                aria-invalid={cancelReasonError ? true : undefined}
                aria-describedby={cancelReasonError ? "cancel-reason-error" : undefined}
                className="input min-h-24 resize-y"
              />
              {cancelReasonError && (
                <p
                  id="cancel-reason-error"
                  role="alert"
                  className="font-jakarta text-xs font-medium text-danger"
                >
                  {cancelReasonError}
                </p>
              )}
              <p className="font-jakarta text-xs leading-5 text-muted">
                Alasan tampil di halaman pesanan dan notifikasi pembeli. Maksimal 255 karakter.
              </p>
              {confirmRequest.buyerPhone && (
                <a
                  href={whatsappLink(confirmRequest.buyerPhone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-success/25 px-3 font-jakarta text-xs font-semibold text-success transition-colors hover:bg-success/5"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Chat pembeli via WhatsApp
                </a>
              )}
            </div>
          )}
        </ConfirmDialog>
      )}

      {viewingBuyer && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-primary/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewingBuyer(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="buyer-detail-title"
            className="w-full max-w-md rounded-lg border border-border bg-paper p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Detail pembeli</p>
                <h2 id="buyer-detail-title" className="mt-1 font-display text-2xl font-semibold text-primary">
                  {viewingBuyer.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingBuyer(null)}
                aria-label="Tutup detail"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted hover:bg-primary/5 hover:text-primary"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <dl className="mt-4 space-y-4 border-t border-border pt-4">
              <div>
                <dt className="font-jakarta text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Email</dt>
                <dd className="mt-1 break-all font-jakarta text-sm text-primary">{viewingBuyer.email}</dd>
              </div>
              <div>
                <dt className="font-jakarta text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Nomor telepon</dt>
                <dd className="mt-1 font-jakarta text-sm text-primary">{viewingBuyer.phone || "Belum diisi"}</dd>
              </div>
              <div>
                <dt className="font-jakarta text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Kota/Kabupaten</dt>
                <dd className="mt-1 font-jakarta text-sm text-primary">{viewingBuyer.city || "Belum diisi"}</dd>
              </div>
              <div>
                <dt className="font-jakarta text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Alamat lengkap</dt>
                <dd className="mt-1 font-jakarta text-sm leading-6 text-primary">{viewingBuyer.address || "Belum diisi"}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setViewingBuyer(null)}
              className="button button-primary mt-6 w-full"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {productDialogOpen && (
        <ProductFormDialog
          key={editingProduct?.id ?? "new"}
          product={editingProduct}
          saving={productSaving}
          error={productError}
          onClose={() => {
            if (!productSaving) {
              setProductDialogOpen(false)
              setEditingProduct(null)
            }
          }}
          onSubmit={handleProductSubmit}
        />
      )}

      {promotionDialogOpen && (
        <PromotionFormDialog
          key={
            editingPromotion?.id ??
            `new-${promotionInitialProductId ?? "none"}`
          }
          promotion={editingPromotion}
          products={products}
          initialProductId={promotionInitialProductId}
          saving={promotionSaving}
          error={promotionError}
          onClose={() => {
            if (!promotionSaving) {
              setPromotionDialogOpen(false)
              setEditingPromotion(null)
              setPromotionInitialProductId(null)
            }
          }}
          onSubmit={handlePromotionSubmit}
        />
      )}
    </div>
  )
}
