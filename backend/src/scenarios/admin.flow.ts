/**
 * Admin Test Flow - NusaRoast UKOM
 * Test scenarios sesuai spesifikasi phase 47
 */

// Dashboard Flow
export const dashboardFlow = {
  step1: 'Login via /login?redirect=/admin',
  step2: 'Tampak header "Halo, [Nama Admin]"',
  step3: 'Metric cards: Total Keuangan, Pesanan Diproses, Produk Aktif',
};

// Product Management Flow
export const productManagementFlow = {
  step1: 'Tampak daftar produk',
  step2: 'Menambah produk baru',
  step3: 'Mengedit produk existente',
  step4: 'Mengubah stock produk',
  step5: 'Mengaktifkan/menonaktifkan produk',
};

// Buyer Management Flow
export const buyerManagementFlow = {
  step1: 'Lihat daftar pembeli',
  step2: 'Status: ACTIVE / BANNED',
  step3: 'Lakukan "Banned / Nonaktifkan User"',
  step4: 'User status berubah menjadi BANNED, tidak bisa login',
};

// Order Management Flow
export const orderManagementFlow = {
  step1: 'Lihat seluruh order',
  step2: 'Detail order: Order ID, Buyer, Products, Total, Status',
  step3: 'Ubah status: PAID → PROCESSING',
  step4: 'Ubah status: PROCESSING → SHIPPED',
  step5: 'Masukkan nomor resi saat order dikirim',
  step6: 'Admin tidak perlu memasukkan nama kurir',
};
