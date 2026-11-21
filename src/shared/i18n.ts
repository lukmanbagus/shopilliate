export type Language = 'en' | 'id'

export const DEFAULT_LANGUAGE: Language = 'en'

export const LANGUAGES: Array<{ value: Language; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'id', label: 'Bahasa Indonesia' },
]

/**
 * Terjemahan Inggris dikunci dengan teks sumber Bahasa Indonesia.
 * Kunci yang belum diterjemahkan akan tampil apa adanya (Bahasa Indonesia).
 */
const EN: Record<string, string> = {
  // Umum
  'Coba lagi': 'Try again',
  'Menyimpan…': 'Saving…',
  'Mengubah…': 'Changing…',
  'Memuat…': 'Loading…',
  'Mengunggah…': 'Uploading…',
  'Mengambil…': 'Fetching…',
  'Menyiapkan…': 'Setting up…',
  'Memeriksa…': 'Checking…',
  'Simpan': 'Save',
  'Batal': 'Cancel',
  'Tidak ditemukan': 'Not found',
  'Terjadi kesalahan. Silakan coba lagi.': 'Something went wrong. Please try again.',
  'Tidak dapat menghubungi server.': 'Unable to reach the server.',

  // Status bahasa
  'Bahasa': 'Language',
  'Pilih bahasa antarmuka situs.': 'Choose the site interface language.',
  'Warna tema': 'Theme color',
  'Kode warna': 'Color code',
  'Pilih satu warna; warna turunannya dibuat otomatis.':
    'Pick one color; matching shades are generated automatically.',
  'Kembalikan ke warna default': 'Reset to default color',
  'Warna tidak valid.': 'Invalid color.',
  'Warna utama': 'Primary color',
  'Warna lembut': 'Soft color',
  'Warna teks': 'Text color',
  'Warna teks di atas warna utama': 'Text color on primary',
  'Default': 'Default',

  // Aplikasi / navigasi
  'Etalase gagal dimuat': 'Failed to load storefront',
  'Tidak dapat memuat etalase. Silakan coba lagi.':
    'Could not load the storefront. Please try again.',
  'Koneksi gagal': 'Connection failed',
  'Halaman tidak ditemukan.': 'Page not found.',
  'Dashboard': 'Dashboard',
  'Produk': 'Products',
  'Kategori': 'Categories',
  'Pengaturan': 'Settings',
  'Keluar': 'Sign out',

  // Setup
  'Selamat datang': 'Welcome',
  'Buat akun admin untuk mulai mengelola etalase Anda.':
    'Create an admin account to start managing your storefront.',
  'Nama situs': 'Site name',
  'Contoh: Belanja Pilihan Moms': 'Example: Moms’ Picks',
  'Username': 'Username',
  '3–32 karakter: huruf kecil, angka, titik, atau garis bawah.':
    '3–32 characters: lowercase letters, numbers, dots, or underscores.',
  'Password': 'Password',
  'Minimal 10 karakter.': 'At least 10 characters.',
  'Konfirmasi password': 'Confirm password',
  'Kode Setup': 'Setup code',
  'Buat Akun Admin': 'Create Admin Account',
  'Gagal menyelesaikan setup. Silakan coba lagi.':
    'Could not complete setup. Please try again.',

  // Login
  'Masuk ke panel admin': 'Sign in to admin panel',
  'Masuk': 'Sign in',
  'Lupa password? Jalankan': 'Forgot your password? Run',
  'di server Anda.': 'on your server.',
  'Gagal masuk. Silakan coba lagi.': 'Sign-in failed. Please try again.',

  // Dashboard
  'Ringkasan performa etalase Anda.': 'An overview of your storefront performance.',
  'Tambah Produk': 'Add Product',
  'Total produk': 'Total products',
  'Klik 7 hari': 'Clicks (7 days)',
  'Klik 30 hari': 'Clicks (30 days)',
  '5 produk terklik': 'Top 5 clicked products',
  'Kelola produk': 'Manage products',
  'Belum ada produk.': 'No products yet.',
  'Tambahkan produk untuk mulai mengumpulkan klik.':
    'Add products to start collecting clicks.',
  '{count} klik': '{count} clicks',
  'Dashboard gagal dimuat.': 'Failed to load dashboard.',

  // Daftar produk
  '{count} produk tersimpan.': '{count} products saved.',
  'Cari nama produk…': 'Search product name…',
  'Semua kategori': 'All categories',
  'Semua status': 'All statuses',
  'Tampil': 'Visible',
  'Disembunyikan': 'Hidden',
  'Harga': 'Price',
  'Status': 'Status',
  'Filter kategori': 'Filter category',
  'Filter status': 'Filter status',
  'Klik': 'Clicks',
  'Aksi': 'Actions',
  'Tambahkan produk pertama Anda dengan menempelkan link Shopee.':
    'Add your first product by pasting a Shopee link.',
  'Gagal memuat produk.': 'Failed to load products.',
  'Gagal mengubah status.': 'Failed to change status.',
  'Gagal menghapus produk.': 'Failed to delete product.',
  'Gagal sinkron ulang produk.': 'Failed to resync product.',
  'Hapus produk "{title}"? Gambar dan riwayat klik ikut dihapus. Tindakan ini tidak bisa dibatalkan.':
    'Delete "{title}"? Its image and click history will also be deleted. This cannot be undone.',
  'Sebelumnya': 'Previous',
  'Berikutnya': 'Next',
  'Halaman {page} dari {total}': 'Page {page} of {total}',
  'Edit': 'Edit',
  'Sinkron': 'Resync',
  'Sembunyikan': 'Hide',
  'Tampilkan': 'Show',
  'Hapus': 'Delete',

  // Form produk
  'Edit Produk': 'Edit Product',
  'Tempel link Shopee, lalu lengkapi detail produk.':
    'Paste a Shopee link, then complete the product details.',
  'Link Shopee': 'Shopee link',
  'Ambil Data': 'Fetch Data',
  'Hanya mengambil data saat tombol ditekan. Tidak ada crawling otomatis.':
    'Only fetches data when the button is pressed. No automatic crawling.',
  'Tempel link Shopee terlebih dahulu.': 'Paste a Shopee link first.',
  'Data berhasil diambil melalui Shopee Affiliate API.':
    'Data fetched via the Shopee Affiliate API.',
  'Data berhasil diambil dari halaman publik Shopee.':
    'Data fetched from the public Shopee page.',
  'Data tidak dapat diambil otomatis. Silakan isi detail produk secara manual.':
    'Data could not be fetched automatically. Please fill in the product details manually.',
  'Nama produk': 'Product name',
  'Harga (Rupiah)': 'Price (IDR)',
  'Tanpa kategori': 'No category',
  'Teks terjual (opsional)': 'Sales text (optional)',
  '10RB+ terjual': '1K+ sold',
  'Link afiliasi (opsional)': 'Affiliate link (optional)',
  'Jika kosong, pengunjung diarahkan ke link Shopee asli.':
    'If empty, visitors are sent to the original Shopee link.',
  'Gambar produk': 'Product image',
  'Pratinjau gambar produk': 'Product image preview',
  'Belum ada': 'None yet',
  'Pilih gambar': 'Choose image',
  'JPEG, PNG, atau WebP. Maks 5 MB.': 'JPEG, PNG, or WebP. Max 5 MB.',
  'Tandai TOP': 'Mark as TOP',
  'Tampilkan di etalase': 'Show in storefront',
  'Gagal mengunggah gambar.': 'Failed to upload image.',
  'Nama produk wajib diisi.': 'Product name is required.',
  'Link Shopee wajib diisi.': 'Shopee link is required.',
  'Harga tidak valid.': 'Invalid price.',
  'Gagal menyimpan produk.': 'Failed to save product.',

  // Kategori
  'Kelola kategori dan subkategori etalase Anda.':
    'Manage your storefront categories and subcategories.',
  'Ubah kategori': 'Edit category',
  'Kategori baru': 'New category',
  'Nama kategori': 'Category name',
  'Induk (opsional)': 'Parent (optional)',
  'Tanpa induk (kategori utama)': 'No parent (top-level category)',
  'Urutan': 'Sort order',
  'Gambar thumbnail (opsional)': 'Thumbnail image (optional)',
  'Belum ada kategori.': 'No categories yet.',
  'Buat kategori pertama lewat formulir di samping.':
    'Create your first category using the form.',
  'Hapus kategori "{name}"? Produk di dalamnya tetap ada tanpa kategori.':
    'Delete category "{name}"? Its products will remain without a category.',
  'Gagal memuat kategori.': 'Failed to load categories.',
  'Gagal menyimpan kategori.': 'Failed to save category.',
  'Gagal menghapus kategori.': 'Failed to delete category.',
  'Nama kategori wajib diisi.': 'Category name is required.',
  '/k/{slug} · {count} produk · urutan {order}':
    '/k/{slug} · {count} products · order {order}',

  // Pengaturan
  'Sesuaikan identitas situs dan kredensial Shopee Affiliate.':
    'Customize your site identity and Shopee Affiliate credentials.',
  'Tagline banner atas (opsional)': 'Top banner tagline (optional)',
  'Contoh: Gratis ongkir untuk pembelian hari ini':
    'Example: Free shipping on orders today',
  'Judul hero': 'Hero title',
  'Pilihan terbaik, dikurasi untuk Anda': 'The best picks, curated for you',
  'Deskripsi hero': 'Hero description',
  'Pernyataan afiliasi (footer)': 'Affiliate disclosure (footer)',
  'Shopee Affiliate API (opsional)': 'Shopee Affiliate API (optional)',
  'Isi App ID dan Secret dari akun Shopee Affiliate Anda agar pengambilan data memakai jalur resmi. Detail kredensial tidak pernah dikirim kembali ke browser.':
    'Enter the App ID and Secret from your Shopee Affiliate account so data fetching uses the official route. Credential details are never sent back to the browser.',
  'App ID': 'App ID',
  'App Secret': 'App Secret',
  'Tersimpan — kosongkan untuk mempertahankan':
    'Saved — leave blank to keep it',
  'Belum diisi': 'Not set',
  'Hapus kredensial Shopee yang tersimpan':
    'Remove saved Shopee credentials',
  'Simpan Pengaturan': 'Save Settings',
  'Pengaturan berhasil disimpan.': 'Settings saved.',
  'Gagal menyimpan pengaturan.': 'Failed to save settings.',
  'Pengaturan gagal dimuat.': 'Failed to load settings.',
  'Ubah password': 'Change password',
  'Sesi lain akan otomatis keluar setelah password diubah.':
    'Other sessions will be signed out after the password is changed.',
  'Password saat ini': 'Current password',
  'Password baru': 'New password',
  'Konfirmasi password baru': 'Confirm new password',
  'Ubah Password': 'Change Password',
  'Password berhasil diubah.': 'Password changed successfully.',
  'Gagal mengubah password.': 'Failed to change password.',
  'Nama situs wajib diisi.': 'Site name is required.',

  // Beranda
  'Belanja per Kategori': 'Shop by Category',
  'Belum ada kategori. Admin dapat menambahkannya dari panel admin.':
    'No categories yet. Admins can add them from the admin panel.',
  '{count} produk': '{count} products',
  'Pilihan Teratas': 'Top Picks',
  'Produk andalan yang paling sering dipilih.':
    'Favorite products chosen most often.',
  'Belum ada produk bertanda TOP.': 'No TOP products yet.',
  'Admin dapat menandai produk sebagai TOP dari panel admin.':
    'Admins can mark products as TOP from the admin panel.',
  'Temukan produk Shopee pilihan dengan harga terbaik. Setiap pembelian melalui tautan kami membantu situs ini tetap berjalan.':
    'Discover selected Shopee products at great prices. Every purchase through our links helps keep this site running.',

  // Halaman kategori & pencarian
  'Beranda': 'Home',
  '{count} produk tersedia': '{count} products available',
  'Urutkan': 'Sort by',
  'Terpopuler': 'Most popular',
  'Terbaru': 'Newest',
  'Harga terendah': 'Lowest price',
  'Harga tertinggi': 'Highest price',
  'Semua': 'All',
  'Belum ada produk di kategori ini.': 'No products in this category yet.',
  'Silakan jelajahi kategori lain atau kembali lagi nanti.':
    'Explore other categories or check back later.',
  'Muat lebih banyak': 'Load more',
  'Gagal memuat produk lainnya.': 'Failed to load more products.',
  'Kategori gagal dimuat. Silakan coba lagi.':
    'Failed to load category. Please try again.',
  'Kembali ke beranda': 'Back to home',
  'Cari produk pilihan': 'Search for products',
  'Ketik nama produk di kolom pencarian untuk mulai menjelajah.':
    'Type a product name in the search bar to start exploring.',
  'Hasil pencarian “{query}”': 'Search results for “{query}”',
  '{count} produk ditemukan': '{count} products found',
  'Tidak ada hasil untuk “{query}”.': 'No results for “{query}”.',
  'Coba kata kunci lain atau jelajahi kategori yang tersedia.':
    'Try another keyword or browse the available categories.',
  'Pencarian gagal. Silakan coba lagi.': 'Search failed. Please try again.',

  // Header, kartu, footer
  'Cari produk pilihan…': 'Search products…',
  'Cari produk': 'Search products',
  'Cari': 'Search',
  '{siteName} — beranda': '{siteName} — home',
  'Tanpa gambar': 'No image',
  'Produk akan tampil di sini setelah ditambahkan oleh admin.':
    'Products will appear here once an admin adds them.',
  'Situs ini memuat tautan afiliasi. Kami dapat menerima komisi dari pembelian melalui tautan tersebut tanpa biaya tambahan untuk Anda.':
    'This site contains affiliate links. We may earn a commission from purchases made through these links at no extra cost to you.',
  'Dibuat oleh': 'Created by',
  'Pembaruan tersedia: v{version}': 'Update available: v{version}',
  'Catatan rilis': 'Release notes',
  'Salin perintah': 'Copy command',
  'Tersalin': 'Copied',
  'Terbaru (v{version})': 'Up to date (v{version})',
  '© {year} {siteName}. Harga dapat berubah sewaktu-waktu di Shopee.':
    '© {year} {siteName}. Prices may change at any time on Shopee.',

  // Validasi bersama
  'Nama situs maksimal 60 karakter.': 'Site name must be at most 60 characters.',
  'Username 3 sampai 32 karakter, hanya huruf kecil, angka, titik, atau garis bawah.':
    'Username must be 3–32 characters using lowercase letters, numbers, dots, or underscores.',
  'Password minimal 10 karakter.': 'Password must be at least 10 characters.',
  'Konfirmasi password tidak cocok.': 'Passwords do not match.',
  'Username wajib diisi.': 'Username is required.',
  'Password wajib diisi.': 'Password is required.',
  'Password saat ini wajib diisi.': 'Current password is required.',
  'Password baru minimal 10 karakter.':
    'New password must be at least 10 characters.',
  'Konfirmasi password baru tidak cocok.':
    'New password confirmation does not match.',
  'Data yang dikirim tidak valid.': 'The submitted data is invalid.',

  // Pesan server
  'Aplikasi belum diinstal. Selesaikan halaman setup terlebih dahulu.':
    'The app is not installed yet. Complete the setup page first.',
  'Aplikasi sudah diinstal. Halaman setup tidak tersedia lagi.':
    'The app is already installed. The setup page is no longer available.',
  'Aplikasi sudah diinstal oleh permintaan lain. Silakan masuk.':
    'The app was installed by another request. Please sign in.',
  'Kode setup tidak sesuai.': 'Incorrect setup code.',
  'Endpoint tidak ditemukan.': 'Endpoint not found.',
  'Terjadi kesalahan pada server. Silakan coba lagi.':
    'A server error occurred. Please try again.',
  'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.':
    'Too many sign-in attempts. Try again in 15 minutes.',
  'Username atau password salah.': 'Incorrect username or password.',
  'Sesi tidak valid. Silakan masuk kembali.':
    'Your session is invalid. Please sign in again.',
  'Permintaan harus menggunakan Content-Type application/json.':
    'The request must use Content-Type application/json.',
  'Permintaan ditolak: Origin tidak dikenal.':
    'Request rejected: unknown origin.',
  'Permintaan ditolak: Origin tidak valid.':
    'Request rejected: invalid origin.',
  'Permintaan ditolak: Origin tidak sesuai.':
    'Request rejected: origin mismatch.',
  'Link tidak valid. Gunakan link produk Shopee Indonesia (shopee.co.id, s.shopee.co.id, shp.ee, atau id.shp.ee).':
    'Invalid link. Use a Shopee Indonesia product link (shopee.co.id, s.shopee.co.id, shp.ee, or id.shp.ee).',
  'Link pendek mengarah ke domain yang tidak diizinkan.':
    'The short link points to a disallowed domain.',
  'Link Shopee tidak dapat dikenali sebagai halaman produk. Pastikan link mengarah ke produk, bukan toko atau halaman lain.':
    'The Shopee link is not recognized as a product page. Make sure it points to a product, not a shop or another page.',
  'Data produk tidak dapat diambil otomatis dari Shopee. Silakan isi nama, harga, dan gambar secara manual.':
    'Product data could not be fetched automatically from Shopee. Please fill in the name, price, and image manually.',
  'Produk tidak valid.': 'Invalid product.',
  'Produk tidak ditemukan.': 'Product not found.',
  'Kategori tidak ditemukan.': 'Category not found.',
  'Kategori induk tidak ditemukan.': 'Parent category not found.',
  'Subkategori hanya boleh satu tingkat.':
    'Subcategories can only be one level deep.',
  'Kategori tidak boleh menjadi induk dirinya sendiri.':
    'A category cannot be its own parent.',
  'Nama kategori maksimal 50 karakter.':
    'Category name must be at most 50 characters.',
  'Link Shopee tidak valid.': 'Invalid Shopee link.',
  'Link afiliasi tidak valid.': 'Invalid affiliate link.',
  'Nama produk maksimal 200 karakter.':
    'Product name must be at most 200 characters.',
  'Harga harus bilangan bulat.': 'Price must be a whole number.',
  'Harga tidak boleh negatif.': 'Price cannot be negative.',
  'Teks terjual maksimal 40 karakter.':
    'Sales text must be at most 40 characters.',
  'Berkas tidak dapat dibaca.': 'The file could not be read.',
  'Berkas gambar wajib dikirim.': 'An image file is required.',
  'Ukuran gambar maksimal 5 MB.': 'Image size must be at most 5 MB.',
  'Format gambar harus JPEG, PNG, atau WebP.':
    'Image format must be JPEG, PNG, or WebP.',
  'Isi berkas tidak sesuai dengan tipe yang dinyatakan.':
    'File contents do not match the declared type.',
  'Teks banner maksimal 120 karakter.':
    'Banner text must be at most 120 characters.',
  'Judul hero maksimal 120 karakter.':
    'Hero title must be at most 120 characters.',
  'Deskripsi hero maksimal 300 karakter.':
    'Hero description must be at most 300 characters.',
  'Pernyataan afiliasi maksimal 500 karakter.':
    'Affiliate disclosure must be at most 500 characters.',
  'App ID maksimal 100 karakter.': 'App ID must be at most 100 characters.',
  'Secret maksimal 200 karakter.': 'Secret must be at most 200 characters.',
  'Password saat ini tidak sesuai.': 'Current password is incorrect.',
}

export function normalizeLanguage(value: unknown): Language {
  return value === 'id' ? 'id' : DEFAULT_LANGUAGE
}

export function languageFromHeader(header: string | null | undefined): Language {
  const value = (header ?? '').toLowerCase()
  if (value.startsWith('id') || value.includes('id-id')) return 'id'
  return DEFAULT_LANGUAGE
}

export function translate(
  language: Language,
  source: string,
  vars?: Record<string, string | number>,
): string {
  const template = language === 'id' ? source : (EN[source] ?? source)
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    vars[key] === undefined ? match : String(vars[key]),
  )
}
