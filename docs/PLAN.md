# img2md — Plan de Implementación

> Conversor de imágenes a Markdown usando OCR local (Tesseract.js + Sharp). Sin API de IA externa.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 App Router |
| OCR | Tesseract.js 5 (server-side) |
| Preprocesamiento | Sharp |
| Markdown render | react-markdown + remark-gfm |
| Upload UI | react-dropzone |
| Componentes | shadcn/ui + Tailwind CSS |
| Lenguaje | TypeScript estricto |
| Deploy target | Vercel free tier |

---

## Fase 1 — Bootstrap del proyecto

**Objetivo:** Proyecto corriendo en localhost con dependencias instaladas.

| # | Tarea | Estado |
|---|-------|--------|
| 1.1 | Inicializar Next.js 14 con TypeScript y App Router | Pendiente |
| 1.2 | Instalar dependencias: `tesseract.js sharp react-markdown remark-gfm react-dropzone` | Pendiente |
| 1.3 | Instalar y configurar shadcn/ui + Tailwind CSS | Pendiente |
| 1.4 | Configurar `next.config.mjs` con `serverExternalPackages: ['tesseract.js', 'sharp']` | Pendiente |
| 1.5 | Crear `src/constants.ts` con límites (tamaño máximo, tipos permitidos, resolución máxima) | Pendiente |
| 1.6 | Descargar tessdata `eng.traineddata` y `spa.traineddata` a `public/tessdata/` | Pendiente |
| 1.7 | Verificar `npm run dev` sin errores | Pendiente |

---

## Fase 2 — Pipeline OCR (backend)

**Objetivo:** Endpoint `/api/convert` que recibe una imagen y retorna texto OCR crudo.

| # | Tarea | Estado |
|---|-------|--------|
| 2.1 | Crear `src/types/index.ts` con interfaces `ConvertRequest`, `ConvertResponse`, `ApiError`, `ParsedBlock` | Pendiente |
| 2.2 | Crear `src/lib/preprocessor.ts` — Sharp pipeline: grayscale → normalize → sharpen → resize (max 3000px) | Pendiente |
| 2.3 | Crear `src/lib/ocr.ts` — Tesseract.js worker pool (tamaño 2), soporte `eng`/`spa`, devuelve `{ text, words, lines }` | Pendiente |
| 2.4 | Crear `src/app/api/convert/route.ts` con `runtime = 'nodejs'`, recibe `multipart/form-data`, orquesta preprocessor + OCR | Pendiente |
| 2.5 | Validar tipo de archivo y tamaño máximo (10 MB) en el Route Handler | Pendiente |
| 2.6 | Probar endpoint con `curl` enviando una imagen PNG de prueba | Pendiente |

---

## Fase 3 — Parser heurístico (Markdown)

**Objetivo:** Convertir texto OCR crudo en bloques Markdown estructurados.

| # | Tarea | Estado |
|---|-------|--------|
| 3.1 | Crear `src/lib/parser.ts` con función `parseToMarkdown(ocrResult): string` | Pendiente |
| 3.2 | Heurística de **encabezados**: detectar por altura de línea relativa (words bbox height ratio > 1.4×) | Pendiente |
| 3.3 | Heurística de **listas**: detectar bullets (`•`, `-`, `*`, `–`, dígito + `.`) con regex | Pendiente |
| 3.4 | Heurística de **tablas**: detectar columnas por alineación X de bounding boxes (tolerancia ±10px) | Pendiente |
| 3.5 | Heurística de **énfasis**: detectar uppercase o patrones `**text**` implícitos | Pendiente |
| 3.6 | Heurística de **bloques de código**: detectar sangría uniforme ≥4 espacios o fuente monoespaciada (ratio ancho/alto ≈ 0.6) | Pendiente |
| 3.7 | Unit tests del parser con fixtures de texto OCR conocido | Pendiente |

---

## Fase 4 — UI principal

**Objetivo:** Interfaz completa con upload, vista previa y resultado Markdown.

| # | Tarea | Estado |
|---|-------|--------|
| 4.1 | Crear `src/app/page.tsx` — layout de dos columnas (upload + resultado) | Pendiente |
| 4.2 | Crear `src/components/converter/Dropzone.tsx` — drag & drop con react-dropzone, validación visual | Pendiente |
| 4.3 | Crear `src/components/converter/ImagePreview.tsx` — muestra imagen original con overlay de estado | Pendiente |
| 4.4 | Crear `src/components/converter/MarkdownOutput.tsx` — tabs "Preview" / "Raw" con react-markdown | Pendiente |
| 4.5 | Crear `src/components/converter/ConversionProgress.tsx` — barra de progreso durante OCR | Pendiente |
| 4.6 | Crear `src/hooks/useConverter.ts` — estado de conversión, llamada al API, manejo de errores | Pendiente |
| 4.7 | Botón "Copiar Markdown" y botón "Descargar .md" | Pendiente |
| 4.8 | Modo oscuro con Tailwind `dark:` | Pendiente |

---

## Fase 5 — Procesamiento por lotes

**Objetivo:** Subir múltiples imágenes y convertirlas en paralelo (máx. 2 concurrentes).

| # | Tarea | Estado |
|---|-------|--------|
| 5.1 | Crear `src/components/converter/BatchQueue.tsx` — lista de archivos con estado individual | Pendiente |
| 5.2 | Crear `src/hooks/useBatchConverter.ts` — cola con concurrencia=2 usando `Promise.allSettled` | Pendiente |
| 5.3 | Botón "Convertir todos" y "Descargar todos como .zip" | Pendiente |
| 5.4 | Soporte ZIP con `jszip` | Pendiente |

---

## Fase 6 — Calidad y despliegue

**Objetivo:** Proyecto listo para producción en Vercel free tier.

| # | Tarea | Estado |
|---|-------|--------|
| 6.1 | Configurar ESLint + Prettier | Pendiente |
| 6.2 | Tests de integración del endpoint `/api/convert` | Pendiente |
| 6.3 | Audit de accesibilidad con axe-core (WCAG AA) | Pendiente |
| 6.4 | Optimizar Cold Start: pre-cargar worker Tesseract en módulo singleton | Pendiente |
| 6.5 | Configurar `vercel.json` con `maxDuration: 10` para el Route Handler | Pendiente |
| 6.6 | Variables de entorno documentadas en `.env.example` | Pendiente |
| 6.7 | README.md completo con capturas y guía de despliegue | Pendiente |
| 6.8 | Deploy a Vercel y smoke test en producción | Pendiente |

---

## Restricciones técnicas clave

- **Timeout Vercel free**: 10s por función. Sharp reduce tiempo de OCR ~30% en imágenes grandes.
- **Sin Edge Runtime**: Tesseract.js requiere Node.js. Usar `export const runtime = 'nodejs'` en el Route Handler.
- **Tessdata local**: Servir desde `/public/tessdata/` en lugar de descargar en runtime.
- **Worker pool**: Máximo 2 workers de Tesseract para no exceder memoria del free tier (~512 MB).
- **Tamaño máximo**: 10 MB por imagen, resolución downscale a 3000px antes de OCR.

---

## Orden de implementación sugerido

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 (básica) → Fase 5 → Fase 4 (batch UI) → Fase 6
```

Las fases 2 y 3 son el núcleo técnico. Implementar y validar con tests antes de construir la UI.
