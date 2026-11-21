export interface Category {
  id: number
  parentId: number | null
  slug: string
  name: string
  imageKey: string | null
  sortOrder: number
  productCount?: number
}

export interface Product {
  id: number
  categoryId: number | null
  categoryName: string | null
  shopeeUrl: string
  affiliateUrl: string | null
  title: string
  price: number
  soldText: string | null
  imageKey: string | null
  isTop: boolean
  status: 'published' | 'hidden'
  clickCount: number
  lastSyncedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface ProductListResponse {
  products: Product[]
  total: number
  page: number
  limit: number
}

export interface CategoryListResponse {
  categories: Category[]
}

export interface PublicProduct {
  id: number
  title: string
  price: number
  soldText: string | null
  imageKey: string | null
  isTop: boolean
  url: string
  categorySlug: string | null
  categoryName: string | null
}

export interface PublicSettings {
  siteName: string
  bannerText: string
  heroTitle: string
  heroDescription: string
  affiliateDisclosure: string
  language: 'en' | 'id'
}

export interface PublicHomeData {
  settings: PublicSettings
  categories: Category[]
  topProducts: PublicProduct[]
}

export interface PublicProductList {
  products: PublicProduct[]
  total: number
  page: number
  limit: number
  category: Category | null
  parent: { slug: string; name: string } | null
  subcategories: Category[]
}

export interface DashboardData {
  totalProducts: number
  clicks7: number
  clicks30: number
  topProducts: Array<{
    id: number
    title: string
    price: number
    imageKey: string | null
    clickCount: number
  }>
}

export interface AdminSettings {
  siteName: string
  bannerText: string
  heroTitle: string
  heroDescription: string
  affiliateDisclosure: string
  shopeeAppId: string
  hasShopeeSecret: boolean
  language: 'en' | 'id'
}
