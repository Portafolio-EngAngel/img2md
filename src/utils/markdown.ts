export function downloadMarkdown(content: string, filename = 'output.md'): void {
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export function stripExtension(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '')
}
