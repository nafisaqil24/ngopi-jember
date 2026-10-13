# Progress Log - Ngopi Jember Project

---

## 2026-10-13 14:32 WIB - Project Analysis & Audit

**Aktivitas:** Analisis menyeluruh codebase untuk memahami struktur dan status project

**Detail:**
- Explored struktur direktori: `backend/`, `frontend/`, `backend/prisma/`
- Read: README.md, package.json (root & backend), AGENTS.md
- Read backend: app.ts, server.ts, routes (auth, coffee-shop, owner, admin, reference), middleware (auth, errorHandler, upload), utils (jwt, password)
- Read prisma schema.prisma (187 lines)
- Read frontend: main.tsx, App.tsx, pages (Home, CoffeeShopExplorer, CoffeeShopDetail, Login, Register, Owner Dashboard, AdminDashboard), services, hooks, components

**Findings:**
- Phase 1-2: UI publik selesai
- Phase 3: API Express, Prisma, seed data - partially done
- Phase 4: Auth (register/login/me), JWT, role-based authorization - partially done
- Backend: Express 5 + TypeScript + Prisma 6.19.3 + PostgreSQL
- Frontend: React 19 + TypeScript + Vite 8 + Tailwind 4

---

## 2026-10-13 14:45 WIB - Audit Awal (Tahap A Step 1)

**Aktivitas:** Read-only audit untuk fondasi database (Neon PostgreSQL)

**Files Checked:**
| File | Status |
|------|--------|
| `backend/package.json` | @prisma/client 6.19.3, prisma CLI 6.19.3 ✅ Sama |
| `backend/prisma/schema.prisma` | Missing `directUrl` di datasource ❌ |
| `backend/.env.example` | Missing `DIRECT_URL` ❌ |
| `backend/.env` | Exists, variables populated ✅ |
| `backend/.gitignore` | Contains `.env*` ✅ |

**Variables di .env (terisi):**
- DATABASE_URL, PORT, CLIENT_URL, NODE_ENV, JWT_SECRET
- CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

---

## 2026-10-13 14:48 WIB - Step 2: Samakan Versi Prisma

**Keputusan:** Versi sudah sama (6.19.3), tidak perlu ubah package.json

**Status:** ✅ Tidak ada perubahan - versi sudah konsisten

---

## 2026-10-13 14:50 WIB - Step 3: Neon-friendly Schema & .env.example

**Perubahan File:**

### `backend/prisma/schema.prisma`
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // DITAMBAHKAN
}
```

### `backend/.env.example`
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ngopi_jember?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/ngopi_jember?schema=public"  // DITAMBAHKAN
PORT=4000
...
```

**Catatan:** DIRECT_URL placeholder untuk Neon (direct connection tanpa pgBouncer)

---

## 2026-10-13 14:52 WIB - Step 4: Cek .env - DIRECT_URL BELUM ADA

**Hasil:** File `.env` **belum memiliki `DIRECT_URL`**

**Instruksi ke User:** Tambahkan `DIRECT_URL` ke `backend/.env` dengan format Neon:
- `DATABASE_URL`: Pooled connection (dengan `pgbouncer=true`)
- `DIRECT_URL`: Direct connection (tanpa `pgbouncer=true`)

**Menunggu user input untuk lanjut ke migrasi...**

---

## 2026-10-13 15:10 WIB - Step 4 Retry: Host Check Neon

**Aktivitas:** Verifikasi host di DATABASE_URL dan DIRECT_URL bukan localhost

**Hasil Check:**
| Variabel | Status |
|----------|--------|
| `DATABASE_URL` | **masih localhost** (127.0.0.1:5433) |
| `DIRECT_URL` | **tidak ada** di file |

**File `.env` saat ini:**
```
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/ngopi_jember?schema=public"
# DIRECT_URL tidak ada
```

**Status:** ❌ **BLOKIR** - Keduanya harus ke Neon, bukan localhost

**Action Required:** Update `backend/.env` dengan keduanya ke Neon:
```env
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/ngopi_jember?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/ngopi_jember?sslmode=require"
```

---

## Next Steps (Pending)

