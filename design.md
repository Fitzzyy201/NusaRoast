# NusaRoast

## Master Design & Technical Specification

Project Name: NusaRoast

Project Type: Specialty Indonesian Coffee Beans E-Commerce

Target: UKOM / Uji Kompetensi Keahlian

Development Timeline: 1 month

---

# 1. PROJECT OVERVIEW

NusaRoast adalah website e-commerce yang menjual biji kopi specialty Indonesia.

Website memiliki dua sisi utama:

1. Buyer
2. Seller / Admin

Buyer dapat melihat produk, memasukkan produk ke keranjang, melakukan checkout, membayar melalui Midtrans Sandbox, dan memantau pesanan.

Seller / Admin mengelola produk, stok, pengguna, dan pesanan.

Project harus terlihat modern, rapi, profesional, dan mudah digunakan.

Design harus clean tetapi tidak terasa kosong.

Prioritas project:

1. Design
2. Frontend
3. Backend
4. Database
5. Authentication
6. Payment
7. Responsive design
8. Reliability

Semua bagian memiliki prioritas yang seimbang.

---

# 2. TECHNOLOGY STACK

## Frontend

* Next.js
* App Router
* TypeScript
* React
* Tailwind CSS
* Lucide React
* Plus Jakarta Sans
* Client Components dan Server Components sesuai kebutuhan

## Backend

* NestJS
* TypeScript
* REST API
* JWT Authentication

## Database

* MySQL / MariaDB
* Prisma ORM
* Laragon sebagai local development database

## Payment

* Midtrans Snap API
* Sandbox mode

## Email

* Nodemailer
* SMTP
* Digunakan untuk forgot password / reset password

---

# 3. DESIGN SYSTEM

## Brand

Nama:
NusaRoast

Konsep:
Specialty Indonesian Coffee Beans

Nuansa:
Modern
Warm
Minimal
Premium
Natural

Website tidak boleh terlihat seperti template AI atau dashboard generator.

---

# 4. COLOR PALETTE

Primary Background:

#FAF8F5

Secondary Background / Card:

#F1ECE4

Primary Text:

#1A1A1A

Primary Button / Accent:

#2C1E16

Gunakan warna secara konsisten di seluruh halaman.

Jangan membuat warna baru tanpa kebutuhan desain.

---

# 5. TYPOGRAPHY

Gunakan Plus Jakarta Sans di seluruh aplikasi.

Tidak menggunakan font berbeda untuk komponen tertentu.

Typography harus memiliki hierarchy yang jelas:

* Heading besar
* Heading section
* Product title
* Body text
* Caption
* Price
* Button text

Hindari penggunaan terlalu banyak ukuran font.

---

# 6. STRICT DESIGN RULES

Dilarang:

* Gradient
* Neon color
* Emoji
* Heavy decorative icons
* Excessive animation
* Excessive shadows
* Excessive rounded cards
* UI yang terlalu ramai
* Text yang terlalu banyak
* PDF export
* Print feature

Gunakan Lucide React hanya jika memang membantu fungsi UI.

Icon yang diperbolehkan antara lain:

* Search
* ShoppingCart
* User
* Menu
* Lock
* ChevronRight
* Check
* Bell
* Package
* Plus
* Minus
* Trash
* Edit
* Eye
* EyeOff

Icon tidak boleh menjadi dekorasi utama.

---

# 7. RESPONSIVE DESIGN

Desktop menjadi prioritas utama.

Target utama:

1280px+

Namun seluruh website harus tetap responsive untuk:

* Desktop
* Tablet
* Mobile

Mobile tidak boleh hanya menjadi versi desktop yang diperkecil.

Layout, spacing, navigation, product grid, cart, checkout, dan admin dashboard harus menyesuaikan ukuran layar.

---

# 8. USER ROLES

Website hanya memiliki dua role.

## BUYER

Buyer adalah pengguna yang membeli produk.

Buyer dapat:

* Register
* Login
* Forgot password
* Melihat produk
* Search produk
* Filter kategori
* Melihat detail produk
* Menambahkan produk ke cart
* Checkout
* Membayar
* Melihat pesanan
* Melihat status pesanan
* Melihat nomor resi
* Mengubah alamat sebelum checkout
* Mengkonfirmasi pesanan diterima

