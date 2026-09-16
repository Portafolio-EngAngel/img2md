'use client'

import { useState, useCallback, useEffect } from 'react'
import { Dropzone } from './Dropzone'
import { ImagePreview } from './ImagePreview'
import { ConversionProgress } from './ConversionProgress'
import { MarkdownOutput } from './MarkdownOutput'
import { Button } from '@/components/ui/button'
import { useConverter } from '@/hooks/useConverter'
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/constants'
import type { SupportedLanguage } from '@/types'

const LANG_LABELS: Record<SupportedLanguage, string> = {
  eng: 'English',
  spa: 'Español',
  'eng+spa': 'Eng + Esp',
  equ: 'Ecuaciones',
}

export function ConverterClient() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [language, setLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE)
  const { state, convert, reset } = useConverter()

  const handleFile = useCallback((f: File) => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
    reset()
  }, [preview, reset])

  const handleConvert = () => { if (file) convert(file, language) }

  const handleReset = () => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    reset()
  }

  // Pegar imagen desde portapapeles (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isProcessing) return
      const items = e.clipboardData?.items
      if (!items) return
      const imageItem = Array.from(items).find(i => i.type.startsWith('image/'))
      const pasted = imageItem?.getAsFile()
      if (pasted) handleFile(pasted)
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handleFile]) // eslint-disable-line react-hooks/exhaustive-deps

  const isProcessing = state.status === 'uploading' || state.status === 'processing'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* ── Columna izquierda — Input ── */}
      <div className="flex flex-col gap-4">
        <SectionLabel text="Input" />

        <Dropzone onFile={handleFile} disabled={isProcessing} />

        {file && preview && (
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <ImagePreview src={preview} filename={file.name} status={state.status} />

            {/* Controls */}
            <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border/40">
              {/* Language selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0 font-mono w-16">Idioma</span>
                <div className="flex gap-1 flex-wrap">
                  {SUPPORTED_LANGUAGES.map(l => (
                    <button
                      key={l}
                      onClick={() => setLanguage(l)}
                      disabled={isProcessing}
                      className={[
                        'px-2.5 py-1 rounded-md text-xs font-mono transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        language === l
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                        isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                      ].join(' ')}
                    >
                      {LANG_LABELS[l]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress */}
              <ConversionProgress status={state.status} progress={state.progress} />

              {/* Error */}
              {state.error && (
                <p className="text-xs text-destructive rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
                  {state.error}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleConvert}
                  disabled={isProcessing || state.status === 'done'}
                  className="flex-1 font-mono text-sm"
                >
                  {isProcessing
                    ? <span className="flex items-center gap-2"><Spinner /> Convirtiendo…</span>
                    : state.status === 'done'
                    ? '✓ Completado'
                    : 'Convertir →'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isProcessing}
                  className="font-mono text-sm"
                  aria-label="Nueva imagen"
                >
                  Nueva
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Columna derecha — Output ── */}
      <div className="flex flex-col gap-4">
        <SectionLabel text="Output" />

        {isProcessing ? (
          <OutputSkeleton />
        ) : state.result ? (
          <MarkdownOutput result={state.result} filename={file?.name ?? 'output'} />
        ) : (
          <EmptyOutput isWaiting={!!file} />
        )}
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function SectionLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-widest">
        {text}
      </span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  )
}

function EmptyOutput({ isWaiting }: { isWaiting: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/50 bg-card/30 p-12 min-h-[280px] text-center">
      <div className="w-10 h-10 rounded-full border border-border/60 flex items-center justify-center">
        <svg className="w-5 h-5 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          {isWaiting ? 'Presiona "Convertir →" para comenzar' : 'El Markdown aparecerá aquí'}
        </p>
        <p className="text-xs text-muted-foreground/60 font-mono">
          {isWaiting ? 'Selecciona el idioma y convierte' : 'Arrastra, haz clic o pega (Ctrl+V)'}
        </p>
      </div>
    </div>
  )
}

function OutputSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden animate-pulse">
      {/* Stats bar skeleton */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="h-3 w-20 rounded bg-muted/60" />
          <div className="w-px h-3 bg-border/40" />
          <div className="h-3 w-16 rounded bg-muted/60" />
          <div className="w-px h-3 bg-border/40" />
          <div className="h-3 w-12 rounded bg-muted/60" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-7 w-16 rounded-md bg-muted/60" />
          <div className="h-7 w-10 rounded-md bg-muted/60" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="h-9 border-b border-border/40 flex">
        <div className="flex-1 flex items-center justify-center">
          <div className="h-3 w-20 rounded bg-muted/60" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="h-3 w-10 rounded bg-muted/40" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-5 space-y-3 min-h-[200px]">
        <div className="h-4 w-2/5 rounded bg-muted/60" />
        <div className="space-y-2 pt-1">
          <div className="h-3 w-full rounded bg-muted/40" />
          <div className="h-3 w-[90%] rounded bg-muted/40" />
          <div className="h-3 w-[75%] rounded bg-muted/40" />
        </div>
        <div className="h-4 w-1/3 rounded bg-muted/50 mt-4" />
        <div className="space-y-2 pt-1">
          <div className="h-3 w-[85%] rounded bg-muted/40" />
          <div className="h-3 w-[60%] rounded bg-muted/40" />
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
