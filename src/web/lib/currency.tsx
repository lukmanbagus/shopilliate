import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  formatMoney,
  normalizeCurrency,
  type CurrencyCode,
} from '../../shared/currency'

interface CurrencyContextValue {
  currency: CurrencyCode
  formatPrice: (amount: number) => string
  setCurrency: (currency: string) => void
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export function CurrencyProvider({
  currency,
  onChange,
  children,
}: {
  currency: string
  onChange: (currency: CurrencyCode) => void
  children: ReactNode
}) {
  const value = useMemo<CurrencyContextValue>(() => {
    const code = normalizeCurrency(currency)
    return {
      currency: code,
      formatPrice: (amount) => formatMoney(amount, code),
      setCurrency: (next) => onChange(normalizeCurrency(next)),
    }
  }, [currency, onChange])

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency(): CurrencyContextValue {
  const value = useContext(CurrencyContext)
  if (!value) {
    throw new Error('useCurrency harus dipakai di dalam CurrencyProvider')
  }
  return value
}