## SELLER

Seller juga berfungsi sebagai Admin.

Saat ini hanya terdapat satu akun Seller yang dibuat melalui database seed.

Seller dapat:

* Login melalui `/login?redirect=/admin`
* Melihat dashboard
* Mengelola produk
* Mengelola stok
* Mengaktifkan / menonaktifkan produk
* Melihat buyer
* Membanned buyer
* Melihat pesanan
* Mengubah status pesanan
* Memasukkan nomor resi

Tidak perlu membuat fitur untuk membuat Seller baru.

---

# 9. AUTHENTICATION

Gunakan JWT.

Buyer:

`/login`

Seller:

`/login?redirect=/admin`

Register:

`/register`

Forgot password:

`/forgot-password`

Reset password:

`/reset-password`

Authentication menggunakan JWT melalui HTTP Authorization Header.

Format:

Bearer Token

Password wajib disimpan dalam bentuk hash.

Password tidak boleh dikembalikan melalui API.

---

# 10. BUYER REGISTRATION

Form:

* Full Name
* Email
* Phone Number
* Full Address
* Password

Validasi:

* Email valid
* Password memiliki panjang minimum
* Field wajib tidak boleh kosong
* Email tidak boleh duplikat

---

# 11. LOGIN

Buyer login menggunakan:

* Email
* Password

Seller login menggunakan:

* Email
* Password

Jika akun Buyer berstatus BANNED:

User tidak boleh login.

Jika authentication berhasil:

JWT diberikan kepada user.

---

# 12. FORGOT PASSWORD

Forgot password menggunakan SMTP melalui Nodemailer.

Flow:

Forgot Password

→ masukkan email

→ server membuat reset token

→ email dikirim melalui SMTP

→ user membuka link reset

→ membuat password baru

→ token menjadi invalid

---

# 13. HOMEPAGE

Route:

`/`

Struktur:

1. Navbar
2. Hero
3. Featured / Product Section
4. Category Filter
5. Product Grid
6. Indonesian Coffee Origin Section
7. Roast Level Guide
8. Footer

Homepage harus memiliki cukup visual agar tidak terasa kosong.

Namun jangan membuat homepage terlalu ramai.

---

# 14. NAVBAR

Desktop:

NusaRoast

Home
Product
Search
Orders
Cart
Profile / Login

Navbar dapat memiliki:

* Search
* Notification
* Cart badge
* Order status indicator
* Login / Profile

About dan Contact tidak perlu berada di navbar.

Letakkan di footer.

Navbar harus sederhana dan mudah dipahami.

---

# 15. HERO SECTION

Hero menggunakan visual kopi dengan nuansa dark warm roasted coffee.

Headline:

"Cita Rasa Kopi Nusantara"

Subheadline menjelaskan bahwa NusaRoast menyediakan biji kopi specialty dari berbagai daerah Indonesia.

CTA:

"Jelajahi Biji Kopi"

Hero tidak boleh menggunakan gradient.

Gunakan gambar dengan komposisi yang tetap membuat text mudah dibaca.

---

# 16. PRODUCT CATEGORY

Kategori:

* Semua
* Arabica
* Robusta

Kategori menggunakan field database:

`category`

Enum:

ARABICA
ROBUSTA

---

# 17. PRODUCT CARD

Product card menampilkan:

* Product image
* Product name
* Origin
* Roast level
* Weight selector
* Price
* Stock status
* Buy Now button
* Cart button

Roast level menggunakan angka 1 sampai 5.

Setiap produk memiliki satu atau lebih varian berat. Berat tidak lagi disimpan di Product, tetapi di ProductVariant.

Contoh varian:

100g
250g
500g
1kg

Berat default adalah varian pertama berdasarkan `sortOrder`. Harga dan stok mengikuti varian yang dipilih.

Jika stok varian yang dipilih = 0:

* Product tetap dapat dilihat
* Tombol Beli Langsung disabled
* Tombol Cart disabled
* Tampilkan status stok habis

Jika product `isActive = false`:

Product tidak ditampilkan pada katalog Buyer.

