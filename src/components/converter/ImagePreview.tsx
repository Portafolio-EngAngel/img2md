'use client'

import Image from 'next/image'
import type { ConversionStatus } from '@/types'

interface ImagePreviewProps {
  src: string
  filename: string
  status: ConversionStatus
}

export function ImagePreview({ src, filename, status }: ImagePreviewProps) {
  const isActive = status === 'processing'
  const isDone = status === 'done'
  const isError = status === 'error'

  return (
    <div className="relative overflow-hidden" style={{ minHeight: 200 }}>
      <Image
        src={src}
        alt={filename}
        fill
        className={[
          'object-contain transition-all duration-300',
          isActive ? 'opacity-40 scale-[0.98]' : 'opacity-100 scale-100',
        ].join(' ')}
        sizes="(max-width: 768px) 100vw, 50vw"
      />

      {isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-background/80 backdrop-blur-sm border border-border/60 px-3 py-1.5 text-xs font-mono text-muted-foreground">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            OCR…
          </div>
        </div>
      )}

      {isDone && (
        <div className="absolute top-2 right-2">
          <span className="flex items-center gap-1 rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 text-[10px] font-mono text-primary">
            ✓ listo
          </span>
        </div>
      )}

      {isError && (
        <div className="absolute top-2 right-2">
          <span className="flex items-center gap-1 rounded-full bg-destructive/15 border border-destructive/30 px-2 py-0.5 text-[10px] font-mono text-destructive">
            error
          </span>
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 px-3 py-1.5 bg-gradient-to-t from-background/80 to-transparent">
        <p className="text-xs font-mono text-muted-foreground/70 truncate">{filename}</p>
      </div>
    </div>
  )
}
