import sharp from 'sharp'
import { MAX_IMAGE_DIMENSION } from '@/constants'

export class PreprocessError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'PreprocessError'
  }
}

export async function preprocessImage(input: Buffer): Promise<Buffer> {
  try {
    return await sharp(input)
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1 })
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer()
  } catch (err) {
    throw new PreprocessError('Error al preprocesar imagen', err)
  }
}