Homepage awal menampilkan maksimal 6 produk.

Ada tombol:

"Tampilkan Semua Produk"

Produk tambahan muncul tanpa reload halaman.

---

# 18. PRODUCT DATA

Product memiliki:

* Name
* Category
* Origin
* Description
* Flavor Notes
* Roast Level
* Variants
* Image
* Active Status

ProductVariant memiliki:

* Weight
* Price
* Stock
* Sort Order

Flavor Notes dapat memiliki beberapa nilai.

Contoh:

Chocolate
Caramel
Citrus

---

# 19. SEARCH

Search hanya berdasarkan nama produk.

Search berada di navbar.

Search harus memiliki UX sederhana.

Tidak perlu search engine yang kompleks.

---

# 20. PRODUCT DETAIL

Route:

`/product/[id]`

Layout desktop:

Left:
Product Gallery

Right:

* Product Name
* Origin
* Description
* Flavor Notes
* Roast Level
* Weight Selector
* Price
* Stock
* Quantity Selector
* Add to Cart
* Buy Now

Mobile menggunakan layout satu kolom.

Buy Now membuka checkout hanya untuk varian dan quantity yang dipilih, tanpa menambahkan item ke cart.

---

# 21. ROAST LEVEL GUIDE

Homepage memiliki penjelasan Roast Level 1 sampai 5.

Level:

1. Light Roast
2. Medium Light
3. Medium
4. Medium Dark
5. Dark Roast

Database hanya menyimpan angka:

`1-5`

Frontend menampilkan penjelasan masing-masing level.

Guide harus mudah dipahami oleh buyer yang belum memahami roast level.

---

# 22. SHOPPING CART

Route:

`/cart`

User yang belum login masih boleh memasukkan produk ke cart.

Namun checkout wajib login.

Cart memiliki:

* Product image
* Product name
* Variant weight
* Price
* Quantity
* Subtotal
* Checkbox
* Delete button

CartItem menyimpan `variantId`. Item dengan produk sama tetapi berat berbeda dianggap item terpisah.

Header memiliki:

"Pilih Semua"

User dapat checkout hanya produk yang dipilih.

Quantity tidak boleh melebihi stock.

---

# 23. CHECKOUT

Route:

`/checkout`

Jika user belum login:

Redirect:

`/login`

Checkout dibuat dengan konsep zero distraction.

Checkout mendukung dua sumber item:

* Cart: checkout item yang dipilih dari cart.
* Buy Now: checkout satu varian langsung dari product card/detail tanpa mengubah cart.

Section:

1. Shipping Address
2. Shipping Method
3. Order Items
4. Total
5. Payment

Address:

Buyer memiliki satu alamat utama.

User dapat mengubah alamat sebelum checkout.

Shipping Method:

Regular:
Rp18.000

Fast:
Rp25.000

Tidak menggunakan third-party shipping API.

---

# 24. PAYMENT

Gunakan:

Midtrans Snap API

Environment:

Sandbox

Tujuan:

Testing / UKOM.

Tidak menggunakan pembayaran uang sungguhan.

Flow:

Checkout (cart atau buy now)

→ Create Order

→ Request Midtrans Snap Token

→ Open Midtrans Snap Popup

→ Buyer melakukan simulasi pembayaran

→ Midtrans mengirim status pembayaran

Status order:

PENDING
PAID
PROCESSING
SHIPPED
COMPLETED
CANCELLED

---

# 25. PAYMENT TIMER

Order PENDING memiliki batas pembayaran 20 menit.

Gunakan:

`createdAt + 20 minutes`

Frontend menampilkan countdown.

Backend tetap memvalidasi waktu pembayaran.

Jika batas waktu terlewati:

Order dapat dianggap expired dan tidak dapat dibayar kembali.

Tidak perlu membuat sistem cron khusus untuk fitur ini.

---

# 26. ORDER PAGE

Route:

`/orders`

Order card menampilkan:

* Order ID
* Date
* Products
* Total
* Status
* Shipping method
* Resi

Status:

Menunggu Pembayaran
Diproses
Dikirim
Selesai
Dibatalkan

Untuk PENDING:

Tampilkan countdown 20 menit.

---

