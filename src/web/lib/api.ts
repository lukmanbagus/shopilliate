import type {
  CategoryListResponse,
  Category,
  Product,
  ProductListResponse,
  PublicHomeData,
  PublicProductList,
  DashboardData,
  AdminSettings,
  UpdateInfo,
} from '../../shared/types'
import type { LoginInput, SetupInput } from '../../shared/schemas'
import type { Language } from '../../shared/i18n'

export interface SetupStatus {
  installed: boolean
  needsToken: boolean
  language: Language
}

let requestLanguage: Language = 'en'

export function setApiLanguage(language: Language): void {
  requestLanguage = language
}

export class ApiError extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept-Language', requestLanguage)
  const method = (init.method ?? 'GET').toUpperCase()
  if (
    method !== 'GET' &&
    method !== 'HEAD' &&
    !(init.body instanceof FormData)
  ) {
    headers.set('Content-Type', 'application/json')
  }
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers,
  })
  const data = (await response.json().catch(() => null)) as
    | { error?: { code?: string; message?: string } }
    | null
  if (!response.ok) {
    throw new ApiError(
      data?.error?.code ?? 'ERROR',
      data?.error?.message ?? 'Terjadi kesalahan. Silakan coba lagi.',
      response.status,
    )
  }
  return data as T
}

export interface ProductQuery {
  q?: string
  category?: string
  status?: string
  page?: number
  limit?: number
}

export interface FetchResult {
  title: string
  price: number
  imageUrl: string | null
  imageKey: string | null
  soldText: string | null
  affiliateUrl: string | null
  shopId: string
  itemId: string
  source: 'affiliate_api' | 'html'
  shopeeUrl: string
}

export const api = {
  setupStatus: () => request<SetupStatus>('/api/setup/status'),
  setup: (input: SetupInput) =>
    request<{ ok: true }>('/api/setup', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  login: (input: LoginInput) =>
    request<{ ok: true }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ username: string }>('/api/me'),

  home: () => request<PublicHomeData>('/api/public/home'),
  publicProducts: (query: {
    category?: string
    q?: string
    sort?: string
    page?: number
    limit?: number
  }) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params.set(key, String(value))
    }
    const suffix = params.toString()
    return request<PublicProductList>(
      `/api/public/products${suffix ? `?${suffix}` : ''}`,
    )
  },

  categories: () => request<CategoryListResponse>('/api/admin/categories'),
  createCategory: (input: Partial<Category> & { name: string }) =>
    request<{ category: Category }>('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateCategory: (id: number, input: Partial<Category>) =>
    request<{ category: Category }>(`/api/admin/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteCategory: (id: number) =>
    request<{ ok: true }>(`/api/admin/categories/${id}`, { method: 'DELETE' }),

  products: (query: ProductQuery = {}) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params.set(key, String(value))
    }
    const suffix = params.toString()
    return request<ProductListResponse>(
      `/api/admin/products${suffix ? `?${suffix}` : ''}`,
    )
  },
  product: (id: number) =>
    request<{ product: Product }>(`/api/admin/products/${id}`),
  createProduct: (input: Record<string, unknown>) =>
    request<{ product: Product }>('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateProduct: (id: number, input: Record<string, unknown>) =>
    request<{ product: Product }>(`/api/admin/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteProduct: (id: number) =>
    request<{ ok: true }>(`/api/admin/products/${id}`, { method: 'DELETE' }),
  fetchShopee: (url: string) =>
    request<FetchResult>('/api/admin/fetch', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
  syncProduct: (id: number) =>
    request<{ product: Product }>(`/api/admin/products/${id}/sync`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  dashboard: () => request<DashboardData>('/api/admin/dashboard'),
  updateInfo: () => request<UpdateInfo>('/api/admin/update'),
  settings: () =>
    request<{ settings: AdminSettings }>('/api/admin/settings'),
  updateSettings: (input: Record<string, unknown>) =>
    request<{ ok: true }>('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  changePassword: (input: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }) =>
    request<{ ok: true }>('/api/admin/password', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  upload: (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<{ key: string; url: string }>('/api/admin/upload', {
      method: 'POST',
      body,
    })
  },
}
