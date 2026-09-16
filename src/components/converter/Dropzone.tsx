'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { SUPPORTED_MIME_TYPES, MAX_FILE_SIZE_BYTES, SUPPORTED_EXTENSIONS } from '@/constants'

interface DropzoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

export function Dropzone({ onFile, disabled }: DropzoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => { if (accepted[0]) onFile(accepted[0]) },
    [onFile],
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: Object.fromEntries(SUPPORTED_MIME_TYPES.map(t => [t, []])),
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: false,
    disabled,
  })

  return (
    <div
      {...getRootProps()}
      className={[
        'relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 transition-all duration-200 cursor-pointer select-none outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isDragActive && !isDragReject
          ? 'border-primary bg-primary/5 shadow-[0_0_24px_-4px_hsl(var(--primary)/0.25)]'
          : '',
        isDragReject
          ? 'border-destructive bg-destructive/5'
          : '',
        !isDragActive && !isDragReject
          ? 'border-border/60 hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.15)]'
          : '',
        disabled ? 'opacity-40 pointer-events-none' : '',
      ].join(' ')}
    >
      <input {...getInputProps()} />

      {/* Upload icon */}
      <div className={[
        'flex items-center justify-center w-14 h-14 rounded-full border transition-colors duration-200',
        isDragActive && !isDragReject
          ? 'border-primary/40 bg-primary/10'
          : 'border-border bg-muted/50',
      ].join(' ')}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={['w-6 h-6 transition-colors', isDragActive && !isDragReject ? 'text-primary' : 'text-muted-foreground'].join(' ')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">
          {isDragReject
            ? 'Formato no soportado'
            : isDragActive
            ? 'Suelta la imagen aquí'
            : 'Arrastra una imagen o haz clic'}
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          {SUPPORTED_EXTENSIONS.join(' · ')} &nbsp;·&nbsp; máx. 10 MB
        </p>
      </div>
    </div>
  )
}
