"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import {
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Coffee,
  Copy,
  Package,
  RefreshCw,
  Truck,
  XCircle,
} from "lucide-react"
import { getAuthToken, orderApi, paymentApi, Order, OrderItem } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Countdown } from "@/components/ui/countdown"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { BackButton } from "@/components/ui/back-button"
import { cn, formatDate, formatPrice } from "@/lib/utils"
import { payWithSnap } from "@/lib/snap"

const statusConfig = {
  PENDING: {
    label: "Menunggu pembayaran",
    className: "bg-warning/10 text-warning",
    icon: Clock,
  },
  PAID: {
    label: "Dibayar",
    className: "bg-success/10 text-success",
    icon: CheckCircle,
  },
  PROCESSING: {
    label: "Diproses",
    className: "bg-primary/10 text-primary",
    icon: Package,
  },
  SHIPPED: {
    label: "Dikirim",
    className: "bg-primary/10 text-primary",
    icon: Truck,
  },
  COMPLETED: {
    label: "Selesai",
    className: "bg-success/10 text-success",
    icon: CheckCircle,
  },
  CANCELLED: {
    label: "Dibatalkan",
    className: "bg-danger/10 text-danger",
    icon: XCircle,
  },
}

type Filter = "ALL" | "ACTIVE" | "COMPLETED" | "CANCELLED"

