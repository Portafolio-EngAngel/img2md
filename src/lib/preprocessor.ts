import { MAX_IMAGE_DIMENSION } from '@/constants'

export class PreprocessError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'PreprocessError'
  }
}

function computeFitSize(width: number, height: number, max: number): { width: number; height: number } {
  if (width <= max && height <= max) return { width, height }
  const ratio = Math.min(max / width, max / height)
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) }
}

// Escala de grises + normalización de contraste (stretch al rango 0-255) en un solo paso
function grayscaleAndNormalize(data: Uint8ClampedArray): void {
  const pixelCount = data.length / 4
  const gray = new Uint8ClampedArray(pixelCount)
  let min = 255
  let max = 0

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    gray[p] = g
    if (g < min) min = g
    if (g > max) max = g
  }

  const range = max - min || 1
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const normalized = ((gray[p] - min) / range) * 255
    data[i] = data[i + 1] = data[i + 2] = normalized
  }
}

// Kernel de nitidez 3x3 estándar
function sharpen(imageData: ImageData): ImageData {
  const { width, height, data } = imageData
  const out = new Uint8ClampedArray(data)
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0]

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0
      let k = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          sum += data[((y + ky) * width + (x + kx)) * 4] * kernel[k++]
        }
      }
      const idx = (y * width + x) * 4
      out[idx] = out[idx + 1] = out[idx + 2] = sum
    }
  }

  return new ImageData(out, width, height)
}

// Preprocesamiento 100% en el navegador (Canvas API) — reemplaza al pipeline de Sharp,
// que solo podía correr en un servidor Node y era incompatible con el límite de 10s de Vercel.
export async function preprocessImage(file: File | Blob): Promise<HTMLCanvasElement> {
  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = computeFitSize(bitmap.width, bitmap.height, MAX_IMAGE_DIMENSION)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo obtener contexto 2D de canvas')

    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    let imageData = ctx.getImageData(0, 0, width, height)
    grayscaleAndNormalize(imageData.data)
    imageData = sharpen(imageData)
    ctx.putImageData(imageData, 0, 0)

    return canvas
  } catch (err) {
    throw new PreprocessError('Error al preprocesar imagen', err)
  }
}
