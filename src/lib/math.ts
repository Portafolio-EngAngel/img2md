import type { OcrLine, OcrWord } from '@/types'

// ── Ruido / Garbage filter ────────────────────────────────────────────────────

/**
 * Rangos unicode permitidos en output español / inglés / matemático.
 * Cualquier codepoint fuera de estos rangos se descarta como ruido OCR.
 *
 * Rangos incluidos:
 *   0020–007E  ASCII imprimible básico
 *   00A0–024F  Latin-1 + Extended (ñ, á, é, ü…)
 *   0370–03FF  Griego (α β γ π θ λ…)
 *   2000–206F  Puntuación general (comillas tipográficas, puntos suspensivos…)
 *   2100–22FF  Símbolos tipo letra (ℝ ℤ) + Operadores matemáticos (∑ √ ∂ ≤…)
 *   2190–21FF  Flechas (→ ← ↔…) — ya incluido en 2100-22FF
 */
const ALLOWED_RE = /[^\x20-\x7E -ɏͰ-Ͽ -⁯℀-⋿]/g

/**
 * Secuencias de 3+ del mismo carácter no alfanumérico → vacío.
 * Captura ruido de bordes, reglas horizontales, artifacts de tabla:  |||||||  _______  ~~~~~~~~
 * Excepción: puntos suspensivos "..." se permiten (máx 3 iguales juntos).
 */
const REPEAT_NOISE_RE = /([^a-zA-Z0-9À-ɏ\s.])\1{2,}/g

/**
 * Elimina ruido de caracteres a nivel de texto:
 * 1. Caracteres fuera de los rangos permitidos (Cirílico, CJK, Braille, símbolos de dibujo…)
 * 2. Secuencias repetitivas de símbolos especiales
 * 3. Espacios redundantes
 */
export function stripNoise(text: string): string {
  return text
    .replace(ALLOWED_RE, '')
    .replace(REPEAT_NOISE_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Una palabra OCR es "basura pura" si no contiene ningún carácter alfanumérico
 * ni símbolo matemático conocido. Se descarta antes de reconstruir el texto de línea.
 *
 * Acepta siempre: letras (latinas, griegas), dígitos, operadores matemáticos comunes.
 * Descarta: tokens formados exclusivamente por !, @, #, $, %, &, | y similares.
 */
const MATH_SINGLES = new Set(['+', '-', '*', '/', '=', '<', '>', '^', '_', '(', ')', '[', ']', '{', '}'])

export function isGarbageWord(word: OcrWord): boolean {
  const t = word.text.trim()
  if (t.length === 0) return true
  // Tiene al menos un alfanumérico o letra griega → legítimo
  if (/[a-zA-Z0-9À-ɏͰ-Ͽ]/.test(t)) return false
  // Operador matemático de un solo carácter → legítimo
  if (t.length === 1 && MATH_SINGLES.has(t)) return false
  // Todo lo demás (solo símbolos raros) → basura
  return true
}

// ─────────────────────────────────────────────────────────────────────────────

// Superíndices unicode → dígito/letra normal (para construir ^n)
const SUPERSCRIPT_CHARS: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  'ⁿ': 'n', 'ˣ': 'x', 'ʸ': 'y', 'ᶻ': 'z', 'ᵃ': 'a',
  'ᵇ': 'b', 'ᶜ': 'c', 'ᵈ': 'd', 'ᵉ': 'e', 'ᶠ': 'f',
  'ᵍ': 'g', 'ⁱ': 'i', 'ʲ': 'j', 'ᵏ': 'k', 'ˡ': 'l',
  'ᵐ': 'm', 'ᵒ': 'o', 'ᵖ': 'p', 'ʳ': 'r', 'ˢ': 's',
  'ᵗ': 't', 'ᵘ': 'u', 'ᵛ': 'v', 'ʷ': 'w',
}

// Subíndices unicode → dígito/letra normal (para construir _n)
const SUBSCRIPT_CHARS: Record<string, string> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  'ₙ': 'n', 'ₓ': 'x', 'ₐ': 'a', 'ₑ': 'e', 'ₒ': 'o',
}