- [ ] Step 4: User mengupdate .env dengan Neon DATABASE_URL + DIRECT_URL
- [ ] Step 5: `npm run prisma:migrate -- --name init` (pakai DIRECT_URL)
- [ ] Step 6: `npm run prisma:seed` - count rows per tabel
- [ ] Step 7: Verifikasi backend (health check + API endpoints)
- [ ] Step 8: Test, build, lint
- [ ] Step 9: Update dokumentasi

---

## Ringkasan File yang Diubah (Sejauh Ini)

| File | Jenis Perubahan |
|------|-----------------|
| `backend/prisma/schema.prisma` | Tambah `directUrl = env("DIRECT_URL")` |
| `backend/.env.example` | Tambah `DIRECT_URL` placeholder |

**Total changes: 2 files modified**

---

## Issues/Blockers Saat Ini

1. **DATABASE_URL masih localhost** - Harus diganti ke Neon pooled connection
2. **DIRECT_URL missing di .env** - Harus ditambahkan Neon direct connection
3. **Prisma version mismatch note** - Root package.json memiliki `@prisma/client ^7.10.0` tapi backend pakai 6.19.3 (tidak mempengaruhi backend tapi catatan untuk nanti)

---

*Last updated: 2026-10-13 15:10 WIB*

---

## 2026-10-13 15:30 WIB - Audit READ-ONLY Kedua (Neon Migration)

**Aktivitas:** Audit kedua read-only untuk memvalidasi siap tidaknya migrasi ke Neon

### 1. backend/.env Check

| Variabel | Status | Detail |
|----------|--------|--------|
| `DATABASE_URL` | ❌ MASALAH | `postgresql://****:****@127.0.0.1:5433/ngopi_jember?schema=public` — **masih localhost**, tanpa `-pooler`, tanpa `sslmode=require`, tanpa `pgbouncer=true` |
| `DIRECT_URL` | ❌ MASALAH | **Tidak ada** di file |
| `CLIENT_URL` | ⚠️ PERINGATAN | **Duplikat** (2 entri di file) |

### 2. `npx prisma validate`

**GAGAL** — `Error code: P1012: Environment variable not found: DIRECT_URL`

### 3. `npx prisma migrate status`

**GAGAL** — Butuh DIRECT_URL, tidak bisa cek status migrasi

### 4. Git Status

**OK** — `backend/.env` tidak ter-track (sudah di .gitignore)

---

## RINGKASAN TABEL AUDIT KEDUA

| Cek | Status | Detail |
|-----|--------|--------|
| DATABASE_URL ke Neon | ❌ MASALAH | Masih localhost (127.0.0.1:5433) |
| DIRECT_URL ada | ❌ MASALAH | Tidak ada di .env |
| DATABASE_URL pakai -pooler | ❌ MASALAH | Bukan Neon |
| DIRECT_URL tanpa pgbouncer | ❌ MASALAH | Tidak ada |
| DB name sama | N/A | DIRECT_URL missing |
| CLIENT_URL duplikat | ⚠️ PERINGATAN | 2 entri di .env |
| `prisma validate` | ❌ GAGAL | Butuh DIRECT_URL |
| `prisma migrate status` | ❌ GAGAL | Butuh DIRECT_URL |
| .env tidak di-git | ✅ OK | .gitignore benar |

---

## KESIMPULAN AUDIT KEDUA

**BELUM SIAP lanjut ke `prisma migrate deploy`.**

**Masalah yang harus diperbaiki:**
1. Ganti `DATABASE_URL` ke Neon pooled connection (host mengandung `-pooler`, ada `sslmode=require&pgbouncer=true`)
2. Tambahkan `DIRECT_URL` ke .env (host Neon TANPA `-pooler`, TANPA `pgbouncer=true`, ada `sslmode=require`)
3. Keduanya harus menunjuk ke database yang sama
4. Hapus duplikat `CLIENT_URL` di .env

---

*Last updated: 2026-10-13 15:30 WIB*

---

## 2026-10-13 15:45 WIB - Membuat Script Seed & Reset Data

**Aktivitas:** Menulis script `seed.ts` dan `reset-data.ts` di `backend/prisma/` + konfigurasi package.json

### File Dibuat/Diubah

