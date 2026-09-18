import { createWorker, Worker, Line as TessLine, Word as TessWord } from 'tesseract.js'
import { TESSDATA_PATH, DEFAULT_LANGUAGE, LANG_TO_TESSDATA } from '@/constants'
import type { OcrResult, OcrWord, OcrLine } from '@/types'

export class OcrError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'OcrError'
  }
}

export interface OcrProgress {
  status: string
  progress: number
}

function mapWord(w: TessWord): OcrWord {
  return {
    text: w.text,
    bbox: { x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 },
    confidence: w.confidence,
  }
}

function mapLine(l: TessLine): OcrLine {
  return {
    text: l.text.replace(/\n$/, ''),
    bbox: { x0: l.bbox.x0, y0: l.bbox.y0, x1: l.bbox.x1, y1: l.bbox.y1 },
    words: l.words.map(mapWord),
  }
}

// Corre enteramente en el navegador vía Web Worker + WASM — sin límite de tiempo de función
// serverless y sin que la imagen salga nunca del dispositivo del usuario.
export async function runOcr(
  image: HTMLCanvasElement,
  language: string = DEFAULT_LANGUAGE,
  onProgress?: (p: OcrProgress) => void,
): Promise<OcrResult> {
  const tessLang = LANG_TO_TESSDATA[language as keyof typeof LANG_TO_TESSDATA] ?? language

  let worker: Worker
  try {
    worker = await createWorker(tessLang, 1, {
      langPath: TESSDATA_PATH,
      cacheMethod: 'none',
      gzip: false,
      logger: onProgress,
    })
  } catch (err) {
    throw new OcrError('Error al inicializar el motor OCR', err)
  }

  try {
    const { data } = await worker.recognize(image, { rotateAuto: true }, { blocks: true })

    const lines: OcrLine[] = []
    const words: OcrWord[] = []

    for (const block of data.blocks ?? []) {
      for (const para of block.paragraphs ?? []) {
        for (const line of para.lines ?? []) {
          lines.push(mapLine(line))
          for (const word of line.words ?? []) {
            words.push(mapWord(word))
          }
        }
      }
    }

    return { text: data.text, words, lines }
  } catch (err) {
    throw new OcrError('Error durante el reconocimiento OCR', err)
  } finally {
    await worker.terminate().catch(() => null)
  }
}