const filters: { value: Filter; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "ACTIVE", label: "Berjalan" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
]

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signedIn, setSignedIn] = useState(true)
  const [filter, setFilter] = useState<Filter>("ALL")
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)
  const [retryingOrderId, setRetryingOrderId] = useState<number | null>(null)
  const [payingOrderId, setPayingOrderId] = useState<number | null>(null)
  const [checkingOrderId, setCheckingOrderId] = useState<number | null>(null)
  const [retryError, setRetryError] = useState<{ orderId: number; message: string } | null>(null)
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [confirmingOrderId, setConfirmingOrderId] = useState<number | null>(null)
  const [completingOrderId, setCompletingOrderId] = useState<number | null>(null)
  const [copiedResiOrderId, setCopiedResiOrderId] = useState<number | null>(null)
  const [expiredOrderIds, setExpiredOrderIds] = useState<Set<number>>(new Set())
  const copyTimeoutRef = useRef<number | null>(null)
  const paymentPollRef = useRef<number | null>(null)
  const initializedRef = useRef(false)

  const fetchOrders = useCallback(async (showLoading = true) => {
    if (!getAuthToken()) {
      setSignedIn(false)
      setOrders([])
      setExpiredOrderIds(new Set())
      setLoading(false)
      return
    }

    setSignedIn(true)
    if (showLoading) {
      setLoading(true)
      setError(null)
    }

    try {
      const data = await orderApi.getOrders()
      const currentTime = Date.now()
      setOrders(data)
      setExpiredOrderIds(
        new Set(
          data
            .filter(
              (order) =>
                order.status === "PENDING" &&
                new Date(order.createdAt).getTime() + 20 * 60 * 1000 <= currentTime
            )
            .map((order) => order.id)
        )
      )
      setError(null)
    } catch {
      if (showLoading) {
        setError("Gagal memuat riwayat pesanan.")
      }
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [])

  const refreshOrdersSilently = useCallback(() => {
    void fetchOrders(false)
  }, [fetchOrders])

  const stopPaymentPolling = useCallback(() => {
    if (paymentPollRef.current !== null) {
      window.clearTimeout(paymentPollRef.current)
      paymentPollRef.current = null
    }
  }, [])

  const startPaymentPolling = useCallback(
    (orderId: number) => {
      stopPaymentPolling()

      let attempts = 0
      const maxAttempts = 30

      const tick = async () => {
        attempts += 1

        try {
          const result = await paymentApi.syncPayment(orderId)

          if (result.status !== "PENDING") {
            setOrders((prev) =>
              prev.map((item) =>
                item.id === orderId ? { ...item, status: result.status } : item
              )
            )
            setNotice(
              result.status === "CANCELLED"
                ? { type: "error", message: "Pembayaran tidak berhasil. Pesanan dibatalkan." }
                : { type: "success", message: "Pembayaran terkonfirmasi." }
            )
            void fetchOrders(false)
            stopPaymentPolling()
            return
          }
        } catch {
          // Transient sync failures are retried until the limit is reached.
        }

        if (attempts >= maxAttempts) {
          setNotice({
            type: "error",
            message: "Status pembayaran belum terkonfirmasi. Muat ulang halaman untuk memeriksa kembali.",
          })
          void fetchOrders(false)
          stopPaymentPolling()
          return
        }

        paymentPollRef.current = window.setTimeout(() => void tick(), 2000)
      }

      void tick()
    },
    [fetchOrders, stopPaymentPolling]
  )

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    void fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current)
      }
      if (paymentPollRef.current !== null) {
        window.clearTimeout(paymentPollRef.current)
      }
    }
  }, [])

  const handleCopyResi = async (order: Order) => {
    if (!order.resiNumber) return

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard tidak tersedia")
      }
      await navigator.clipboard.writeText(order.resiNumber)
      setCopiedResiOrderId(order.id)
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopiedResiOrderId(null)
        copyTimeoutRef.current = null
      }, 2200)
    } catch {
      setNotice({
        type: "error",
        message: "Nomor resi gagal disalin. Pilih nomor resi secara manual.",
      })
    }
  }

  const handleConfirmReceived = async (orderId: number) => {
    setCompletingOrderId(orderId)
    setNotice(null)
    try {
      const updatedOrder = await orderApi.updateOrderStatus(orderId, "COMPLETED")
      setOrders((prev) =>
        prev.map((item) => (item.id === orderId ? { ...item, ...updatedOrder } : item))
      )
      setNotice({ type: "success", message: "Pesanan ditandai selesai. Terima kasih." })
      void fetchOrders(false)
    } catch {
      setNotice({ type: "error", message: "Gagal mengonfirmasi pesanan. Coba lagi." })
    } finally {
      setCompletingOrderId(null)
      setConfirmingOrderId(null)
    }
  }

  const handleCheckPaymentStatus = async (orderId: number) => {
    setCheckingOrderId(orderId)
    setNotice(null)
    try {
      const result = await paymentApi.syncPayment(orderId)
      setOrders((prev) =>
        prev.map((item) => (item.id === orderId ? { ...item, status: result.status } : item))
      )
      if (result.status === "PAID") {
        setNotice({ type: "success", message: "Pembayaran terkonfirmasi! Status pesanan telah diperbarui." })
      } else if (result.status === "CANCELLED") {
        setNotice({ type: "error", message: "Pembayaran tidak berhasil atau kadaluarsa. Pesanan dibatalkan." })
      } else {
        setNotice({ type: "error", message: "Pembayaran belum terkonfirmasi oleh Midtrans. Pastikan transaksi telah diselesaikan." })
      }
      void fetchOrders(false)
    } catch {
      setNotice({ type: "error", message: "Gagal memeriksa status pembayaran. Coba beberapa saat lagi." })
    } finally {
      setCheckingOrderId(null)
    }
  }

  const handlePayNow = async (order: Order) => {
    if (!order.snapToken || payingOrderId !== null) return
    setNotice(null)
    setPayingOrderId(order.id)
    try {
      await payWithSnap(order.snapToken, {
        onSuccess: () => {
          setNotice({ type: "success", message: "Pembayaran diterima. Menunggu konfirmasi status..." })
          startPaymentPolling(order.id)
        },
        onPending: () => {
          setNotice({ type: "success", message: "Pembayaran diterima. Menunggu konfirmasi status..." })
          startPaymentPolling(order.id)
        },
        onError: () => {
          setNotice({ type: "error", message: "Pembayaran gagal atau dibatalkan. Status pesanan belum berubah." })
          void fetchOrders(false)
        },
        onClose: () => {
          startPaymentPolling(order.id)
          void handleCheckPaymentStatus(order.id)
        },
      })
    } catch {
      setNotice({ type: "error", message: "Gagal membuka pembayaran. Silakan coba lagi." })
    } finally {
      setPayingOrderId(null)
    }
  }

  const handleRetryPayment = async (order: Order) => {
    setRetryingOrderId(order.id)
    setRetryError(null)
    setNotice(null)
    try {
      const result = await paymentApi.retryPayment(order.id)
      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? { ...item, snapToken: result.snapToken, status: result.order.status as Order["status"] }
            : item
        )
      )

      try {
        await payWithSnap(result.snapToken, {
          onSuccess: () => {
            setNotice({ type: "success", message: "Pembayaran diterima. Menunggu konfirmasi status..." })
            startPaymentPolling(order.id)
          },
          onPending: () => {
            setNotice({ type: "success", message: "Pembayaran diterima. Menunggu konfirmasi status..." })
            startPaymentPolling(order.id)
          },
          onError: () => {
            setNotice({ type: "error", message: "Pembayaran gagal atau dibatalkan. Status pesanan belum berubah." })
            void fetchOrders(false)
          },
          onClose: () => {
            startPaymentPolling(order.id)
            void handleCheckPaymentStatus(order.id)
          },
        })
      } catch {
        setNotice({
          type: "error",
          message: "Token pembayaran berhasil dibuat. Klik Bayar sekarang untuk melanjutkan.",
        })
      }
    } catch (err) {
      setRetryError({
        orderId: order.id,
        message:
          err instanceof Error
            ? err.message
            : "Gagal membuat pembayaran. Silakan coba lagi.",
      })
      void fetchOrders(false)
    } finally {
      setRetryingOrderId(null)
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (filter === "ALL") return true
    if (filter === "ACTIVE") {
      return ["PENDING", "PAID", "PROCESSING", "SHIPPED"].includes(order.status)
    }
    return order.status === filter
  })

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-background py-6 sm:py-10 lg:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="border-b border-border pb-4 sm:pb-6">
            <p className="eyebrow">Akun</p>
            <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-[-0.025em] text-primary sm:mt-2 sm:text-5xl">
              Pesanan saya
            </h1>
          </div>
          <div className="mt-5 space-y-2.5 sm:mt-8 sm:space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-lg border border-border bg-paper p-4 sm:p-5">
                <div className="flex flex-wrap gap-3 sm:gap-4">
                  <div className="h-4 w-24 rounded bg-card" />
                  <div className="h-4 w-32 rounded bg-card" />
                  <div className="ml-auto h-4 w-20 rounded bg-card" />
                </div>
                <div className="mt-4 h-5 w-1/2 rounded bg-card sm:mt-5 sm:h-6" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!signedIn) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-background py-6 sm:py-10 lg:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="border-b border-border pb-4 sm:pb-6">
            <p className="eyebrow">Akun</p>
            <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-[-0.025em] text-primary sm:mt-2 sm:text-5xl">
              Pesanan saya
            </h1>
          </div>
          <section className="mx-auto mt-8 max-w-lg rounded-lg border border-border bg-paper px-5 py-8 text-center sm:mt-12 sm:px-6 sm:py-12">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-card text-primary sm:h-14 sm:w-14">
              <Package className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold text-primary sm:mt-5 sm:text-2xl">
              Masuk untuk melihat pesanan
            </h2>
            <p className="mt-2 font-jakarta text-[13px] leading-5 text-muted sm:text-sm sm:leading-relaxed">
              Riwayat pesanan dan status pembayaran tersimpan di akun Anda.
            </p>
            <Link
              href={`/login?redirect=${encodeURIComponent("/orders")}`}
              className="button button-primary mt-5 sm:mt-6"
            >
              Masuk ke akun
            </Link>
          </section>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-72px)] bg-background py-6 sm:py-10 lg:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="border-b border-border pb-4 sm:pb-6">
            <p className="eyebrow">Akun</p>
            <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-[-0.025em] text-primary sm:mt-2 sm:text-5xl">
              Pesanan saya
            </h1>
          </div>
          <section className="mx-auto mt-8 max-w-lg rounded-lg border border-border bg-paper px-5 py-8 text-center sm:mt-12 sm:px-6 sm:py-12">
            <XCircle className="mx-auto h-9 w-9 text-danger sm:h-10 sm:w-10" aria-hidden="true" />
            <h2 className="mt-3 font-display text-xl font-semibold text-primary sm:mt-4 sm:text-2xl">
              Riwayat tidak dapat dimuat
            </h2>
            <p className="mt-2 font-jakarta text-[13px] text-muted sm:text-sm">{error}</p>
            <Button variant="outline" className="mt-5 sm:mt-6" onClick={() => void fetchOrders()}>
              Coba lagi
            </Button>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-72px)] bg-background py-10 lg:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4 sm:gap-4 sm:pb-6">
          <div>
            <BackButton />
            <p className="eyebrow">Akun</p>
            <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-[-0.025em] text-primary sm:mt-2 sm:text-5xl">
              Pesanan saya
            </h1>
            {orders.length > 0 && (
              <p className="mt-1.5 font-jakarta text-[13px] text-muted sm:mt-2 sm:text-sm">
                {orders.length} pesanan tercatat di akun ini.
              </p>
            )}
          </div>
          <Link href="/products" className="button button-outline text-sm sm:text-base">
            Belanja lagi
          </Link>
        </div>

        {notice && (
          <div
            role={notice.type === "error" ? "alert" : "status"}
            className={cn(
              "mt-4 rounded-md border px-3 py-2.5 font-jakarta text-[13px] font-medium sm:mt-6 sm:px-4 sm:py-3 sm:text-sm",
              notice.type === "success"
                ? "border-success/25 bg-success/5 text-success"
                : "border-danger/25 bg-danger/5 text-danger"
            )}
          >
            {notice.message}
          </div>
        )}

        {orders.length === 0 ? (
          <section className="mx-auto mt-8 max-w-lg rounded-lg border border-border bg-paper px-5 py-8 text-center sm:mt-12 sm:px-6 sm:py-12">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-card text-primary sm:h-14 sm:w-14">
              <Coffee className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold text-primary sm:mt-5 sm:text-2xl">
              Belum ada pesanan
            </h2>
            <p className="mt-2 font-jakarta text-[13px] leading-5 text-muted sm:text-sm sm:leading-relaxed">
              Pesanan yang Anda buat akan muncul di sini beserta status pembayarannya.
            </p>
            <Link href="/products" className="button button-primary mt-5 sm:mt-6">
              Jelajahi kopi
            </Link>
          </section>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap gap-1.5" role="group" aria-label="Filter pesanan">
              {filters.map((item) => {
                const active = filter === item.value
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(item.value)}
                    className={cn(
                      "min-h-11 rounded-md px-3 font-jakarta text-xs font-medium transition-colors sm:px-3.5 sm:text-sm",
                      active
                        ? "bg-primary text-white"
                        : "border border-border-strong text-muted hover:bg-primary/5 hover:text-primary"
                    )}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>

            {filteredOrders.length === 0 ? (
              <section className="mt-5 rounded-lg border border-border bg-paper px-5 py-7 text-center sm:mt-8 sm:px-6 sm:py-10">
                <p className="font-jakarta text-sm text-muted">
                  Tidak ada pesanan pada filter ini.
                </p>
                <button
                  type="button"
                  onClick={() => setFilter("ALL")}
                  className="mt-2 inline-flex min-h-11 items-center font-jakarta text-sm font-semibold text-primary underline underline-offset-4"
                >
                  Lihat semua pesanan
                </button>
              </section>
            ) : (
              <div className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
                {filteredOrders.map((order) => {
                  const statusCfg = statusConfig[order.status] || {
                    label: order.status,
                    className: "bg-muted/10 text-muted",
                    icon: null,
                  }
                  const StatusIcon = statusCfg.icon
                  const createdAt = new Date(order.createdAt)
                  const paymentDeadline = new Date(createdAt.getTime() + 20 * 60 * 1000).toISOString()
                  const paymentExpired = expiredOrderIds.has(order.id)
                  const isPending = order.status === "PENDING"
                  const isShipped = order.status === "SHIPPED"
                  const isCancelled = order.status === "CANCELLED"
                  const expanded = expandedOrderId === order.id

                  return (
                    <article
                      key={order.id}
                      className={cn(
                        "overflow-hidden rounded-lg border bg-paper transition-colors",
                        expanded ? "border-primary/40" : "border-border"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedOrderId(expanded ? null : order.id)}
                        className="w-full p-4 text-left transition-colors hover:bg-primary/[0.03] sm:p-6"
                        aria-expanded={expanded}
                        aria-controls={`order-${order.id}-details`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:gap-x-4 sm:gap-y-2">
                              <span className="font-jakarta font-mono text-[13px] font-semibold text-primary sm:text-sm">
                                #{order.id.toString().padStart(6, "0")}
                              </span>
                              <span className="font-jakarta text-[11px] text-muted sm:text-xs">
                                {formatDate(order.createdAt)}
                              </span>
                              <span className="font-jakarta text-[11px] text-muted sm:text-xs">
                                {order.shippingMethod === "FAST" ? "Fast" : "Regular"}
                              </span>
                              {order.shippingCityName && (
                                <span className="font-jakarta text-[11px] text-muted sm:text-xs">
                                  ke {order.shippingCityName}
                                </span>
                              )}
                              {typeof order.shippingDistanceKm === "number" && (
                                <span className="font-jakarta text-[11px] text-muted sm:text-xs">
                                  ±
                                  {order.shippingDistanceKm.toLocaleString("id-ID", {
                                    maximumFractionDigits: 1,
                                  })}{" "}
                                  km
                                </span>
                              )}
                            </div>
                            <p className="mt-2 font-jakarta text-base font-bold text-primary sm:mt-3 sm:text-lg">
                              {formatPrice(order.totalAmount)}
                            </p>
                            <p className="mt-1 line-clamp-1 font-jakarta text-[13px] text-muted sm:text-sm">
                              {order.items.map((item) => item.productName).join(", ")}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-jakarta text-[10px] font-semibold uppercase tracking-[0.06em] sm:px-2.5 sm:text-[11px]",
                                statusCfg.className
                              )}
                            >
                              {StatusIcon && <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                              {statusCfg.label}
                            </span>
                            <span className="flex items-center gap-2">
                              {isPending && (
                                <span className="flex items-center gap-1.5 font-jakarta text-xs text-warning">
                                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                  <Countdown targetTime={paymentDeadline} onExpire={refreshOrdersSilently} />
                                </span>
                              )}
                              {expanded ? (
                                <ChevronUp className="h-5 w-5 text-muted" aria-hidden="true" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted" aria-hidden="true" />
                              )}
                            </span>
                          </div>
                        </div>
                      </button>

                      {expanded && (
                        <div
                          id={`order-${order.id}-details`}
                          className="border-t border-border bg-background/60 p-4 sm:p-6"
                        >
                          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
                            <div>
                              <h3 className="font-jakarta text-sm font-semibold text-primary">
                                Produk
                              </h3>
                              <div className="mt-3 space-y-2">
                                {order.items.map((item: OrderItem) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between gap-2.5 rounded-md border border-border bg-paper p-2.5 sm:gap-3 sm:p-3"
                                  >
                                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-card text-muted sm:h-10 sm:w-10">
                                        <Coffee className="h-4 w-4" aria-hidden="true" />
                                      </span>
                                      <div className="min-w-0">
                                        <p className="truncate font-jakarta text-[13px] font-semibold text-primary sm:text-sm">
                                          {item.productName}  -  {item.variantWeight}
                                        </p>
                                        <p className="mt-0.5 font-jakarta text-[11px] text-muted sm:text-xs">
                                          {item.quantity} x {formatPrice(item.price)}
                                        </p>
                                      </div>
                                    </div>
                                    <span className="shrink-0 font-jakarta text-[13px] font-semibold text-primary sm:text-sm">
                                      {formatPrice(item.price * item.quantity)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="rounded-md border border-border bg-paper p-3.5 sm:p-4">
                                <h3 className="font-jakarta text-[13px] font-semibold text-primary sm:text-sm">
                                  Ringkasan pembayaran
                                </h3>
                                <dl className="mt-2.5 space-y-2 font-jakarta text-[13px] sm:mt-3 sm:text-sm">
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-muted">Subtotal produk</dt>
                                    <dd className="font-medium text-primary">
                                      {formatPrice(
                                        order.items.reduce(
                                          (sum, item) => sum + item.price * item.quantity,
                                          0
                                        )
                                      )}
                                    </dd>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <dt className="text-muted">Biaya kirim</dt>
                                    <dd className="font-medium text-primary">
                                      {formatPrice(order.shippingCost)}
                                    </dd>
                                  </div>
                                  <div className="flex justify-between gap-4 border-t border-border pt-2">
                                    <dt className="font-semibold text-primary">Total</dt>
                                    <dd className="font-bold text-primary">
                                      {formatPrice(order.totalAmount)}
                                    </dd>
                                  </div>
                                </dl>
                              </div>

                              {isPending && (
                                paymentExpired ? (
                                  <div className="rounded-md border border-danger/25 bg-danger/5 px-3.5 py-3">
                                    <p className="font-jakarta text-sm font-medium text-danger">
                                      Waktu pembayaran 20 menit sudah habis.
                                    </p>
                                    <p className="mt-1 font-jakarta text-xs leading-5 text-muted">
                                      Pesanan ini tidak dapat dibayar lagi. Silakan buat pesanan baru.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {order.snapToken ? (
                                      <Button
                                        variant="primary"
                                        className="w-full"
                                        onClick={() => void handlePayNow(order)}
                                        disabled={payingOrderId !== null || checkingOrderId === order.id}
                                        aria-busy={payingOrderId === order.id || undefined}
                                      >
                                        {payingOrderId === order.id ? "Membuka pembayaran..." : "Bayar sekarang"}
                                      </Button>
                                    ) : (
                                      <div className="space-y-2">
                                        <Button
                                          variant="primary"
                                          className="w-full"
                                          onClick={() => void handleRetryPayment(order)}
                                          disabled={retryingOrderId === order.id || checkingOrderId === order.id}
                                        >
                                          {retryingOrderId === order.id
                                            ? "Membuat pembayaran..."
                                            : "Buat pembayaran"}
                                        </Button>
                                        {retryError?.orderId === order.id && (
                                          <p className="font-jakarta text-sm text-danger" role="alert">
                                            {retryError.message}
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    <Button
                                      variant="outline"
                                      className="w-full"
                                      onClick={() => void handleCheckPaymentStatus(order.id)}
                                      disabled={checkingOrderId === order.id || payingOrderId !== null}
                                    >
                                      <RefreshCw
                                        className={`mr-2 h-4 w-4 ${checkingOrderId === order.id ? "animate-spin" : ""}`}
                                        aria-hidden="true"
                                      />
                                      {checkingOrderId === order.id ? "Mengecek status..." : "Cek status pembayaran"}
                                    </Button>
                                  </div>
                                )
                              )}

                              {isShipped && (
                                <div className="space-y-3">
                                  <div className="rounded-md border border-primary/20 bg-primary/5 p-3.5 sm:p-4">
                                    <div className="flex items-center gap-2">
                                      <Truck className="h-4 w-4 text-primary" aria-hidden="true" />
                                      <h3 className="font-jakarta text-sm font-semibold text-primary">
                                        Pesanan dikirim
                                      </h3>
                                    </div>
                                    {order.resiNumber ? (
                                      <div className="mt-3 rounded-md border border-border bg-paper px-3 py-2.5">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="font-jakarta text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                                              Nomor resi
                                            </p>
                                            <code className="mt-1 block break-all font-jakarta text-sm font-semibold text-primary">
                                              {order.resiNumber}
                                            </code>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => void handleCopyResi(order)}
                                            aria-live="polite"
                                            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 font-jakarta text-xs font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/5"
                                            aria-label={`Salin nomor resi ${order.resiNumber}`}
                                          >
                                            {copiedResiOrderId === order.id ? (
                                              <>
                                                <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                                                Tersalin
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                                Salin
                                              </>
                                            )}
                                          </button>
                                        </div>
                                        <p className="mt-2 font-jakarta text-xs leading-5 text-muted">
                                          Gunakan nomor ini untuk melacak paket di layanan kurir.
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="mt-2 font-jakarta text-xs leading-5 text-muted">
                                        Nomor resi belum dimasukkan oleh admin.
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    variant="primary"
                                    className="w-full"
                                    onClick={() => setConfirmingOrderId(order.id)}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Konfirmasi pesanan diterima
                                  </Button>
                                </div>
                              )}

                              {isCancelled ? (
                                <div className="rounded-md border border-danger/20 bg-danger/5 p-3.5 sm:p-4">
                                  <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-danger" aria-hidden="true" />
                                    <h3 className="font-jakarta text-sm font-semibold text-primary">
                                      Pesanan dibatalkan
                                    </h3>
                                  </div>
                                  <p className="mt-2 font-jakarta text-[13px] leading-5 text-muted sm:text-sm">
                                    Pesanan ini dibatalkan oleh admin.
                                  </p>
                                  {order.cancellationReason && (
                                    <div className="mt-2.5 rounded-md border border-border bg-paper px-3 py-2.5">
                                      <p className="font-jakarta text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                                        Alasan penolakan
                                      </p>
                                      <p className="mt-1 font-jakarta text-sm text-primary">
                                        {order.cancellationReason}
                                      </p>
                                    </div>
                                  )}
                                  <p className="mt-2.5 font-jakarta text-xs leading-5 text-muted">
                                    Sudah membayar? Admin akan menghubungi Anda via WhatsApp
                                    untuk urusan pengembalian dana.
                                  </p>
                                </div>
                              ) : (
                                <div className="rounded-md border border-border bg-paper px-3 py-3 text-center">
                                  <p className="font-jakarta text-sm text-muted">
                                    Pesanan ini telah selesai.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {confirmingOrderId !== null && (
        <ConfirmDialog
          title="Pesanan sudah diterima?"
          description="Konfirmasi hanya setelah paket tiba. Status pesanan akan diubah menjadi selesai."
          confirmLabel="Ya, sudah diterima"
          tone="primary"
          busy={completingOrderId === confirmingOrderId}
          onConfirm={() => void handleConfirmReceived(confirmingOrderId)}
          onCancel={() => setConfirmingOrderId(null)}
        />
      )}
    </div>
  )
}
