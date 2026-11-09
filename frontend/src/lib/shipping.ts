export type ShippingMethod = "REGULAR" | "FAST"

export const SHIPPING_OPTIONS: Array<{
  value: ShippingMethod
  label: string
  description: string
}> = [
  {
    value: "REGULAR",
    label: "Kurir Lokal NusaRoast",
    description: "Estimasi 2–4 jam",
  },
  {
    value: "FAST",
    label: "Express NusaRoast",
    description: "Estimasi 1–2 jam",
  },
]
