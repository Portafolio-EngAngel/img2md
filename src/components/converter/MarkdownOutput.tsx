'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { copyToClipboard, downloadMarkdown, stripExtension } from '@/utils/markdown'
import type { ConvertResponse } from '@/types'

interface MarkdownOutputProps {
  result: ConvertResponse
  filename: string
}

export function MarkdownOutput({ result, filename }: MarkdownOutputProps) {
  const [copied, setCopied] = useState(false)
  const isEmpty = result.markdown.trim().length === 0

  const handleCopy = async () => {
    await copyToClipboard(result.markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    downloadMarkdown(result.markdown, `${stripExtension(filename)}.md`)
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/50 bg-card/30 p-12 min-h-[280px] text-center">
        <div className="w-10 h-10 rounded-full border border-border/60 flex items-center justify-center">
          <svg className="w-5 h-5 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">No se detectó texto</p>
          <p className="text-xs text-muted-foreground/60 font-mono">
            La imagen no contiene texto legible o la confianza fue muy baja.
          </p>
        </div>
        <p className="text-xs text-muted-foreground/40 font-mono">
          Intenta con otro idioma o una imagen más nítida.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      {/* Stats bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-3">
          <Stat label="palabras" value={result.stats.words} />
          <div className="w-px h-3 bg-border/60" />
          <Stat label="líneas" value={result.stats.lines} />
          <div className="w-px h-3 bg-border/60" />
          <Stat label="ms" value={result.stats.processingMs} />
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-7 px-2.5 text-xs font-mono gap-1.5 text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <>
                <CheckIcon />
                Copiado
              </>
            ) : (
              <>
                <CopyIcon />
                Copiar
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={handleDownload}
            className="h-7 px-2.5 text-xs font-mono gap-1.5"
          >
            <DownloadIcon />
            .md
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="preview">
        <TabsList className="w-full rounded-none border-b border-border/40 bg-transparent h-9 gap-0 p-0">
          <TabsTrigger
            value="preview"
            className="flex-1 h-full rounded-none text-xs font-mono border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none text-muted-foreground"
          >
            Vista previa
          </TabsTrigger>
          <TabsTrigger
            value="raw"
            className="flex-1 h-full rounded-none text-xs font-mono border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none text-muted-foreground"
          >
            Raw
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="m-0">
          <div className="prose prose-sm dark:prose-invert max-w-none p-5 overflow-auto max-h-[55vh] prose-headings:font-mono prose-headings:text-foreground prose-p:text-muted-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {result.markdown}
            </ReactMarkdown>
          </div>
        </TabsContent>

        <TabsContent value="raw" className="m-0">
          <pre className="p-5 text-xs font-mono text-muted-foreground overflow-auto max-h-[55vh] whitespace-pre-wrap break-words leading-relaxed bg-transparent">
            {result.markdown}
          </pre>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="text-xs font-mono">
      <span className="text-foreground tabular-nums">{value.toLocaleString()}</span>
      {' '}
      <span className="text-muted-foreground/60">{label}</span>
    </span>
  )
}

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}