| File | Jenis | Deskripsi |
|------|-------|-----------|
| `backend/prisma/seed.ts` | Baru | Seed idempotent: Category, Facility, User (ADMIN+OWNER dari env), CoffeeShop dari CSV, Menu opsional, relasi many-to-many |
| `backend/prisma/reset-data.ts` | Baru | Hapus data aman dengan `--confirm`, preview mode tanpa flag |
| `backend/prisma/data/coffee-shops.csv` | Baru | Header + 1 baris CONTOH (di-skip) |
| `backend/package.json` | Diubah | Tambah `prisma:seed`, `prisma:reset`, blok `prisma.seed` |
| `backend/.env.example` | Diubah | Tambah 6 variabel `SEED_*` placeholder kosong |

### Fitur seed.ts
- Upsert Category (7 item) & Facility (12 item) by slug
- User ADMIN & OWNER dari env `SEED_ADMIN_*`, `SEED_OWNER_*` (wajib, hash bcrypt via `src/utils/password.ts`)
- Parse CSV pakai `csv-parse` (bukan split manual), pemisah `|` untuk categories/facilities
- Validasi: field wajib, koordinat Jember (lat -8.6 to -7.8, lng 113.2 to 114.2), kategori/fasilitas harus match daftar
- Skip baris `CONTOH*`, slug unik auto-generate (`-2`, `-3` dst)
- Relasi `CoffeeShopCategory` & `CoffeeShopFacility` idempotent (deleteMany + createMany skipDuplicates)
- Optional `menus.csv` (kolom: coffeeShopName,name,price,category,description)
- Flag `--dry-run`: validasi saja, tidak tulis DB
- Cetak ringkasan row count per tabel di akhir
- **Tidak seed**: Review, Promotion, AnalyticsEvent, Subscription, CoffeeShopImage

### Fitur reset-data.ts
- Default: preview saja (tampilkan host DB + row counts semua tabel)
- `--confirm`: baru hapus data (deleteMany urutan FK-safe)
- Mask password di connection string output
- Tabel migrasi `_prisma_migrations` tidak disentuh

### Verifikasi
- `npm install csv-parse` di backend ✅
- `npm run check` (tsc --noEmit) ✅ bersih

---

## 2026-10-13 16:00 WIB - Perbaikan reset-data.ts: Delegate Mapping

**Masalah:** Mode preview menampilkan "N/A" untuk tabel `CoffeeShop`, `CoffeeShopCategory`, `CoffeeShopFacility`, `CoffeeShopImage`, `AnalyticsEvent`.

**Penyebab:** Delegate Prisma pakai camelCase (`prisma.coffeeShop`, `prisma.coffeeShopCategory`, dll), sedangkan kode pakai `table.toLowerCase()` → `coffeeshop`, `coffeeshopcategory` (salah).

**Perbaikan:**
1. Tambah `DELEGATE_MAP` eksplisit model→delegate
2. `getTableCounts()` return `{ counts, errors }` tangkap error asli
3. `printTableCounts()` tampilkan `ERROR - <pesan asli>` bukan "N/A"

### File Diubah
- `backend/prisma/reset-data.ts` (delegate mapping + error reporting)

### Verifikasi
- `npm run check` ✅ bersih

---

## Cara Pakai Seed/Reset (Urutan)

```bash
# 1. Preview reset (lihat host & row counts, TIDAK hapus)
npm run prisma:reset

# 2. Hapus data lama (butuh --confirm)
npm run prisma:reset -- --confirm

# 3. Dry-run seed (validasi CSV, env, relasi - TIDAK nulis DB)
npm run prisma:seed -- --dry-run

# 4. Jalankan seed untuk beneran
npm run prisma:seed
```

**Prasyarat:** Isi `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`, `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`, `SEED_OWNER_NAME` di `backend/.env` sebelum seed.

---

*Last updated: 2026-10-13 16:00 WIB*

---

## 2026-10-13 16:15 WIB - Perbaikan CSV: Hapus Baris Kosong

**Aktivitas:** `backend/prisma/data/coffee-shops.csv` ada 1 baris kosong di line 3 (antara CONTOH dan Hiro Coffee) yang bikin `csv-parse` error "Invalid Record Length".

