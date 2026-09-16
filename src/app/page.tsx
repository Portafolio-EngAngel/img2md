import { ConverterClient } from '@/components/converter/ConverterClient'

export const metadata = {
  title: 'img2md — Image to Markdown',
  description: 'Convierte imágenes con texto a Markdown usando OCR local.',
}

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-semibold tracking-tight text-primary">
              img2md
            </span>
            <span className="hidden sm:inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary">
              OCR local
            </span>
          </div>
          <p className="text-xs text-muted-foreground hidden md:block">
            Sin IA externa · Sin costo · Privado
          </p>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border/40 bg-gradient-to-b from-card/30 to-transparent">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 text-center">
          <h1 className="font-mono text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            Imagen{' '}
            <span className="text-primary">→</span>{' '}
            Markdown
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
            Sube una foto de un documento, screenshot o imagen con texto y obtén Markdown estructurado al instante.
          </p>
        </div>
      </section>

      {/* Main converter */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <ConverterClient />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-4">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-muted-foreground font-mono">
            Powered by Tesseract.js · Sharp · Next.js
          </p>
        </div>
      </footer>
    </div>
  )
}
