const MAX_OUTPUT_CHARS = 60_000
const AVATAR_SIZE = 400

export const AVATAR_MAX_SOURCE_BYTES = 8 * 1024 * 1024

function readFileAsImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new window.Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Gambar tidak dapat dibaca."))
    }
    image.src = objectUrl
  })
}

export async function compressAvatar(file: File): Promise<string> {
  const image = await readFileAsImage(file)
  const sourceSize = Math.min(image.width, image.height)
  const sourceX = (image.width - sourceSize) / 2
  const sourceY = (image.height - sourceSize) / 2

  const canvas = document.createElement("canvas")
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE

  const context = canvas.getContext("2d")
  if (!context) throw new Error("Gambar tidak dapat diproses.")

  context.fillStyle = "#fffaf2"
  context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE)
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE
  )

  let quality = 0.82
  let dataUrl = canvas.toDataURL("image/jpeg", quality)
  while (dataUrl.length > MAX_OUTPUT_CHARS && quality > 0.4) {
    quality -= 0.08
    dataUrl = canvas.toDataURL("image/jpeg", quality)
  }

  if (dataUrl.length > MAX_OUTPUT_CHARS) {
    throw new Error("Foto masih terlalu besar setelah diperkecil. Pilih foto lain.")
  }

  return dataUrl
}

export function avatarDataUrl(base64: string | null | undefined): string | null {
  if (!base64) return null
  if (base64.startsWith("data:")) return base64
  return `data:image/jpeg;base64,${base64}`
}
