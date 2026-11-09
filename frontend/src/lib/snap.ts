export interface SnapResult {
  order_id?: string
  transaction_status?: string
  status_code?: string
  [key: string]: unknown
}

interface SnapCallbacks {
  onSuccess?: (result: SnapResult) => void
  onPending?: (result: SnapResult) => void
  onError?: (result: SnapResult) => void
  onClose?: () => void
}

interface SnapGlobal {
  pay: (token: string, callbacks?: SnapCallbacks) => void
}

declare global {
  interface Window {
    snap?: SnapGlobal
  }
}

let loader: Promise<void> | null = null

function snapScriptUrl(): string {
  return process.env.NEXT_PUBLIC_MIDTRANS_ENV === "production"
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js"
}

export function loadSnap(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Midtrans Snap hanya tersedia di browser"))
  }

  if (window.snap) return Promise.resolve()
  if (loader) return loader

  loader = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("midtrans-snap-js") as HTMLScriptElement | null

    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Gagal memuat Midtrans Snap")))
      return
    }

    const script = document.createElement("script")
    script.id = "midtrans-snap-js"
    script.src = snapScriptUrl()
    script.async = true
    script.setAttribute("data-client-key", process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "")
    script.onload = () => resolve()
    script.onerror = () => {
      loader = null
      reject(new Error("Gagal memuat Midtrans Snap"))
    }
    document.body.appendChild(script)
  })

  return loader
}

export async function payWithSnap(token: string, callbacks: SnapCallbacks = {}): Promise<void> {
  await loadSnap()

  if (!window.snap) {
    throw new Error("Midtrans Snap tidak tersedia")
  }

  window.snap.pay(token, callbacks)
}
