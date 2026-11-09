export type RoastLevel = 1 | 2 | 3 | 4 | 5

export interface RoastLevelInfo {
  level: RoastLevel
  name: string
  description: string
  profile: string
  acidity: string
  body: string
  brew: string
}

export const ROAST_LEVELS: readonly RoastLevelInfo[] = [
  {
    level: 1,
    name: "Light Roast",
    description: "Karakter asli biji tampil paling terang dengan keasaman hidup dan body ringan.",
    profile: "Floral, fruity, tea-like",
    acidity: "Tinggi",
    body: "Ringan",
    brew: "V60, pour-over, filter",
  },
  {
    level: 2,
    name: "Medium Light",
    description: "Aroma mulai terbentuk dengan rasa lebih seimbang dan keasaman yang lembut.",
    profile: "Citrus, floral, brown sugar",
    acidity: "Sedang tinggi",
    body: "Ringan sedang",
    brew: "V60, Aeropress, filter",
  },
  {
    level: 3,
    name: "Medium",
    description: "Rasa seimbang antara manis, asam, dan body. Mudah dinikmati.",
    profile: "Caramel, chocolate, balanced",
    acidity: "Sedang",
    body: "Medium",
    brew: "Drip, Aeropress, V60",
  },
  {
    level: 4,
    name: "Medium Dark",
    description: "Rasa lebih dalam dengan cokelat dan karamel, keasaman rendah, body penuh.",
    profile: "Dark chocolate, caramel, spice",
    acidity: "Rendah",
    body: "Medium penuh",
    brew: "Espresso, moka pot, kopi susu",
  },
  {
    level: 5,
    name: "Dark Roast",
    description: "Panggangan paling dalam dengan rasa bold, pekat, dan body penuh.",
    profile: "Cocoa, smoky, bold",
    acidity: "Sangat rendah",
    body: "Penuh",
    brew: "Espresso, kopi susu, tubruk pekat",
  },
]

export function getRoastLevelInfo(level: number): RoastLevelInfo | undefined {
  return ROAST_LEVELS.find((item) => item.level === level)
}

export function getRoastLevelLabel(level: number): string {
  return getRoastLevelInfo(level)?.name ?? `Level ${level}`
}