# 27. SHIPPING / RESI

Buyer tidak melakukan tracking resi melalui website NusaRoast.

Seller hanya memasukkan nomor resi.

Database menyimpan:

`shippingMethod`

dan:

`resiNumber`

Buyer melihat nomor resi.

Tampilkan instruksi:

"Salin nomor resi untuk mengecek pengiriman di situs resmi kurir."

Tidak perlu menggunakan API tracking kurir.

---

# 28. ORDER CONFIRMATION

Jika order berstatus SHIPPED:

Buyer dapat menekan:

"Pesanan Diterima"

Status berubah:

SHIPPED → COMPLETED

Tambahkan fallback 2x24 jam.

Jika status SHIPPED sudah lebih dari 48 jam, backend dapat mengubahnya menjadi COMPLETED ketika order diperiksa.

Tidak perlu membuat cron untuk versi awal.

---

# 29. SELLER DASHBOARD

Route:

`/admin/dashboard`

Dashboard berisi:

Header:

"Halo, [Nama Seller]"

Metric cards:

1. Total Keuangan
2. Pesanan Diproses
3. Produk Aktif

---

# 30. PRODUCT MANAGEMENT

Seller dapat:

* Melihat daftar produk
* Menambahkan produk
* Mengedit produk
* Mengubah stock
* Mengaktifkan produk
* Menonaktifkan produk

Product management menggunakan table pada desktop.

Mobile menggunakan responsive layout atau card.

Field:

* Name
* Category
* Origin
* Description
* Flavor Notes
* Roast Level
* Variants (weight, price, stock, sort order)
* Image
* Active Status

Seller dapat menambah dan menghapus baris varian. Minimal satu varian wajib ada. Varian yang sudah dipakai order tidak boleh dihapus; set stok menjadi 0.

---

# 31. BUYER MANAGEMENT

Seller dapat melihat:

* Name
* Email
* Phone
* Status

Seller dapat melakukan:

"Banned / Nonaktifkan User"

Jika Buyer dibanned:

Status:

BANNED

User tidak dapat login.

Password tidak pernah ditampilkan.

Password tetap disimpan dalam bentuk hash.

---

# 32. ORDER MANAGEMENT

Seller dapat melihat:

* Order ID
* Buyer
* Products
* Total
* Payment status
* Order status
* Shipping method
* Resi

Seller dapat mengubah:

PAID → PROCESSING

PROCESSING → SHIPPED

Seller dapat memasukkan nomor resi saat order dikirim.

Seller tidak perlu memasukkan nama kurir.

Shipping method berasal dari pilihan Buyer.

---

# 33. DATABASE

Gunakan:

MySQL / MariaDB

ORM:

Prisma

Local development:

Laragon

Database utama:

NusaRoast

Migrasi varian berat:

`prisma/migrations/20261029000001_product_variants`

Migrasi memindahkan `Product.weight`, `Product.price`, dan `Product.stock` menjadi ProductVariant, lalu membackfill CartItem dan OrderItem.

Migrasi repo ini memakai `up.sql`/`down.sql` (bukan `migration.sql`), jadi `prisma migrate status` tidak dipakai sebagai sumber status. Terapkan `up.sql` manual pada database lokal.

---

# 34. DATABASE MODELS

## User

Fields:

* id
* name
* email
* password
* phone
* address
* role
* status
* createdAt

Role:

BUYER
SELLER

Status:

ACTIVE
BANNED

---

## Product

Fields:

* id
* name
* category
* origin
* description
* flavorNotes
* roastLevel
* imageBase64
* isActive
* createdAt

Harga dan stok tidak disimpan di Product. Keduanya berasal dari ProductVariant.

Category:

ARABICA
ROBUSTA

Roast level:

1-5

---

## ProductVariant

Fields:

* id
* productId
* weight
* price
* stock
* sortOrder
* createdAt

Weight disimpan lowercase tanpa spasi, contoh `100g`, `250g`, `1kg`, `1.5kg`.

Unique constraint:

* `[productId, weight]`

Relasi:

* Product 1 - N ProductVariant
* ProductVariant 1 - N CartItem
* ProductVariant 1 - N OrderItem

---

## Cart

Fields:

