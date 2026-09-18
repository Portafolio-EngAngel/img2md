'use client'

import { useState, useCallback } from 'react'
import type { ConversionState, ConvertResponse, SupportedLanguage } from '@/types'
import { DEFAULT_LANGUAGE } from '@/constants'
import { validateFile } from '@/utils/file'
import { preprocessImage, PreprocessError } from '@/lib/preprocessor'
import { runOcr, OcrError, type OcrProgress } from '@/lib/ocr'
import { parseToMarkdown } from '@/lib/parser'

const INITIAL_STATE: ConversionState = {
  status: 'idle',
  progress: 0,
  result: null,
  error: null,
}

// Progreso base por etapa de Tesseract.js; 'recognizing text' se interpola con su propio 0-1
const STAGE_BASE_PROGRESS: Record<string, number> = {
  'loading tesseract core': 5,
  'initializing tesseract': 10,
  'loading language traineddata': 15,
  'initializing api': 45,
  'recognizing text': 50,
}
const RECOGNIZE_SPAN = 45 // 50% -> 95%

export function useConverter() {
  const [state, setState] = useState<ConversionState>(INITIAL_STATE)

  const convert = useCallback(async (file: File, language: SupportedLanguage = DEFAULT_LANGUAGE) => {
    const validation = validateFile(file)
    if (!validation.valid) {
      setState({ status: 'error', progress: 0, result: null, error: validation.error.error })
      return
    }

    setState({ status: 'processing', progress: 2, result: null, error: null })
    const start = Date.now()

    try {
      const canvas = await preprocessImage(file)
      setState(s => ({ ...s, progress: 15 }))

      const ocrResult = await runOcr(canvas, language, (p: OcrProgress) => {
        const base = STAGE_BASE_PROGRESS[p.status] ?? 15
        const withinStage = p.status === 'recognizing text' ? p.progress * RECOGNIZE_SPAN : 0
        setState(s => ({ ...s, progress: Math.min(95, Math.round(base + withinStage)) }))
      })

      const markdown = parseToMarkdown(ocrResult)

      const result: ConvertResponse = {
        markdown,
        stats: {
          words: ocrResult.words.length,
          lines: ocrResult.lines.length,
          processingMs: Date.now() - start,
        },
      }

      setState({ status: 'done', progress: 100, result, error: null })
    } catch (err) {
      const message =
        err instanceof PreprocessError
          ? 'No se pudo procesar la imagen. Verifique que sea un archivo de imagen válido.'
          : err instanceof OcrError
          ? 'Error durante el reconocimiento de texto (OCR).'
          : 'Error inesperado al convertir la imagen.'
      setState({ status: 'error', progress: 0, result: null, error: message })
    }
  }, [])

  const reset = useCallback(() => setState(INITIAL_STATE), [])

  return { state, convert, reset }
}
