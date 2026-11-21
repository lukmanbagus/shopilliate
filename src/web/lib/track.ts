export function trackClick(productId: number): void {
  try {
    void fetch(`/api/click/${productId}`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
  } catch {
    // Pencatatan klik tidak boleh menunda navigasi.
  }
}
