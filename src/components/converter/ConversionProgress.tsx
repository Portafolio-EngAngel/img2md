'use client'

import type { ConversionStatus } from '@/types'

interface ConversionProgressProps {
  status: ConversionStatus
  progress: number
}

const STATUS_CONFIG: Partial<Record<ConversionStatus, { label: string; color: string }>> = {
  processing: { label: 'Ejecutando OCR…', color: 'bg-primary' },
  done: { label: 'Conversión completada', color: 'bg-primary' },
  error: { label: 'Error en la conversión', color: 'bg-destructive' },
}

export function ConversionProgress({ status, progress }: ConversionProgressProps) {
  if (status === 'idle') return null

  const config = STATUS_CONFIG[status]
  if (!config) return null

  const isError = status === 'error'
  const isDone = status === 'done'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-mono ${isError ? 'text-destructive' : isDone ? 'text-primary' : 'text-muted-foreground'}`}>
          {config.label}
        </span>
        {!isError && (
          <span className="text-xs font-mono tabular-nums text-muted-foreground/60">
            {progress}%
          </span>
        )}
      </div>
      <div className="h-1 w-full rounded-full bg-border/40 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${config.color}`}
          style={{ width: `${isError ? 100 : progress}%` }}
        />
      </div>
    </div>
  )
}
