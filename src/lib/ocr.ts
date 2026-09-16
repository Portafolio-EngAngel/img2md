import path from 'path'
import { createWorker, Worker, Line as TessLine, Word as TessWord } from 'tesseract.js'
import { OCR_WORKER_POOL_SIZE, DEFAULT_LANGUAGE, LANG_TO_TESSDATA } from '@/constants'
import type { OcrResult, OcrWord, OcrLine } from '@/types'

export class OcrError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'OcrError'
  }
}

// Singleton pool — reutilizado entre requests en el mismo proceso
let pool: Worker[] = []
let poolLanguage = ''
let poolIndex = 0

const tessDataPath = path.join(process.cwd(), 'public', 'tessdata')

async function getWorker(language: string): Promise<Worker> {
  // Mapear el idioma lógico al combo real de tessdata
  const tessLang = LANG_TO_TESSDATA[language as keyof typeof LANG_TO_TESSDATA] ?? language

  if (pool.length === 0 || poolLanguage !== tessLang) {
    await Promise.all(pool.map(w => w.terminate().catch(() => null)))
    pool = []
    poolIndex = 0
    poolLanguage = tessLang

    for (let i = 0; i < OCR_WORKER_POOL_SIZE; i++) {
      const worker = await createWorker(tessLang, 1, {
        langPath: tessDataPath,
        cacheMethod: 'none',
        gzip: false,
      })
      pool.push(worker)
    }
  }

  const worker = pool[poolIndex % pool.length]
  poolIndex++
  return worker
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

export async function runOcr(
  imageBuffer: Buffer,
  language: string = DEFAULT_LANGUAGE,
): Promise<OcrResult> {
  let worker: Worker
  try {
    worker = await getWorker(language)
  } catch (err) {
    throw new OcrError('Error al inicializar worker OCR', err)
  }

  try {
    const { data } = await worker.recognize(imageBuffer, { rotateAuto: true }, { blocks: true })

    // Extraer lines y words del árbol blocks → paragraphs → lines → words
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
  }
}
