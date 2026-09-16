# img2md — Arquitectura

> Decisiones de diseño, estructura de carpetas, contratos de tipos e interfaces entre capas.

---

## Visión general

img2md es una aplicación web **sin backend propio separado**. Todo corre dentro de Next.js:
- El **frontend** vive en `app/` y `components/`.
- El **backend** es un único Route Handler en `app/api/convert/route.ts`.
- No hay base de datos — las conversiones son stateless.
- No hay API de IA — el OCR corre 100% en servidor con Tesseract.js.

---

## Flujo de datos

```
Usuario sube imagen
        │
        ▼
[Dropzone / BatchQueue]  ← componente cliente
        │  FormData (multipart)
        ▼
POST /api/convert         ← Route Handler (Node.js runtime)
        │
        ├─ Validar tipo + tamaño
        │
        ├─ Sharp: grayscale → normalize → sharpen → resize ≤3000px
        │
        ├─ Tesseract.js worker pool (x2): imagen → { text, words, lines, boxes }
        │
        ├─ Parser heurístico: OCR result → bloques tipados → string Markdown
        │
        └─ JSON response: { markdown, stats }
                │
                ▼
[MarkdownOutput]  ← tabs Preview / Raw
[ConversionProgress] ← barra de estado
```

---

## Estructura de carpetas

```
img2md/
├── public/
│   └── tessdata/
│       ├── eng.traineddata        # idioma inglés (OCR)
│       └── spa.traineddata        # idioma español (OCR)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx             # layout raíz, ThemeProvider
│   │   ├── page.tsx               # página principal (Server Component)
│   │   ├── globals.css
│   │   └── api/
│   │       └── convert/
│   │           └── route.ts       # Route Handler — ÚNICO endpoint
│   │
│   ├── components/
│   │   ├── converter/
│   │   │   ├── Dropzone.tsx       # Client: drag & drop, validación visual
│   │   │   ├── ImagePreview.tsx   # Client: muestra imagen con overlay
│   │   │   ├── MarkdownOutput.tsx # Client: tabs Preview/Raw + copy/download
│   │   │   ├── ConversionProgress.tsx  # Client: barra de progreso
│   │   │   └── BatchQueue.tsx     # Client: lista de archivos en cola
│   │   └── ui/                    # shadcn/ui (generado automáticamente)
│   │
│   ├── hooks/
│   │   ├── useConverter.ts        # estado de una conversión individual
│   │   └── useBatchConverter.ts   # cola con concurrencia=2
│   │
│   ├── lib/                       # SERVER-ONLY (no importar en Client Components)
│   │   ├── preprocessor.ts        # Sharp pipeline
│   │   ├── ocr.ts                 # Tesseract.js worker pool
│   │   └── parser.ts              # heurísticas texto → Markdown
│   │
│   ├── types/
│   │   └── index.ts               # todas las interfaces TypeScript
│   │
│   ├── utils/
│   │   ├── file.ts                # validar tipo MIME, tamaño, extensión
│   │   └── markdown.ts            # helpers de formato Markdown (isomórfico)
│   │
│   └── constants.ts               # límites, configuración compartida
│
├── next.config.mjs
├── .env.example
├── vercel.json
└── package.json
```

---

## Interfaces TypeScript (`src/types/index.ts`)

```typescript
// — Request / Response del endpoint —

export interface ConvertRequest {
  file: File
  language?: 'eng' | 'spa' | 'eng+spa'
}

export interface ConvertResponse {
  markdown: string
  stats: {
    words: number
    lines: number
    processingMs: number
  }
}

export interface ApiError {
  error: string
  code: 'FILE_TOO_LARGE' | 'UNSUPPORTED_TYPE' | 'OCR_FAILED' | 'PARSE_FAILED' | 'TIMEOUT'
}

// — Estado del conversor en el cliente —

export type ConversionStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

export interface ConversionState {
  status: ConversionStatus
  progress: number          // 0-100
  result: ConvertResponse | null
  error: string | null
}

export interface FileEntry {
  id: string                // uuid generado en cliente
  file: File
  preview: string           // URL.createObjectURL()
  state: ConversionState
}

// — Bloques del parser interno —

export type ParsedBlock =
  | { type: 'heading';   level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list';      ordered: boolean; items: string[] }
  | { type: 'table';     headers: string[]; rows: string[][] }
  | { type: 'code';      text: string }
```

---

## Contratos entre capas

### `src/lib/preprocessor.ts`

```typescript
// Entrada: Buffer de imagen (cualquier formato soportado por Sharp)
// Salida:  Buffer PNG optimizado para Tesseract
export async function preprocessImage(input: Buffer): Promise<Buffer>
```

Pipeline interno:
1. `sharp(input).grayscale()` — elimina ruido de color
2. `.normalize()` — maximiza contraste
3. `.sharpen({ sigma: 1 })` — mejora bordes de texto
4. `.resize({ width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true })` — cap de resolución
5. `.png()` — formato sin pérdida para OCR

### `src/lib/ocr.ts`

