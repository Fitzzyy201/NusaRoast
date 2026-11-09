/**
 * API Service - NusaRoast Frontend
 * Menghubungkan frontend Next.js ke backend NestJS
 */

import type { ShippingMethod } from "@/lib/shipping"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export const CART_UPDATED_EVENT = "nusaroast:cart-updated"

async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch {
    throw new Error(
      "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi."
    )
  }
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data === "string") return data
    if (Array.isArray(data?.message)) return data.message.join(", ")
    if (data?.message) return data.message
  } catch {
    // response had no JSON body
  }
  return `${fallback} (HTTP ${res.status})`
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function throwApiError(res: Response, fallback: string): Promise<never> {
  throw new ApiError(await readErrorMessage(res, fallback), res.status)
}

function notifyCartUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_UPDATED_EVENT))
  }
}

export interface AuthResponse {
  token: string
  user: {
    id: number
    name: string
    email: string
    role: string
    avatarBase64?: string | null
  }
}

export interface User {
  id: number
  name: string
  email: string
  phone: string
  address: string
  role: string
  status: string
}

export interface AuthUser {
  id: number
  name: string
  email: string
  role: string
  avatarBase64?: string | null
}

export interface Profile {
  id: number
  name: string
  email: string
  phone: string | null
  address: string | null
  city: string | null
  cityCode: string | null
  avatarBase64: string | null
  role: string
  status: string
  createdAt: string
}

export interface ProductVariant {
  id: number
  productId: number
  weight: string
  price: number
  stock: number
  sortOrder: number
}

export interface Product {
  id: number
  name: string
  category: "ARABICA" | "ROBUSTA"
  origin: string
  description: string | null
  flavorNotes: string[] | null
  roastLevel: number
  weight: string
  price: number
  stock: number
  imageBase64: string | null
  isActive: boolean
  variants: ProductVariant[]
}

export interface PromotionProduct {
  id: number
  name: string
  category: "ARABICA" | "ROBUSTA"
  origin: string
  description: string | null
  roastLevel: number
  weight: string
  price: number
  stock: number
  imageBase64: string | null
  isActive: boolean
  variants: ProductVariant[]
}

export interface Promotion {
  id: number
  title: string
  description: string
  sortOrder: number
  createdAt: string
  updatedAt: string
  product: PromotionProduct
}

export interface PromotionCreateData {
  productId: number
  title: string
  description: string
  sortOrder?: number
}

export type PromotionUpdateData = Partial<PromotionCreateData>

export interface CartItem {
  id: number
  productId: number
  variantId: number
  variantWeight: string
  quantity: number
  price: number
  productName: string
  productImage: string
  stock: number
}

export interface Order {
  id: number
  userId: number
  totalAmount: number
  shippingCost: number
  shippingMethod: ShippingMethod
  shippingAddress: string | null
  shippingCityCode: string | null
  shippingCityName: string | null
  shippingDistanceKm: number | null
  shippingZone: string | null
  resiNumber: string | null
  status: "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED"
  cancellationReason: string | null
  snapToken: string | null
  createdAt: string
  items: OrderItem[]
}

export interface OrderItem {
  id: number
  productId: number
  variantId: number
  variantWeight: string
  quantity: number
  price: number
  productName: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  phone: string
  address: string
  city: string
  cityCode: string
  password: string
}

export interface Region {
  code: string
  name: string
}

export interface ShippingQuoteOption {
  method: ShippingMethod
  label: string
  description: string
  cost: number
}

export interface ShippingQuote {
  origin: {
    name: string
    cityCode: string
    cityName: string
    latitude: number
    longitude: number
  }
  destination: {
    code: string
    name: string
    provinceCode: string
    latitude: number
    longitude: number
  }
  distanceKm: number
  zone: {
    code: string
    label: string
    maxKm: number | null
  }
  options: ShippingQuoteOption[]
}

export interface ForgotPasswordData {
  email: string
}

export interface ResetPasswordData {
  token: string
  newPassword: string
}

const AUTH_TOKEN_KEY = "nusaroast_token"
const AUTH_USER_KEY = "nusaroast_user"

export const AUTH_USER_UPDATED_EVENT = "nusaroast:auth-user-updated"

export const setAuthToken = (token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export const setAuthUser = (user: AuthUser) => {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_USER_UPDATED_EVENT))
  }
}

function readTokenPayload(token: string): { userId?: number; role?: string } | null {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/")
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="))
    return JSON.parse(decoded) as { userId?: number; role?: string }
  } catch {
    return null
  }
}

