import { MAX_FILE_SIZE_BYTES, SUPPORTED_MIME_TYPES } from '@/constants'
import type { ApiError } from '@/types'

export function validateFile(
  file: File | null | undefined,
): { valid: true } | { valid: false; error: ApiError } {
  if (!file) {
    return { valid: false, error: { error: 'No se recibió ningún archivo', code: 'UNSUPPORTED_TYPE' } }
  }

  if (!SUPPORTED_MIME_TYPES.includes(file.type as (typeof SUPPORTED_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: {
        error: `Tipo de archivo no soportado: ${file.type}. Use PNG, JPG, WEBP, TIFF o BMP.`,
        code: 'UNSUPPORTED_TYPE',
      },
    }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: {
        error: `El archivo supera el límite de 10 MB (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
        code: 'FILE_TOO_LARGE',
      },
    }
  }

  return { valid: true }
}