* id
* userId
* createdAt

---

## CartItem

Fields:

* id
* cartId
* productId
* variantId
* quantity

Unique constraint:

* `[cartId, variantId]`

---

## Order

Fields:

* id
* userId
* totalAmount
* shippingCost
* shippingMethod
* resiNumber
* status
* snapToken
* createdAt

Status:

PENDING
PAID
PROCESSING
SHIPPED
COMPLETED
CANCELLED

---

## OrderItem

Fields:

* id
* orderId
* productId
* variantId
* variantWeight
* quantity
* price

Price pada OrderItem harus menyimpan harga ketika transaksi terjadi.

VariantWeight adalah snapshot berat saat transaksi terjadi.

Jangan mengambil harga terbaru ProductVariant untuk menghitung histori order.

OrderItem yang sudah terhubung ke order tidak boleh dihapus variannya.

---

# 35. BACKEND ARCHITECTURE

NestJS menggunakan struktur modular.

Contoh:

backend/
├── src/
│   ├── auth/
│   ├── users/
│   ├── products/
│   ├── cart/
│   ├── orders/
│   ├── payment/
│   ├── admin/
│   ├── prisma/
│   └── main.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── package.json

Setiap module memiliki:

* Controller
* Service
* DTO
* Module

Gunakan dependency injection NestJS.

---

# 36. API ARCHITECTURE

REST API.

Contoh:

Authentication:

POST `/auth/register`

POST `/auth/login`

POST `/auth/forgot-password`

POST `/auth/reset-password`

Products:

GET `/products`

GET `/products/:id`

GET `/products/variants/:id`

POST `/products`

PATCH `/products/:id`

DELETE `/products/:id`

Cart:

GET `/cart`

POST `/cart/items` dengan body `{ variantId, quantity }`

PATCH `/cart/items/:id`

DELETE `/cart/items/:id`

Orders:

POST `/orders`

POST `/orders/buy-now` dengan body `{ variantId, quantity, shippingMethod }`

GET `/orders`

GET `/orders/:id`

PATCH `/orders/:id/status`

Payment:

POST `/payment/create`

POST `/payment/buy-now` dengan body `{ variantId, quantity, shippingMethod }`

POST `/payment/webhook`

Admin:

GET `/admin/users`

PATCH `/admin/users/:id/ban`

API dapat dikembangkan sesuai kebutuhan ketika implementasi dimulai.

---

# 37. FRONTEND ARCHITECTURE

Next.js menggunakan App Router.

Contoh struktur:

frontend/
└── src/
├── app/
│   ├── page.tsx
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   ├── reset-password/
│   ├── product/
│   │   └── [id]/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   └── admin/
│       ├── login/
│       └── dashboard/
│
├── components/
│   ├── navbar/
│   ├── product/
│   ├── cart/
│   ├── checkout/
│   └── ui/
│
├── lib/
│   ├── api.ts
│   └── utils.ts
│
└── types/

Gunakan reusable components.

Jangan membuat satu page dengan ribuan baris code.

---

# 38. FRONTEND DATA FLOW

Frontend tidak boleh langsung mengakses database.

Flow:

Next.js

↓

NestJS REST API

↓

Prisma

↓

MySQL

Untuk authentication:

Next.js

↓

JWT

↓

NestJS Auth Guard

---

# 39. IMAGE HANDLING

Product image disimpan sebagai Base64.

Frontend mengirim image ke backend.

Backend menyimpan Base64 ke database.

Saat menampilkan:

Base64 digunakan sebagai image source.

Ukuran upload harus dibatasi agar database tidak membengkak secara tidak terkendali.

---

# 40. ADMIN SEED

Database memiliki satu akun Seller melalui Prisma Seed.

Contoh:

Role:

SELLER

Status:

ACTIVE

Password tetap disimpan dalam bentuk hash.

Credentials tidak boleh ditulis langsung di frontend.

---

# 41. FOOTER

Footer berisi:

NusaRoast

About Us

Contact

Informasi singkat mengenai NusaRoast.

Copyright.

Tidak ada newsletter box.

Tidak ada section yang tidak diperlukan.

---

# 42. FIGMA WORKFLOW