// Correcciones de símbolos matemáticos comunes
const SYMBOL_FIXES: Array<[RegExp, string]> = [
  [/[−–]/g, '-'],       // guión matemático/en-dash → guión normal
  [/[×✕✗]/g, '*'],      // signo de multiplicación
  [/÷/g, '/'],          // división → barra
  [/≤/g, '<='],
  [/≥/g, '>='],
  [/≠/g, '!='],
  [/≈/g, '~='],
  [/∞/g, 'inf'],
  [/√/g, 'sqrt'],
  [/∑/g, 'sum'],
  [/∏/g, 'prod'],
  [/∫/g, 'int'],
  [/∂/g, 'd'],          // derivada parcial
  [/·/g, '*'],          // punto de multiplicación
]

const SUPERSCRIPT_RE = new RegExp(`[${Object.keys(SUPERSCRIPT_CHARS).join('')}]+`, 'g')
const SUBSCRIPT_RE   = new RegExp(`[${Object.keys(SUBSCRIPT_CHARS).join('')}]+`, 'g')

/**
 * Normaliza caracteres unicode matemáticos y símbolos confusos.
 * Se aplica a todas las líneas independientemente del contenido.
 */
export function normalizeMathText(text: string): string {
  let out = text
    .replace(SUPERSCRIPT_RE, m =>
      '^' + Array.from(m).map(c => SUPERSCRIPT_CHARS[c] ?? c).join(''),
    )
    .replace(SUBSCRIPT_RE, m =>
      '_' + Array.from(m).map(c => SUBSCRIPT_CHARS[c] ?? c).join(''),
    )

  for (const [pattern, replacement] of SYMBOL_FIXES) {
    out = out.replace(pattern, replacement)
  }
  return out
}

/**
 * Devuelve true si la línea parece contener contenido matemático.
 * Se usa para decidir si aplicar detección de superíndices por bbox.
 */
export function isMathLine(text: string): boolean {
  const hasOperatorOrEq  = /[=+\-*/^()²³⁰¹⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]/.test(text)
  const hasLetterAndDigit = /[a-zA-Z]/.test(text) && /\d/.test(text)
  const hasMathSymbol     = /[∑∏∫√∂×÷±≤≥≠≈∞]/.test(text)
  const looksLikeEquation = /[a-zA-Z]\s*[=<>]/.test(text) || /=\s*[-\d(]/.test(text)

  return hasOperatorOrEq || hasLetterAndDigit || hasMathSymbol || looksLikeEquation
}

/**
 * Reconstruye el texto de una línea detectando superíndices por posición bbox.
 * Una palabra es superíndice si su borde inferior (y1) está significativamente
 * por encima del baseline calculado como mediana de y1 del resto de palabras.
 *
 * Solo se llama en líneas que ya pasaron `isMathLine`.
 */
export function detectSuperscripts(line: OcrLine): string {
  const words = line.words
  if (words.length < 2) return line.text

  const lineH = line.bbox.y1 - line.bbox.y0
  if (lineH < 4) return line.text

  // Baseline = mediana de los y1 de las palabras
  const y1s = [...words].map(w => w.bbox.y1).sort((a, b) => a - b)
  const mid = Math.floor(y1s.length / 2)
  const baseline = y1s.length % 2 === 0
    ? (y1s[mid - 1] + y1s[mid]) / 2
    : y1s[mid]

  // Umbral: fondo de la palabra > 30% del alto de línea por encima del baseline
  const threshold = lineH * 0.30

  const parts: string[] = []
  const pending: string[] = []

  for (const word of words) {
    const isSup = (baseline - word.bbox.y1) > threshold

    if (isSup) {
      pending.push(word.text)
    } else {
      if (pending.length > 0) {
        const expo = pending.join('')
        pending.length = 0
        if (parts.length > 0) {
          parts[parts.length - 1] += `^${expo}`
        } else {
          parts.push(`^${expo}`)
        }
      }
      parts.push(word.text)
    }
  }

  // Superíndice al final de la línea
  if (pending.length > 0) {
    const expo = pending.join('')
    if (parts.length > 0) {
      parts[parts.length - 1] += `^${expo}`
    } else {
      parts.push(`^${expo}`)
    }
  }

  return parts.join(' ')
}

/**
 * Punto de entrada único: aplica toda la cadena matemática a una línea OCR.
 * Devuelve la línea modificada (inmutable).
 */
export function enrichMathLine(line: OcrLine): OcrLine {
  let text = line.text

  // Superíndices por bbox solo en líneas matemáticas
  if (isMathLine(text)) {
    text = detectSuperscripts(line)
  }

  // Normalización unicode + símbolos
  text = normalizeMathText(text)

  // Eliminación de ruido de caracteres — siempre al final
  text = stripNoise(text)

  if (text === line.text) return line
  return { ...line, text }
}
