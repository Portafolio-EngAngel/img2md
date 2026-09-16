import { NextRequest, NextResponse } from 'next/server'
import { preprocessImage, PreprocessError } from '@/lib/preprocessor'
import { runOcr, OcrError } from '@/lib/ocr'
import { parseToMarkdown } from '@/lib/parser'
import { validateFile } from '@/utils/file'
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/constants'
import type { ConvertResponse, ApiError, SupportedLanguage } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 10

export async function POST(req: NextRequest): Promise<NextResponse> {
  const start = Date.now()

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return error('Request inválido — se esperaba multipart/form-data', 'UNSUPPORTED_TYPE', 400)
  }

  const file = formData.get('file') as File | null
  const langParam = (formData.get('language') as string) ?? DEFAULT_LANGUAGE
  const language: SupportedLanguage = SUPPORTED_LANGUAGES.includes(langParam as SupportedLanguage)
    ? (langParam as SupportedLanguage)
    : DEFAULT_LANGUAGE

  const validation = validateFile(file)
  if (!validation.valid) {
    return NextResponse.json<ApiError>(validation.error, { status: 400 })
  }

  const buffer = Buffer.from(await file!.arrayBuffer())

  let preprocessed: Buffer
  try {
    preprocessed = await preprocessImage(buffer)
  } catch (err) {
    if (err instanceof PreprocessError) {
      return error('No se pudo procesar la imagen. Verifique que sea un archivo de imagen válido.', 'PARSE_FAILED', 422)
    }
    return error('Error interno al preprocesar imagen', 'OCR_FAILED', 500)
  }

  let ocrResult
  try {
    ocrResult = await runOcr(preprocessed, language)
  } catch (err) {
    if (err instanceof OcrError) {
      return error('Error durante el reconocimiento de texto (OCR)', 'OCR_FAILED', 500)
    }
    return error('Error interno del servidor', 'OCR_FAILED', 500)
  }

  let markdown: string
  try {
    markdown = parseToMarkdown(ocrResult)
  } catch {
    return error('Error al estructurar el texto extraído en Markdown', 'PARSE_FAILED', 500)
  }

  const processingMs = Date.now() - start
  const body: ConvertResponse = {
    markdown,
    stats: {
      words: ocrResult.words.length,
      lines: ocrResult.lines.length,
      processingMs,
    },
  }

  return NextResponse.json(body)
}

function error(message: string, code: ApiError['code'], status: number) {
  return NextResponse.json<ApiError>({ error: message, code }, { status })
}
