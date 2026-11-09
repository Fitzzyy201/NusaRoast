export function formatPrice(price: number): string {
  return `Rp ${price.toLocaleString("id-ID")}`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "Menunggu Pembayaran",
    PAID: "Dibayar",
    PROCESSING: "Diproses",
    SHIPPED: "Dikirim",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
  }
  return labels[status] || status
}

export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: "bg-warning/10 text-warning",
    PAID: "bg-success/10 text-success",
    PROCESSING: "bg-primary/10 text-primary",
    SHIPPED: "bg-primary/10 text-primary",
    COMPLETED: "bg-success/10 text-success",
    CANCELLED: "bg-danger/10 text-danger",
  }
  return colors[status] || "bg-muted/10 text-muted"
}

export function cn(
  ...classes: (string | boolean | undefined | null)[]
): string {
  return classes.filter(Boolean).join(" ")
}