export const getAuthUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null
  const token = getAuthToken()
  if (!token) return null

  try {
    const stored = localStorage.getItem(AUTH_USER_KEY)
    if (stored) {
      const user = JSON.parse(stored) as AuthUser
      if (user?.id && user?.role) return user
    }
  } catch {
    localStorage.removeItem(AUTH_USER_KEY)
  }

  const payload = readTokenPayload(token)
  if (!payload?.userId || !payload.role) return null
  return {
    id: payload.userId,
    name: "",
    email: "",
    role: payload.role,
  }
}

export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}

export const isAuthenticated = (): boolean => {
  return !!getAuthToken()
}

export const isSeller = (): boolean => getAuthUser()?.role === "SELLER"

// Auth API - all auth functions
export const loginApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const res = await apiFetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Login gagal"))
    }
    const responseData = await res.json()
    if (responseData.token) {
      setAuthToken(responseData.token)
      if (responseData.user) setAuthUser(responseData.user)
    }
    return responseData
  },
}

export const registerApi = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const res = await apiFetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Pendaftaran gagal"))
    }
    const responseData = await res.json()
    if (responseData.token) {
      setAuthToken(responseData.token)
      if (responseData.user) setAuthUser(responseData.user)
    }
    return responseData
  },
}

export const profileApi = {
  async getProfile(): Promise<Profile> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/auth/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      await throwApiError(res, "Gagal memuat profil")
    }
    return res.json()
  },

  async updateProfile(data: {
    name?: string
    phone?: string
    address?: string
    city?: string
    cityCode?: string
    avatarBase64?: string
  }): Promise<Profile> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/auth/profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      await throwApiError(res, "Gagal menyimpan profil")
    }
    return res.json()
  },
}

export const forgotApi = {
  async forgotPassword(data: ForgotPasswordData): Promise<void> {
    const res = await apiFetch(`${BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Gagal mengirim tautan reset"))
    }
  },
}

export const resetApi = {
  async resetPassword(data: ResetPasswordData): Promise<void> {
    const res = await apiFetch(`${BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Gagal mereset password"))
    }
  },
}

export const regionApi = {
  async getProvinces(): Promise<Region[]> {
    const res = await apiFetch(`${BASE_URL}/regions/provinces`)
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Gagal memuat provinsi"))
    }
    return res.json()
  },

  async getRegencies(provinceCode: string): Promise<Region[]> {
    const res = await apiFetch(
      `${BASE_URL}/regions/regencies?provinceCode=${encodeURIComponent(provinceCode)}`
    )
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Gagal memuat kota"))
    }
    return res.json()
  },
}

