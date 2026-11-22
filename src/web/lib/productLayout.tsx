import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { ProductLayout } from '../components/ProductCard'

const LAYOUT_STORAGE_KEY = 'shopilliate:product-layout'
const LEGACY_STORAGE_KEY = 'shopilliate:home-layout'

function readSavedLayout(): ProductLayout {
  try {
    const saved =
      window.localStorage.getItem(LAYOUT_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY)
    return saved === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

interface ProductLayoutContextValue {
  layout: ProductLayout
  setLayout: (next: ProductLayout) => void
}

const ProductLayoutContext = createContext<ProductLayoutContextValue | null>(
  null,
)

export function ProductLayoutProvider({ children }: { children: ReactNode }) {
  const [layout, setLayoutState] = useState<ProductLayout>(readSavedLayout)

  function setLayout(next: ProductLayout) {
    setLayoutState(next)
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, next)
    } catch {
      // Abaikan jika storage tidak tersedia (mis. mode privat ketat)
    }
  }

  return (
    <ProductLayoutContext.Provider value={{ layout, setLayout }}>
      {children}
    </ProductLayoutContext.Provider>
  )
}

export function useProductLayout(): ProductLayoutContextValue {
  const value = useContext(ProductLayoutContext)
  if (!value) {
    throw new Error(
      'useProductLayout harus dipakai di dalam ProductLayoutProvider',
    )
  }
  return value
}
