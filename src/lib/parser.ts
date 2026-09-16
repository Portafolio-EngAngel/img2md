import type { OcrResult, OcrLine, ParsedBlock } from '@/types'
import { MIN_WORD_CONFIDENCE, MIN_LINE_CONFIDENCE_RATIO } from '@/constants'
import { enrichMathLine, isGarbageWord } from './math'

const BULLET_REGEX = /^(\s*)(•|–|-|\*|·|\d+[.)]) /
const HEADING_HEIGHT_RATIO = 1.4
const MONOSPACE_RATIO_MAX = 0.58
const TABLE_COL_TOLERANCE = 12 // px

// Filtra palabras de baja confianza y reconstruye el texto de la línea
function filterLineByConfidence(line: OcrLine): OcrLine | null {
  if (line.words.length === 0) return null

  const goodWords = line.words.filter(
    w => w.confidence >= MIN_WORD_CONFIDENCE && !isGarbageWord(w),
  )
  const ratio = goodWords.length / line.words.length

  if (ratio < MIN_LINE_CONFIDENCE_RATIO) return null

  return {
    ...line,
    words: goodWords,
    text: goodWords.map(w => w.text).join(' '),
  }
}

// Altura de bbox de una línea
function lineHeight(line: OcrLine): number {
  return line.bbox.y1 - line.bbox.y0
}

// Mediana de alturas de línea del documento
function medianLineHeight(lines: OcrLine[]): number {
  if (lines.length === 0) return 12
  const heights = lines.map(lineHeight).sort((a, b) => a - b)
  const mid = Math.floor(heights.length / 2)
  return heights.length % 2 === 0 ? (heights[mid - 1] + heights[mid]) / 2 : heights[mid]
}

function isHeading(line: OcrLine, median: number): 1 | 2 | 3 | false {
  const h = lineHeight(line)
  if (h >= median * 2.0) return 1
  if (h >= median * 1.6) return 2
  if (h >= median * HEADING_HEIGHT_RATIO) return 3
  return false
}

function isBullet(text: string): { ordered: boolean; content: string } | false {
  const m = text.match(BULLET_REGEX)
  if (!m) return false
  const marker = m[2]
  const ordered = /^\d/.test(marker)
  const content = text.slice(m[0].length).trim()
  return { ordered, content }
}

function isCodeLine(line: OcrLine): boolean {
  const text = line.text
  // Sangría suficiente en texto
  const indented = /^ {4,}/.test(text)
  if (indented) return true

  // Ratio ancho/alto de los words sugiere fuente monoespaciada
  if (line.words.length === 0) return false
  const ratios = line.words.map(w => {
    const h = w.bbox.y1 - w.bbox.y0
    const charW = (w.bbox.x1 - w.bbox.x0) / Math.max(w.text.length, 1)
    return h > 0 ? charW / h : 1
  })
  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length
  return avg <= MONOSPACE_RATIO_MAX
}

// Detección de tabla: ≥3 líneas con columnas alineadas en X
function detectTable(lines: OcrLine[]): { headers: string[]; rows: string[][] } | false {
  if (lines.length < 3) return false

  // Obtener posiciones X de inicio de cada word por línea
  const colSets = lines.map(l => l.words.map(w => w.bbox.x0))
  if (colSets.some(s => s.length < 2)) return false

  // Columnas de la primera línea como referencia
  const refCols = colSets[0]
  const match = colSets.slice(1).every(cols =>
    refCols.every(refX =>
      cols.some(x => Math.abs(x - refX) <= TABLE_COL_TOLERANCE),
    ),
  )

  if (!match) return false

  const toRow = (line: OcrLine): string[] =>
    line.words.map(w => w.text.trim()).filter(Boolean)

  const [headerLine, ...bodyLines] = lines
  return {
    headers: toRow(headerLine),
    rows: bodyLines.map(toRow),
  }
}

function renderBlock(block: ParsedBlock): string {
  switch (block.type) {
    case 'heading':
      return `${'#'.repeat(block.level)} ${block.text}`

    case 'list':
      return block.items
        .map((item, i) => (block.ordered ? `${i + 1}. ${item}` : `- ${item}`))
        .join('\n')

    case 'table': {
      const sep = block.headers.map(() => '---').join(' | ')
      const header = block.headers.join(' | ')
      const rows = block.rows.map(r => r.join(' | ')).join('\n')
      return `${header}\n${sep}\n${rows}`
    }

    case 'code':
      return '```\n' + block.text + '\n```'

    case 'paragraph':
      return block.text
  }
}

export function parseToMarkdown(ocr: OcrResult): string {
  const lines = ocr.lines
    .map(filterLineByConfidence)
    .filter((l): l is OcrLine => l !== null && l.text.trim().length > 0)
    .map(enrichMathLine)
  if (lines.length === 0) return ''

  const median = medianLineHeight(lines)
  const blocks: ParsedBlock[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const text = line.text.trim()

    // — Encabezado —
    const headingLevel = isHeading(line, median)
    if (headingLevel) {
      blocks.push({ type: 'heading', level: headingLevel, text })
      i++
      continue
    }

    // — Lista —
    const bulletMatch = isBullet(text)
    if (bulletMatch) {
      const ordered = bulletMatch.ordered
      const items: string[] = [bulletMatch.content]

      let j = i + 1
      while (j < lines.length) {
        const next = lines[j].text.trim()
        const nextBullet = isBullet(next)
        if (nextBullet && nextBullet.ordered === ordered) {
          items.push(nextBullet.content)
          j++
        } else {
          break
        }
      }

      blocks.push({ type: 'list', ordered, items })
      i = j
      continue
    }

    // — Bloque de código —
    if (isCodeLine(line)) {
      const codeLines: string[] = [text]
      let j = i + 1
      while (j < lines.length && isCodeLine(lines[j])) {
        codeLines.push(lines[j].text.trim())
        j++
      }
      blocks.push({ type: 'code', text: codeLines.join('\n') })
      i = j
      continue
    }

    // — Tabla (lookahead de 3-10 líneas) —
    const tableWindow = lines.slice(i, Math.min(i + 10, lines.length))
    const tableResult = detectTable(tableWindow)
    if (tableResult) {
      blocks.push({ type: 'table', ...tableResult })
      i += tableWindow.length
      continue
    }

    // — Párrafo —
    // Fusionar con líneas contiguas que sean también párrafo
    const paraLines: string[] = [text]
    let j = i + 1
    while (j < lines.length) {
      const next = lines[j]
      const nextText = next.text.trim()
      if (
        isHeading(next, median) ||
        isBullet(nextText) ||
        isCodeLine(next) ||
        nextText === ''
      ) break
      paraLines.push(nextText)
      j++
    }
    blocks.push({ type: 'paragraph', text: paraLines.join(' ') })
    i = j
  }

  return blocks.map(renderBlock).join('\n\n')
}
