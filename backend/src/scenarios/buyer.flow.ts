/**
 * Buyer Test Flow - NusaRoast UKOM
 * Test scenarios sesuai spesifikasi phase 47
 */

// Register Flow
export const registerFlow = {
  step1: 'Register dengan full name, email, phone, address, password',
  step2: 'Validasi email valid dan password minimum length',
  step3: 'User dibuat berhasil, token JWT diterima',
};

// Login Flow
export const loginFlow = {
  step1: 'Login menggunakan email & password',
  step2: 'JWT dibearer token via Authorization Header',
  step3: 'User bisa akses protected routes',
};

// Browse & Search Flow
export const browseFlow = {
  step1: 'Akses /products, lihat product grid',
  step2: 'Filter kategori: All, Arabica, Robusta',
  step3: 'Search produk berdasarkan name',
  step4: 'Product detail di /product?id=[id]',
};

// Cart Flow
export const cartFlow = {
  step1: 'Add product ke cart tanpa login (guest cart)',
  step2: 'Quantity validasi against stock',
  step3: 'Checkout memerlukan login',
  step4: 'Pilih shipping method: Regular (Rp18.000) / Fast (Rp25.000)',
};

// Checkout & Payment Flow
export const checkoutFlow = {
  step1: 'Redirect ke /login jika belum login',
  step2: 'Shipping Address: satu alamat utama',
  step3: 'Order Items, Total calculation',
  step4: 'Midtrans Sandbox Open Snap Popup',
  step5: 'Simulasi pembayaran, status order update',
  step6:
    'Order status flow: PENDING -> PAID -> PROCESSING -> SHIPPED -> COMPLETED',
};

// Order Tracking Flow
export const orderTrackingFlow = {
  step1: 'Lihat order di /orders',
  step2: 'Tampilkan countdown 20 menit untuk PENDING',
  step3:
    'Status order: Menunggu Pembayaran / Diproses / Dikirim / Selesai / Dibatalkan',
  step4:
    'Input resi oleh admin: "Salin nomor resi untuk mengecek pengiriman di situs resmi kurir"',
};

// Order Confirmation Flow
export const orderConfirmationFlow = {
  step1: 'SHIPPED status > tekan "Pesanan Diterima"',
  step2: 'Status berubah SHIPPED -> COMPLETED',
  step3: 'Fallback: jika SHIPPED > 48 jam, otomatis COMPLETED',
};
