# Ngopi Jember

Direktori coffee shop untuk wilayah Jember. Seluruh nama, alamat, menu, dan gambar seed adalah data dummy untuk pengembangan, bukan klaim data bisnis nyata.

## Status proyek

Phase 1–2 menyelesaikan UI publik. Phase 3 menyiapkan API Express, model PostgreSQL/Prisma, data seed, serta endpoint publik baca-saja. Phase 4 menambahkan registrasi, login, JWT, password hashing, dan middleware role-based authorization. CRUD, dashboard, analytics, dan subscription management belum dibuat.

## Struktur

```
ngopi-jember/
├── frontend/                 # React + TypeScript + Vite + Tailwind
└── backend/
    ├── prisma/               # schema dan seed database
    └── src/
        ├── lib/              # Prisma client bersama
        ├── routes/           # endpoint REST publik
        ├── app.ts            # Express, CORS, error handler
        └── server.ts          # titik masuk server
```

## Menjalankan frontend

```bash
cd frontend
npm install
npm run dev
```

## Menjalankan backend dan database

1. Siapkan database PostgreSQL bernama `ngopi_jember`.
2. Dari folder `backend`, salin `.env.example` menjadi `.env`, lalu sesuaikan `DATABASE_URL`.
3. Jalankan perintah berikut:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

API akan berjalan di `http://localhost:4000` secara default.

## Environment variables

Semua nilai di bawah hanya placeholder. Isi nilai asli di `backend/.env` (jangan pernah di-commit).

| Variabel | Wajib/Opsional | Kegunaan |
| --- | --- | --- |
| `DATABASE_URL` | Wajib | Koneksi PostgreSQL **pooled** (Neon: host ada `-pooler`, `pgbouncer=true`) — dipakai aplikasi saat runtime |
| `DIRECT_URL` | Wajib | Koneksi PostgreSQL **direct** (Neon: tanpa `-pooler`) — dipakai Prisma migrate |
| `PORT` | Opsional | Port API, default `4000` |
| `CLIENT_URL` | Opsional | Asal frontend yang diizinkan CORS, default `http://localhost:5173` |
| `NODE_ENV` | Opsional | Mode eksekusi (`development` / `test` / `production`) |
| `JWT_SECRET` | Wajib | Kunci acak minimal 32 karakter untuk menandatangani JWT |
| `CLOUDINARY_CLOUD_NAME` | Opsional | Nama cloud Cloudinary untuk upload gambar |
| `CLOUDINARY_API_KEY` | Opsional | API key Cloudinary |
| `CLOUDINARY_API_SECRET` | Opsional | API secret Cloudinary (rahasia) |
| `SEED_ADMIN_EMAIL` | Opsional | Email akun ADMIN yang dibuat saat `prisma:seed` |
| `SEED_ADMIN_PASSWORD` | Opsional | Password akun ADMIN saat seed (rahasia) |
| `SEED_ADMIN_NAME` | Opsional | Nama akun ADMIN saat seed |
| `SEED_OWNER_EMAIL` | Opsional | Email akun OWNER yang dibuat saat `prisma:seed` |
| `SEED_OWNER_PASSWORD` | Opsional | Password akun OWNER saat seed (rahasia) |
| `SEED_OWNER_NAME` | Opsional | Nama akun OWNER saat seed |
| `ADMIN_EMAIL` / `ADMIN_NAME` / `ADMIN_PASSWORD` | Opsional | Akun admin pertama untuk script `db:create-admin` (bukan seed) |

## Database (Neon)

Proyek memakai PostgreSQL Neon yang butuh **dua URL berbeda** ke **database yang sama**:

- `DATABASE_URL` — **pooled connection**. Host mengandung `-pooler`, memakai `pgbouncer=true` dan `sslmode=require`. Dipakai aplikasi saat runtime karena tahan terhadap banyak koneksi.
- `DIRECT_URL` — **direct connection**. Host tanpa `-pooler`. Dipakai Prisma untuk migrasi (`prisma migrate`).

Contoh format (placeholder):

```env
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx-pooler.region.aws.neon.tech/DBNAME?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/DBNAME?sslmode=require"
```

Keduanya **wajib menunjuk database yang sama**; hanya beda jalur koneksi (pooled vs direct).

## Seed & Maintenance

Perintah dijalankan dari folder `backend`.

| Perintah | Fungsi |
| --- | --- |
| `npm run prisma:seed` | Seed idempotent: kategori & fasilitas (opsional akun ADMIN/OWNER dari `SEED_*`) |
| `npm run prisma:seed:prod` | Seed kategori & fasilitas saja (tanpa akun contoh) |
| `npm run prisma:reset` | **Preview** jumlah row per tabel (tidak menghapus) |
| `npm run prisma:reset -- --confirm` | Kosongkan seluruh tabel (hapus data) |
| `npm run prisma:cleanup-test` | **Preview** data test yang akan dihapus (user `@test.com` / `@ngopijember.test` + coffee shop-nya) |
| `npm run prisma:cleanup-test -- --confirm` | Hapus data test tersebut |

Selalu jalankan mode preview dulu sebelum memakai `--confirm`.

Format `prisma/data/coffee-shops.csv` (pemisah koma, kutip ganda untuk nilai ber-koma):

- Kolom: `name, address, district, latitude, longitude, description, priceRange, openingHours, phone, instagram, categories, facilities`
- `categories` dan `facilities` diisi satu sel dengan pemisah `|` (contoh: `WiFi|Colokan Listrik|AC`)
- Baris dengan nama diawali `CONTOH` dilewati (hanya contoh format)

## Testing

