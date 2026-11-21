import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  normalizeLanguage,
  translate,
  type Language,
} from '../../shared/i18n'

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (source: string, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({
  language,
  onChange,
  children,
}: {
  language: Language
  onChange: (language: Language) => void
  children: ReactNode
}) {
  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: (next) => onChange(normalizeLanguage(next)),
      t: (source, vars) => translate(language, source, vars),
    }),
    [language, onChange],
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const value = useContext(LanguageContext)
  if (!value) {
    throw new Error('useLanguage harus dipakai di dalam LanguageProvider')
  }
  return value
}