**Perubahan:** Hapus baris kosong tersebut. File: 8 lines → 7 lines (1 header + 6 data rows).

**Verifikasi:**
- Parsed records: 6 (semua 12 kolom)
- `npm run prisma:seed -- --dry-run` → error validasi `priceRange` kosong (Hiro, Namu) & `openingHours` kosong (Semeru)

---

## 2026-10-13 16:20 WIB - Isi Placeholder priceRange & openingHours

**Aktivitas:** Isi 3 sel kosong yang bikin seed validasi gagal (NOT NULL di DB).

| Coffee Shop | Field | Isi |
|-------------|-------|-----|
| Hiro Coffee and Space | priceRange | `Belum tersedia` |
| Namu Coffee & Eatery | priceRange | `Belum tersedia` |
| Semeru Cafe & Resto | openingHours | `Belum tersedia` |

**Verifikasi:**
- Semua 6 records = 12 kolom ✅
- `priceRange` & `openingHours` terisi semua ✅
- **Pencarian parsing di kode:** Tidak ada kode yang parse priceRange jadi angka, openingHours jadi jam, filter/sort harga, atau cek buka/tutup dari openingHours. `isOpenNow` pakai `status === "OPEN"` saja.
- Dry-run → error kategori "Nongkrong" tidak valid

---

## 2026-10-13 16:30 WIB - Perbaikan Kategori di CSV (Nongkrong → Tempat Nongkrong)

**Aktivitas:** Seed validasi reject kategori `"Nongkrong"` (ada di CSV baris 3,4,5,6), valid hanya `"Tempat Nongkrong"`.

**Perubahan (hanya kolom `categories`):**

| Coffee Shop | Sebelum | Sesudah |
|-------------|---------|---------|
| Hiro Coffee and Space | `Cocok Buat WFH / Belajar\|Nongkrong` | `Cocok Buat WFH / Belajar\|Tempat Nongkrong` |
| Namu Coffee & Eatery | `Nongkrong\|Cocok Buat WFH / Belajar` | `Tempat Nongkrong\|Cocok Buat WFH / Belajar` |
| 888 Coffee & More | `Specialty Coffee\|Nongkrong` | `Specialty Coffee\|Tempat Nongkrong` |
| Semeru Cafe & Resto | `Nongkrong\|Resto` | `Tempat Nongkrong` (Resto dibuang, bukan kategori valid) |
| Perasa Coffee & Eatery | `Specialty Coffee\|Cocok Buat WFH / Belajar` | **tidak diubah** |

**Verifikasi Node:**
- Semua 6 records = 12 kolom ✅
- Semua kategori valid (match 7 kategori seed.ts) ✅

**Dry-run Seed — SUKSES:**
```
🔍 MODE DRY-RUN: Validasi saja, tidak menulis ke database
🌱 Mulai seed...
📦 Upsert Category...    7 kategori
📦 Upsert Facility...    12 fasilitas
   User nafisaqil2004@gmail.com sudah ada, lewati pembuatan
   User nafisaqil0@gmail.com sudah ada, lewati pembuatan
📄 Membaca 6 baris dari coffee-shops.csv
   Skip baris 2: CONTOH CONTOH Kopi Contoh
   [DRY-RUN] Akan upsert CoffeeShop: Hiro Coffee and Space (slug: hiro-coffee-and-space)
   [DRY-RUN] Akan upsert CoffeeShop: Namu Coffee & Eatery (slug: namu-coffee-eatery)
   [DRY-RUN] Akan upsert CoffeeShop: 888 Coffee & More (slug: 888-coffee-more)
   [DRY-RUN] Akan upsert CoffeeShop: Semeru Cafe & Resto (slug: semeru-cafe-resto)
   [DRY-RUN] Akan upsert CoffeeShop: Perasa Coffee & Eatery (slug: perasa-coffee-eatery)
✅ Coffee shop diproses: 5, dikip: 1
📄 File menus.csv tidak ditemukan, skip seed menu
🔍 DRY-RUN selesai. Tidak ada data yang ditulis.
```

**Status:** CSV siap untuk seed produksi (`npm run prisma:seed`).

---

*Last updated: 2026-10-13 16:30 WIB*