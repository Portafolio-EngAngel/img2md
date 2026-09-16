'use client'

import { useState, useCallback } from 'react'
import type { ConversionState, ConvertResponse, ApiError, SupportedLanguage } from '@/types'
import { DEFAULT_LANGUAGE } from '@/constants'

const INITIAL_STATE: ConversionState = {
  status: 'idle',
  progress: 0,
  result: null,
  error: null,
}

export function useConverter() {
  const [state, setState] = useState<ConversionState>(INITIAL_STATE)

  const convert = useCallback(async (file: File, language: SupportedLanguage = DEFAULT_LANGUAGE) => {
    setState({ status: 'uploading', progress: 10, result: null, error: null })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('language', language)

    setState(s => ({ ...s, status: 'processing', progress: 30 }))

    let response: Response
    try {
      response = await fetch('/api/convert', { method: 'POST', body: formData })
    } catch {
      setState({ status: 'error', progress: 0, result: null, error: 'Error de red. Revise su conexión.' })
      return
    }

    setState(s => ({ ...s, progress: 80 }))

    const json = await response.json()

    if (!response.ok) {
      const apiError = json as ApiError
      setState({ status: 'error', progress: 0, result: null, error: apiError.error })
      return
    }

    setState({ status: 'done', progress: 100, result: json as ConvertResponse, error: null })
  }, [])

  const reset = useCallback(() => setState(INITIAL_STATE), [])

  return { state, convert, reset }
}