- Test wajib memakai `backend/.env.test` yang menunjuk ke Neon **branch "test"**, bukan DB utama.
- Guard di `src/test/setup-env.ts` menolak (throw error) jika `DATABASE_URL`/`DIRECT_URL` test sama dengan host DB utama.
- Test bersifat **mandiri**: membuat user & data sendiri lewat helper di `src/test/helpers.ts`, lalu menghapusnya lagi di `afterAll` sehingga DB test kembali bersih.
- Jalankan: `npm test` (dari folder `backend`).

## API Phase 3

| Endpoint | Fungsi |
| --- | --- |
| `GET /api/health` | Pemeriksaan status API |
| `GET /api/coffee-shops` | Daftar coffee shop dan pagination |
| `GET /api/coffee-shops/:slug` | Detail satu coffee shop |
| `GET /api/categories` | Referensi kategori |
| `GET /api/facilities` | Referensi fasilitas |

## Authentication Phase 4

Sebelum menjalankan API, isi `JWT_SECRET` di `backend/.env` dengan string acak minimal 32 karakter. Endpoint authentication tersedia setelah database dimigrasikan dan seed dijalankan:

| Endpoint | Fungsi |
| --- | --- |
| `POST /api/auth/register` | Mendaftarkan akun `USER` atau `OWNER`, lalu mengembalikan JWT |
| `POST /api/auth/login` | Memvalidasi kredensial dan mengembalikan JWT |
| `GET /api/auth/me` | Mengambil profil pengguna berdasarkan header `Authorization: Bearer <token>` |

Password disimpan sebagai hash bcrypt, bukan teks biasa. Pendaftaran publik tidak dapat membuat akun `ADMIN`; akun admin akan dikelola pada fase dashboard admin.

`GET /api/coffee-shops` menerima query opsional: `search`, `district`, `facility`, `featured`, `minRating`, `page`, dan `limit`. Seluruh respons mengikuti bentuk `{ success, data }`; error juga menyertakan `message`.

## Build production

```bash
cd frontend && npm run build
cd ../backend && npm run build
```

## Deployment Production

### Persiapan Database
1. Siapkan PostgreSQL production (Neon, Supabase, Railway, atau VPS)
2. Buat database `ngopi_jember`
3. Set `DATABASE_URL` dan `DIRECT_URL` di `.env`

### Environment Variables
```bash
cd backend
cp .env.production.example .env
# Edit .env dengan nilai production:
# - DATABASE_URL, DIRECT_URL (Neon/PostgreSQL)
# - CLIENT_URL (domain frontend production)
# - JWT_SECRET (openssl rand -base64 48)
# - CLOUDINARY_* (untuk upload gambar)
# - ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD (akun admin pertama)
```

### Deploy Backend
```bash
cd backend
npm ci
npm run prisma:generate
npm run prisma:migrate deploy  # jalanin migrasi existing
npm run prisma:seed:prod       # seed kategori & fasilitas saja
npm run db:create-admin        # buat akun admin pertama
npm run build
npm start
```

### Deploy Frontend
```bash
cd frontend
npm ci
# Set VITE_API_URL di build atau env
npm run build
# Deploy folder dist/ ke Vercel/Netlify/VPS
```

### Verifikasi Pasca-Deploy
1. `GET https://api.yourdomain.com/api/health` → `{ success: true }`
2. `POST /api/auth/register` dengan role OWNER → dapat JWT
3. Owner login → buat coffee shop → muncul di daftar publik
4. Admin login → akses dashboard admin (phase 5+)

### Single-Service Deployment (Express + Frontend di Satu Proses)

Menyajikan frontend dari `frontend/dist` di dalam proses backend Express.

#### Persiapan
```bash
# Dari root project
npm run build
# Ini akan:
# 1. Build frontend → frontend/dist/
# 2. Install deps backend + prisma generate + build TypeScript → backend/dist/
```

#### Environment Variables (Production)
Wajib diisi di `backend/.env`:
| Variabel | Deskripsi |
| --- | --- |
| `DATABASE_URL` | Pooled connection (Neon: `-pooler`, `pgbouncer=true`) |
| `DIRECT_URL` | Direct connection untuk migrasi (Neon: tanpa `-pooler`) |
| `JWT_SECRET` | Minimal 32 karakter acak |
| `CLIENT_URL` | Domain frontend production (comma-separated jika multi-domain) |
| `CLOUDINARY_CLOUD_NAME` | Nama cloud Cloudinary |
| `CLOUDINARY_API_KEY` | API key Cloudinary |
| `CLOUDINARY_API_SECRET` | API secret Cloudinary |
| `TRUST_PROXY` | (Opsional) Jumlah hop proxy, default `1` di production |

#### Migrasi & Seed
```bash
cd backend
npm run prisma:migrate:deploy   # Jalanin migrasi existing ke DB production
npm run prisma:seed:prod        # Seed kategori & fasilitas saja
npm run db:create-admin         # Buat akun admin pertama (dari ADMIN_* env)
```

#### Jalankan
```bash
# Dari root (setelah build)
cd backend && npm start
# Atau dari root: NODE_ENV=production node backend/dist/server.js
```

Server akan:
- Melayani API di `/api/*`
- Melayani static files dari `frontend/dist` di root
- Fallback ke `index.html` untuk non-API GET (SPA routing)
- Return 404 JSON untuk `/api/*` yang tidak ditemukan
- Validasi env gagal start dengan pesan jelas jika variabel wajib kosong

#### Verifikasi
1. `GET /api/health` → `{ success: true }`
2. Buka domain production → load SPA
3. Login owner → buat coffee shop
4. Upload gambar → ke Cloudinary (bukan local storage)