export const shippingApi = {
  async getQuote(): Promise<ShippingQuote> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/shipping/quote`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      await throwApiError(res, "Gagal menghitung ongkir")
    }
    return res.json()
  },
}

// Product API
export interface ProductPage {
  items: Product[]
  total: number
  page: number
  totalPages: number
}

export const productApi = {
  async getProducts(
    page: number = 1,
    limit: number = 10,
    category?: string,
    search?: string
  ): Promise<ProductPage> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })
    if (category) params.append("category", category)
    if (search) params.append("search", search)

    const res = await apiFetch(`${BASE_URL}/products?${params.toString()}`, {
      cache: "no-store",
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Gagal memuat produk"))
    }
    const data = await res.json()
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      total: Number(data?.total ?? 0),
      page: Number(data?.page ?? page),
      totalPages: Number(data?.totalPages ?? 1),
    }
  },

  async getProduct(id: number): Promise<Product> {
    const res = await apiFetch(`${BASE_URL}/products/${id}`, {
      cache: "no-store",
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Produk tidak ditemukan"))
    }
    return res.json()
  },

  async getVariant(id: number): Promise<ProductVariant & {
    product: { id: number; name: string; imageBase64: string | null; isActive: boolean }
  }> {
    const res = await apiFetch(`${BASE_URL}/products/variants/${id}`, {
      cache: "no-store",
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Varian produk tidak ditemukan"))
    }
    return res.json()
  },
}

interface RawCartItem {
  id?: number | string
  productId?: number | string
  variantId?: number | string
  quantity?: number | string
  price?: number | string
  stock?: number | string
  productName?: string
  productImage?: string
  product?: {
    id?: number | string
    price?: number | string
    name?: string
    imageBase64?: string
  }
  variant?: {
    id?: number | string
    weight?: string
    price?: number | string
    stock?: number | string
  }
}

function normalizeCartItems(data: unknown): CartItem[] {
  const payload = data as { items?: unknown[] } | unknown[]
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
      ? payload.items
      : []
  return raw.map((entry) => {
    const item = entry as RawCartItem
    const product = item.product ?? {}
    const variant = item.variant ?? {}
    return {
      id: Number(item.id),
      productId: Number(item.productId ?? product.id ?? 0),
      variantId: Number(item.variantId ?? variant.id ?? 0),
      variantWeight: variant.weight ?? "",
      quantity: Number(item.quantity ?? 0),
      price: Number(variant.price ?? product.price ?? item.price ?? 0),
      productName: product.name ?? item.productName ?? "",
      productImage: product.imageBase64 ?? item.productImage ?? "",
      stock: Number(variant.stock ?? item.stock ?? 0),
    }
  })
}

export const promotionApi = {
  async getPromotions(): Promise<Promotion[]> {
    const res = await apiFetch(`${BASE_URL}/promotions`, {
      cache: "no-store",
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Gagal memuat promosi"))
    }
    const data = await res.json()
    return Array.isArray(data) ? data : []
  },
}

const GUEST_CART_KEY = "nusaroast_guest_cart"

function readGuestCart(): CartItem[] {
  if (typeof window === "undefined") return []

  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]")
    if (!Array.isArray(raw)) return []

    return raw
      .filter(
        (item): item is CartItem =>
          item !== null &&
          typeof item === "object" &&
          Number.isInteger(item.variantId) &&
          item.variantId > 0 &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0
      )
      .map((item) => ({
        ...item,
        id: -item.variantId,
        productId: Number(item.productId),
        variantId: Number(item.variantId),
        quantity: Number(item.quantity),
        price: Number(item.price),
        variantWeight: String(item.variantWeight ?? ""),
        productName: String(item.productName ?? ""),
        productImage: String(item.productImage ?? ""),
        stock: Number(item.stock ?? 0),
      }))
  } catch {
    return []
  }
}

function writeGuestCart(items: CartItem[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items))
  notifyCartUpdated()
}

// Cart API
export const cartApi = {
  async getCart(): Promise<CartItem[]> {
    const token = getAuthToken()
    if (!token) return readGuestCart()

    const res = await apiFetch(`${BASE_URL}/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(await readErrorMessage(res, "Gagal memuat keranjang"))
    return normalizeCartItems(await res.json())
  },

  async addToCart(variantId: number, quantity: number = 1): Promise<CartItem[]> {
    const token = getAuthToken()

    if (!token) {
      const variant = await productApi.getVariant(variantId)

      if (!variant) {
        throw new Error("Varian produk tidak ditemukan")
      }
      if (!variant.product.isActive) {
        throw new Error("Produk tidak ditemukan atau tidak aktif")
      }
      if (variant.stock < quantity) {
        throw new Error("Stok tidak mencukupi")
      }

      const items = readGuestCart()
      const existing = items.find((item) => item.variantId === variantId)

      if (existing) {
        if (existing.quantity + quantity > variant.stock) {
          throw new Error("Stok tidak mencukupi")
        }
        existing.quantity += quantity
      } else {
        items.push({
          id: -variantId,
          productId: variant.productId,
          variantId,
          variantWeight: variant.weight,
          quantity,
          price: variant.price,
          productName: variant.product.name,
          productImage: variant.product.imageBase64 ?? "",
          stock: variant.stock,
        })
      }

      writeGuestCart(items)
      return items
    }

    const res = await apiFetch(`${BASE_URL}/cart/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ variantId, quantity }),
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Gagal menambahkan ke keranjang"))
    }
    const items = normalizeCartItems(await res.json())
    notifyCartUpdated()
    return items
  },

  async updateCartItem(itemId: number, quantity: number): Promise<CartItem[]> {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Kuantitas tidak valid")
    }

    const token = getAuthToken()

    if (!token) {
      const items = readGuestCart()
      const item = items.find((entry) => entry.id === itemId)

      if (!item) {
        throw new Error("Item tidak ditemukan di keranjang")
      }

      const variant = await productApi.getVariant(item.variantId)

      if (!variant || !variant.product.isActive) {
        throw new Error("Produk tidak tersedia")
      }
      if (quantity > variant.stock) {
        throw new Error("Stok tidak mencukupi")
      }

      item.quantity = quantity
      item.price = variant.price
      item.stock = variant.stock
      writeGuestCart(items)
      return items
    }

    const res = await apiFetch(`${BASE_URL}/cart/items/${itemId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quantity }),
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Gagal memperbarui jumlah"))
    }
    const items = normalizeCartItems(await res.json())
    notifyCartUpdated()
    return items
  },

  async removeFromCart(itemId: number): Promise<CartItem[]> {
    const token = getAuthToken()

    if (!token) {
      const items = readGuestCart().filter((item) => item.id !== itemId)
      writeGuestCart(items)
      return items
    }

    const res = await apiFetch(`${BASE_URL}/cart/items/${itemId}/remove`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(await readErrorMessage(res, "Gagal menghapus item"))
    const items = normalizeCartItems(await res.json())
    notifyCartUpdated()
    return items
  },

  async clearCart(): Promise<CartItem[]> {
    const token = getAuthToken()

    if (!token) {
      writeGuestCart([])
      return []
    }

    const res = await apiFetch(`${BASE_URL}/cart/clear`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(await readErrorMessage(res, "Gagal mengosongkan keranjang"))
    notifyCartUpdated()
    return normalizeCartItems(await res.json())
  },

  async mergeGuestCart(): Promise<void> {
    if (!getAuthToken()) return

    const guestItems = readGuestCart()
    if (guestItems.length === 0) return

    const remaining: CartItem[] = []

    for (const item of guestItems) {
      try {
        await this.addToCart(item.variantId, item.quantity)
      } catch {
        remaining.push(item)
      }
    }

    writeGuestCart(remaining)
  },
}

// Order API
export const orderApi = {
  async getOrders(): Promise<Order[]> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/orders`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error(await readErrorMessage(res, "Gagal memuat pesanan"))
    return res.json()
  },

  async createOrder(shippingMethod: "REGULAR" | "FAST", totalAmount: number): Promise<Order> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ shippingMethod, totalAmount }),
    })
    if (!res.ok) throw new Error(await readErrorMessage(res, "Gagal membuat pesanan"))
    return res.json()
  },

  async updateOrderStatus(
    orderId: number,
    status: "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED"
  ): Promise<Order> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/orders/${orderId}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) throw new Error(await readErrorMessage(res, "Gagal memperbarui status pesanan"))
    return res.json()
  },

  async cancelOrder(orderId: number): Promise<Order> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/orders/${orderId}/cancel`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error(await readErrorMessage(res, "Gagal membatalkan pesanan"))
    return res.json()
  }
}