Pada tahap awal, Figma tidak menjadi sumber utama implementasi.

Development dimulai berdasarkan Design & Technical Specification ini.

Setelah aplikasi selesai dan seluruh flow berjalan:

1. Review UI
2. Rapikan visual
3. Buat desain Figma berdasarkan UI final
4. Bandingkan Figma dengan implementasi
5. Sesuaikan coding jika diperlukan

Figma digunakan sebagai tahap visual refinement setelah struktur aplikasi stabil.

---

# 43. DEVELOPMENT RULES

Jangan melakukan over-engineering.

Jangan membuat fitur yang tidak diperlukan UKOM.

Jangan membuat library internal jika tidak diperlukan.

Gunakan reusable components ketika memang ada pengulangan.

Jaga TypeScript tetap strict.

Validasi input di frontend dan backend.

Jangan percaya input dari frontend.

Backend tetap melakukan authorization.

Buyer tidak boleh mengakses endpoint Admin.

Seller tidak boleh menggunakan endpoint Buyer yang membutuhkan kepemilikan data jika tidak sesuai.

---

# 44. SECURITY RULES

Password wajib di-hash.

JWT harus divalidasi backend.

Authorization harus berdasarkan role.

User hanya boleh mengakses cart miliknya sendiri.

User hanya boleh melihat order miliknya sendiri.

Seller dapat melihat seluruh order.

Seller dapat mengelola seluruh product.

Password tidak boleh dikembalikan oleh API.

JWT secret dan Midtrans credentials disimpan di `.env`.

SMTP credentials disimpan di `.env`.

Jangan commit `.env` ke Git.

---

# 45. CODE QUALITY

Gunakan:

* TypeScript
* DTO
* Prisma types
* Proper error handling
* HTTP status code yang sesuai
* Reusable components
* Clean naming
* Consistent folder structure

Hindari:

* `any` tanpa alasan
* Duplicate code
* Hardcoded credentials
* Database query langsung dari frontend
* Logic bisnis terlalu banyak di React component

---

# 46. DEVELOPMENT ORDER

Implementasi dilakukan bertahap.

Phase 1:
Next.js setup

Phase 2:
Design system

Phase 3:
Navbar dan global layout

Phase 4:
Homepage

Phase 5:
Product detail

Phase 6:
NestJS setup

Phase 7:
Prisma + MySQL

Phase 8:
Authentication

Phase 9:
Product API

Phase 10:
Cart

Phase 11:
Checkout

Phase 12:
Midtrans Sandbox

Phase 13:
Order system

Phase 14:
Admin dashboard

Phase 15:
SMTP forgot password

Phase 16:
Responsive mobile

Phase 17:
Testing

Phase 18:
UI refinement

Phase 19:
Figma finalization

---

# 47. TESTING FLOW

Buyer:

Register

→ Login

→ Browse Product

→ Search Product

→ Filter Product

→ Product Detail

→ Select Variant Weight

→ Add Cart atau Buy Now

→ Checkout

→ Select Address

→ Select Shipping

→ Midtrans Sandbox

→ Payment

→ Order

→ Seller Processing

→ Seller Input Resi

→ Buyer melihat resi

→ Buyer menerima pesanan

→ Completed

Admin:

Admin Login

→ Dashboard

→ Add Product

→ Edit Product

→ Manage Variants

→ Update Stock per Variant

→ Activate / Deactivate Product

→ View Buyer

→ Ban Buyer

→ View Order

→ Update Order

→ Input Resi

---

# 48. FINAL DESIGN PRINCIPLE

NusaRoast harus terasa seperti website e-commerce kopi yang benar-benar dapat digunakan.

Bukan sekadar landing page.

Bukan sekadar dashboard.

Bukan sekadar prototype visual.

Semua halaman harus memiliki fungsi yang jelas.

Design harus clean tetapi tetap memiliki visual hierarchy.

Desktop menjadi prioritas.

Mobile tetap harus nyaman.

Code harus mudah dipahami dan dikembangkan selama pengerjaan UKOM.

Jangan menambahkan fitur hanya untuk membuat project terlihat kompleks.

Setiap fitur harus memiliki alasan dan fungsi yang jelas.