import type { SupportedLanguage } from '@/constants'
export type { SupportedLanguage }

// — Conversion result —

export interface ConvertStats {
  words: number
  lines: number
  processingMs: number
}

export interface ConvertResponse {
  markdown: string
  stats: ConvertStats
}

export interface ApiError {
  error: string
  code: 'FILE_TOO_LARGE' | 'UNSUPPORTED_TYPE' | 'OCR_FAILED' | 'PARSE_FAILED'
}

// — OCR internal types —

export interface BBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface OcrWord {
  text: string
  bbox: BBox
  confidence: number
}

export interface OcrLine {
  text: string
  bbox: BBox
  words: OcrWord[]
}

export interface OcrResult {
  text: string
  words: OcrWord[]
  lines: OcrLine[]
}

// — Parser internal block types —

export type ParsedBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'code'; text: string }

// — Client state types —

export type ConversionStatus = 'idle' | 'processing' | 'done' | 'error'

export interface ConversionState {
  status: ConversionStatus
  progress: number
  result: ConvertResponse | null
  error: string | null
}

export interface FileEntry {
  id: string
  file: File
  preview: string
  state: ConversionState
}
