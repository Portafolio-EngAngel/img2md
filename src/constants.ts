export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export const SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/tiff',
  'image/bmp',
] as const

export const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.tif', '.bmp']

export const MAX_IMAGE_DIMENSION = 3000 // px — se reescala en canvas antes de OCR

export const TESSDATA_PATH = '/tessdata' // servido como estático desde /public

export const SUPPORTED_LANGUAGES = ['eng', 'spa', 'eng+spa', 'equ'] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const DEFAULT_LANGUAGE: SupportedLanguage = 'spa'

// 'equ' se combina con 'eng' internamente — el modelo de ecuaciones solo
// no reconoce letras latinas correctamente sin el modelo base
export const LANG_TO_TESSDATA: Record<SupportedLanguage, string> = {
  eng: 'eng',
  spa: 'spa',
  'eng+spa': 'eng+spa',
  equ: 'eng+equ',
}

export const MAX_BATCH_CONCURRENCY = 2

// Palabras con confianza OCR por debajo de este umbral se descartan del output
export const MIN_WORD_CONFIDENCE = 30

// Líneas donde menos del X% de palabras pasan el umbral se descartan completas
export const MIN_LINE_CONFIDENCE_RATIO = 0.4