```typescript
export interface OcrResult {
  text: string
  words: Array<{ text: string; bbox: BBox; confidence: number }>
  lines: Array<{ text: string; bbox: BBox; words: OcrWord[] }>
}

export interface BBox {
  x0: number; y0: number; x1: number; y1: number
}

// language: 'eng' | 'spa' | 'eng+spa'
export async function runOcr(imageBuffer: Buffer, language: string): Promise<OcrResult>
```

Worker pool: 2 instancias de `createWorker()` precargadas, reutilizadas entre requests.

### `src/lib/parser.ts`

```typescript
// Entrada: OcrResult completo con bboxes
// Salida: string Markdown listo para renderizar
export function parseToMarkdown(ocr: OcrResult): string
```

Heurísticas en orden de prioridad:
1. **Encabezados** — altura de bbox de línea ≥ 1.4× la mediana de alturas
2. **Listas** — regex `^(\s*)(•|–|-|\*|\d+[.)]) `
3. **Tablas** — ≥3 líneas con columnas alineadas en X (tolerancia ±10px), ≥2 columnas
4. **Código** — sangría ≥4 espacios o ratio ancho/alto ≤ 0.55 (monoespaciado)
5. **Párrafo** — fallback para todo lo demás

### `src/app/api/convert/route.ts`

```typescript
export const runtime = 'nodejs'   // NO Edge — Tesseract requiere Node.js
export const maxDuration = 10     // Vercel free tier hard limit

export async function POST(req: Request): Promise<Response>
```

Flujo:
1. Parsear `multipart/form-data` → `File`
2. Validar tipo MIME (`image/png`, `image/jpeg`, `image/webp`, `image/tiff`)
3. Validar tamaño ≤ 10 MB
4. `file.arrayBuffer()` → `Buffer`
5. `preprocessImage(buffer)` → `preprocessed`
6. `runOcr(preprocessed, language)` → `ocrResult`
7. `parseToMarkdown(ocrResult)` → `markdown`
8. Retornar `ConvertResponse` JSON

---

## División Server / Client Components

| Archivo | Tipo | Razón |
|---------|------|-------|
| `app/page.tsx` | Server Component | No tiene estado, puede renderizar en servidor |
| `app/api/convert/route.ts` | Route Handler | Accede a Node.js APIs (Sharp, Tesseract) |
| `lib/preprocessor.ts` | Server-only | Usa Sharp (no disponible en browser) |
| `lib/ocr.ts` | Server-only | Usa Tesseract.js worker (Node.js) |
| `lib/parser.ts` | Server-only | Solo ejecuta en el Route Handler |
| `components/converter/*.tsx` | Client (`'use client'`) | Tienen estado, eventos, previews de imagen |
| `hooks/*.ts` | Client | Usan `useState`, `useCallback` |
| `utils/file.ts` | Isomórfico | Validación pura, sin APIs de plataforma |
| `utils/markdown.ts` | Isomórfico | Helpers de string, sin APIs de plataforma |

---

## Manejo de errores (5 capas)

| Capa | Qué captura | Respuesta |
|------|-------------|-----------|
| `utils/file.ts` | Tipo MIME inválido, tamaño excedido | Error antes de hacer fetch |
| Route Handler (guard) | Validación de request malformado | HTTP 400 + `ApiError` |
| `preprocessor.ts` | Imagen corrupta o formato no soportado | Lanza `PreprocessError` |
| `ocr.ts` | Worker crash, timeout interno | Lanza `OcrError` |
| Route Handler (catch) | Cualquier error no capturado | HTTP 500 + `ApiError` genérico |

En el cliente, `useConverter.ts` setea `state.status = 'error'` y muestra el mensaje de `ApiError.error`.

---

## Configuración de build (`next.config.mjs`)

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['tesseract.js', 'sharp'],
  // sharp y tesseract.js no deben ser bundleados por webpack
}
export default nextConfig
```

---

## Configuración de despliegue (`vercel.json`)

```json
{
  "functions": {
    "src/app/api/convert/route.ts": {
      "maxDuration": 10
    }
  }
}
```

---

## Decisiones de diseño y razonamiento

| Decisión | Alternativa descartada | Por qué |
|----------|------------------------|---------|
| Tesseract.js server-side | Tesseract.js en browser (WebAssembly) | El WASM bundle es ~15 MB, degrada UX inicial; server evita descarga |
| Sharp para preprocesamiento | Enviar imagen directa a Tesseract | Sharp reduce tiempos OCR ~30% y mejora precisión en imágenes de baja calidad |
| Tessdata en `/public` | Descargar en runtime desde CDN | Vercel free no tiene filesystem persistente; `/public` se despliega con el proyecto |
| Heurísticas propias vs. LLM | Claude/GPT para estructurar | Sin costo de API, sin latencia de red, funciona offline |
| Concurrencia=2 en batch | Paralelo sin límite | 512 MB RAM en Vercel free; 2 workers Tesseract ≈ 300 MB peak |
| Next.js monolito | Separar API en Express | Un solo deploy, menos configuración, Vercel optimizado para Next.js |