// Payment API
export interface PaymentResponse {
  order: {
    id: number
    status: string
    totalAmount: number
    shippingMethod: string
    createdAt: string
    userId: number
    items?: Array<{
      productId: number
      variantId: number
      productName: string
      variantWeight: string
      quantity: number
      price: number
    }>
  }
  snapToken: string
  grandTotal: number
  parameter?: unknown
  midtransConfigured?: boolean
  parameterStructure?: unknown
  configNote?: string
}

export interface PaymentCreateDto {
  shippingMethod: "REGULAR" | "FAST"
  totalAmount: number
  cartItemIds?: number[]
}

export interface PaymentStatusSyncResponse {
  orderId: number
  status: Order["status"]
  changed: boolean
  verified: boolean
}

export const paymentApi = {
  async createPayment(
    shippingMethod: "REGULAR" | "FAST",
    totalAmount: number,
    cartItemIds?: number[]
  ): Promise<PaymentResponse> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/payment/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ shippingMethod, totalAmount, cartItemIds }),
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Gagal membuat pembayaran"))
    }
    return res.json()
  },

  async createBuyNowPayment(
    variantId: number,
    quantity: number,
    shippingMethod: "REGULAR" | "FAST"
  ): Promise<PaymentResponse> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/payment/buy-now`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ variantId, quantity, shippingMethod }),
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Gagal membuat pembayaran"))
    }
    return res.json()
  },

  async retryPayment(orderId: number): Promise<PaymentResponse> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/payment/retry/${orderId}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Gagal membuat ulang pembayaran"))
    }
    return res.json()
  },

  async syncPayment(orderId: number): Promise<PaymentStatusSyncResponse> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/payment/sync/${orderId}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Gagal memverifikasi pembayaran"))
    }
    return res.json()
  },

  async verifyCallback(body: unknown): Promise<{ valid: boolean; message: string }> {
    const res = await apiFetch(`${BASE_URL}/payment/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      return { valid: false, message: "Verifikasi pembayaran gagal" }
    }
    return res.json()
  },
}

// Notification API
export interface AppNotification {
  id: number
  userId: number
  orderId: number
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export const notificationApi = {
  async getNotifications(): Promise<AppNotification[]> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/notifications`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Gagal memuat notifikasi"))
    }
    return res.json()
  },

  async markAsRead(id: number): Promise<AppNotification> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/notifications/${id}/read`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Gagal menandai notifikasi"))
    }
    return res.json()
  },

  async markAllAsRead(): Promise<{ count: number }> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/notifications/read-all`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, "Gagal menandai notifikasi"))
    }
    return res.json()
  },
}

// Admin API
export interface AdminDashboard {
  totalFinance: { totalAmount: number | null; shippingCost: number | null }
  pesananDiproses: number
  produkAktif: number
}

export interface Buyer {
  id: number
  name: string
  email: string
  phone: string | null
  city: string | null
  address: string | null
  status: "ACTIVE" | "BANNED"
}

export interface AdminOrderMutation {
  id: number
  status: string
  resiNumber: string | null
  cancellationReason?: string | null
}

export interface AdminOrder {
  id: number
  totalAmount: number
  shippingMethod: string
  shippingCost: number
  shippingCityName: string | null
  shippingDistanceKm: number | null
  shippingZone: string | null
  resiNumber: string | null
  cancellationReason: string | null
  status: string
  paymentStatus: string
  buyerName: string
  buyerPhone: string | null
  createdAt: string
  items: {
    productName: string
    variantWeight: string
    quantity: number
    price: number
  }[]
}

export interface ProductVariantInput {
  id?: number
  weight: string
  price: number
  stock: number
  sortOrder?: number
}

export interface ProductCreateData {
  name: string
  category: "ARABICA" | "ROBUSTA"
  origin: string
  description?: string
  flavorNotes?: string[]
  roastLevel: number
  variants: ProductVariantInput[]
  imageBase64?: string
  isActive?: boolean
}

export type ProductUpdateData = Partial<ProductCreateData>

export const adminApi = {
  async getDashboard(): Promise<AdminDashboard> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/admin/dashboard`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) await throwApiError(res, "Gagal memuat ringkasan penjual")
    return res.json()
  },

  async getBuyers(): Promise<Buyer[]> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/admin/buyers`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) await throwApiError(res, "Gagal memuat daftar pembeli")
    return res.json()
  },

  async banBuyer(userId: number, banned: boolean): Promise<Buyer> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/admin/buyers/ban`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ userId, banned }),
    })
    if (!res.ok) await throwApiError(res, "Gagal memperbarui status pembeli")
    return res.json()
  },

  async getOrders(status?: string): Promise<AdminOrder[]> {
    const token = getAuthToken()
    const params = status ? `?status=${encodeURIComponent(status)}` : ""
    const res = await apiFetch(`${BASE_URL}/admin/orders${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) await throwApiError(res, "Gagal memuat pesanan")
    return res.json()
  },

  async updateOrderStatus(
    orderId: number,
    status: string,
    reason?: string
  ): Promise<AdminOrderMutation> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/admin/orders/${orderId}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status, reason }),
    })
    if (!res.ok) await throwApiError(res, "Gagal memperbarui status pesanan")
    return res.json()
  },

  async inputResi(orderId: number, resiNumber: string): Promise<AdminOrderMutation> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/admin/orders/${orderId}/resi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ resiNumber }),
    })
    if (!res.ok) await throwApiError(res, "Gagal menyimpan nomor resi")
    return res.json()
  },

  // Product management (using products endpoints with admin auth)
  async createProduct(data: ProductCreateData): Promise<Product> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) await throwApiError(res, "Gagal menambahkan produk")
    return res.json()
  },

  async updateProduct(id: number, data: ProductUpdateData): Promise<Product> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/products/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) await throwApiError(res, "Gagal menyimpan produk")
    return res.json()
  },

  async deleteProduct(id: number): Promise<Product> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/products/${id}/remove`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) await throwApiError(res, "Gagal menghapus produk")
    return res.json()
  },

  async getAllProducts(): Promise<Product[]> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/admin/products`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) await throwApiError(res, "Gagal memuat produk")
    return res.json()
  },

  async getPromotions(): Promise<Promotion[]> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/admin/promotions`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) await throwApiError(res, "Gagal memuat promosi")
    return res.json()
  },

  async createPromotion(data: PromotionCreateData): Promise<Promotion> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/admin/promotions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) await throwApiError(res, "Gagal menambahkan promosi")
    return res.json()
  },

  async updatePromotion(id: number, data: PromotionUpdateData): Promise<Promotion> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/admin/promotions/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) await throwApiError(res, "Gagal menyimpan promosi")
    return res.json()
  },

  async deletePromotion(id: number): Promise<Promotion> {
    const token = getAuthToken()
    const res = await apiFetch(`${BASE_URL}/admin/promotions/${id}/remove`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) await throwApiError(res, "Gagal menghapus promosi")
    return res.json()
  },
}