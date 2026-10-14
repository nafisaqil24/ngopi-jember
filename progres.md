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
   User admin@example.com sudah ada, lewati pembuatan
   User owner@example.com sudah ada, lewati pembuatan
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

---

## 2026-10-14 - Script Cleanup Test Data

**Aktivitas:** Menambahkan npm script `prisma:cleanup-test` untuk script pembersih data test yang sudah ada di `backend/prisma/cleanup-test-data.ts`

### File Diubah

| File | Jenis | Deskripsi |
|------|-------|-----------|
| `backend/package.json` | Diubah | Tambah script `prisma:cleanup-test`: `"tsx prisma/cleanup-test-data.ts"` |
| `backend/prisma/cleanup-test-data.ts` | Diubah (bugfix) | Perbaiki `await` di dalam `forEach` callback (line 162) - pre-fetch owner emails sebelum preview |

### Fitur Script `cleanup-test-data.ts`
- Default: **PREVIEW** (hanya tampilkan info, TIDAK hapus)
- `--confirm`: baru hapus data (wrapped in `prisma.$transaction`)
- Scope hapus:
  - User dengan email berakhiran `@test.com`
  - CoffeeShop milik user tersebut + anak-anak: Menu, CoffeeShopImage, CoffeeShopCategory, CoffeeShopFacility, Review, Promotion, AnalyticsEvent, Subscription
  - Review oleh user `@test.com` di coffee shop lain
- Urutan hapus FK-safe: AnalyticsEvent → CoffeeShopFacility → CoffeeShopCategory → Review → Menu → CoffeeShopImage → Promotion → Subscription → CoffeeShop → User
- Safety checks:
  - Tolak kalau ada user di daftar hapus yang BUKAN `@test.com`
  - Tolak kalau coffee shop yang akan dihapus namanya ada di `backend/prisma/data/coffee-shops.csv` (data seed)
  - Tidak sentuh `_prisma_migrations`, `Category`, `Facility`, user non-`@test.com`
- Preview menampilkan: host DB (password masked), user yang akan dihapus (email masked), coffee shop yang akan dihapus (name + slug), row count per tabel, detail CoffeeShopImage per shop
- Setelah `--confirm`: cetak row count sebelum vs sesudah per tabel

### Verifikasi
- `npm run check` (tsc --noEmit) ✅ bersih
- `npm run prisma:cleanup-test` (preview) ✅ jalan, output di atas

---

## 2026-10-14 - Fix Frontend Build (data.ts Syntax)

**Aktivitas:** Memperbaiki syntax error (trailing comma ganda `,,`) di `frontend/src/data.ts:61`.

### File Diubah
| File | Sebelum | Sesudah | Alasan |
|------|---------|---------|--------|
| `frontend/src/data.ts` | `...price: "Rp24.000" },,` | `...price: "Rp24.000" },` | Menghilangkan koma ganda yang menyebabkan TypeScript/Vite parsing error |

### Hasil Verifikasi
- `npm run build` di frontend: ✅ Sukses (`✓ built in 1.35s`)
- `npm run lint` di frontend: ✅ Selesai (beberapa warning React effect/unused var non-blocking)

---

---

## 2026-10-14 - Update cleanup-test-data.ts (Dual Domains & Enhanced Preview)

**Aktivitas:** Memperbarui skrip `backend/prisma/cleanup-test-data.ts` sesuai persyaratan baru untuk pembersihan data test.

### Perubahan Utama:
1. **Target User Test:** Diperluas mencakup email berakhiran `@test.com` ATAU `@ngopijember.test`.
2. **Preview Detail:** Menampilkan daftar user target (email disamarkan + role) dan daftar coffee shop target (name + slug), bukan hanya jumlah.
3. **Perbaikan Row Count (`-1 → -1`):** Menggunakan `DELEGATE_MAP` eksplisit dari `reset-data.ts` untuk menghitung row count per tabel sebelum dan sesudah dengan benar.
4. **Informasi Admin Tersisa:** Menambahkan informasi jumlah User ber-role ADMIN yang tersisa di akhir output preview maupun eksekusi.
5. **Pengaman & Keamanan:** Tetap FK-safe, mode default PREVIEW (hapus hanya dengan `--confirm`), menolak jika ada user di luar dua domain target, dan menolak jika coffee shop target ada di `coffee-shops.csv`.

### Verifikasi:
- `npm run check` (tsc) ✅ Berhasil tanpa error.
- `npm run prisma:cleanup-test` (Preview) ✅ Berjalan sukses menampilkan daftar user dan coffee shop target serta sisa admin.

---

## 2026-10-14 - Test Environment Guard (Wajib Neon Branch 'test')

**Aktivitas:** Memastikan test suite hanya berjalan ke Neon branch `test` (`backend/.env.test`) dan tidak pernah ke DB utama (`backend/.env`).

### Perubahan Utama:
1. **`backend/vitest.config.ts`**: `setupFiles: ['./src/test/setup-env.ts']` agar guard env dijalankan sebelum test apa pun (sebelum `app.ts` ter-import).
2. **`backend/src/test/setup-env.ts`**: Memuat `.env.test` dengan `dotenv` (`override: true`) dan set `NODE_ENV=test`; membandingkan host `DATABASE_URL`/`DIRECT_URL` (mengabaikan sufiks `-pooler`) dengan host di `.env` utama (dibaca via `dotenv.parse`, tanpa dimuat ke `process.env`). Menolak bila `.env.test` tidak ada, variabel kurang/kosong, format tidak valid, atau host sama dengan DB utama.
3. **`backend/src/test/env-guard.test.ts`**: Test kecil tanpa akses DB — memverifikasi `NODE_ENV === 'test'` dan host `DATABASE_URL` berbeda dari DB utama.
4. **`backend/src/comprehensive-audit.test.ts`**: Log tidak lagi mencetak connection string utuh, hanya HOST.
5. **`AGENTS.md`**: Ditambahkan aturan test hanya boleh ke Neon branch `test`.

### Verifikasi:
- `npx vitest run src/test/env-guard.test.ts`: ✅ 1 passed, menampilkan `[test-env] DB host: ep-xxxx-test.c-3.ap-southeast-1.aws.neon.tech`.
- Simulasi guard (`.env.test` di-rename sementara): ✅ GAGAL dengan pesan `Error: TEST DIBLOKIR: File backend/.env.test tidak ditemukan...` (file dikembalikan setelahnya).
- `npm run check` (tsc): ✅ Berhasil tanpa error.
- Host DB test (tanpa kredensial): `ep-xxxx-test.c-3.ap-southeast-1.aws.neon.tech` (berbeda dari DB utama).

---

## 2026-10-14 - Verifikasi Koneksi `backend/.env.test` (Read-Only)

**Aktivitas:** Memverifikasi bahwa `backend/.env.test` valid dan aman dipakai test, dengan cara memuatnya di subprocess saja (tanpa mengubah environment shell) dan tanpa mengubah data.

### Hasil:
1. **Host + database `.env.test`:**
   - `DATABASE_URL` → `ep-xxxx-pooler.c-3.ap-southeast-1.aws.neon.tech` / `neondb` (pakai `-pooler`).
   - `DIRECT_URL` → `ep-xxxx.c-3.ap-southeast-1.aws.neon.tech` / `neondb` (tanpa `-pooler`).
   - Endpoint BERBEDA dari DB utama (`ep-xxxx...`).
2. **`npx prisma migrate status`** (env `.env.test`): EXIT 0 — "2 migrations found", "Database schema is up to date!".
3. **SELECT count (DB test):** User = 2, CoffeeShop = 5.
4. **`npx vitest run src/test/env-guard.test.ts`:** EXIT 0 — 1 passed, mencetak `[test-env] DB host: ep-xxxx-pooler.c-3.ap-southeast-1.aws.neon.tech`.

### Catatan:
- Semua script sementara dihapus setelah dipakai. Tidak ada password/connection string utuh yang ditampilkan (hanya host & nama database).
- `.env.test` kini menunjuk branch `test` (`ep-xxxx`), berbeda dari entri sebelumnya (`ep-xxxx-test`) karena kredensial/branch diperbarui.

---

## 2026-10-14 - Test Mandiri (Self-Cleaning) + Perbaikan 2 Test Gagal

**Aktivitas:** Memperbaiki 2 test backend yang gagal (login admin 401 karena `admin@ngopijember.test` tidak ada di DB test) dengan membuat test bersifat mandiri (membuat dan menghapus data sendiri).

### File Dibuat/Diubah
| File | Jenis | Deskripsi |
|------|-------|-----------|
| `backend/src/test/helpers.ts` | **Baru** | `createTestAdmin()` (buat user ADMIN via Prisma, password di-hash `hashPassword`, email unik `<...>@ngopijember.test`), `deleteTestUser(email)` (guard hanya email test), `deleteTestUsers()`, `isTestEmail()` |
| `backend/src/audit.test.ts` | Diubah | `beforeAll` create admin, `afterAll` cleanup (try/catch), kredensial dari helper; email user/owner unik + di-track untuk dibersihkan |
| `backend/src/comprehensive-audit.test.ts` | Diubah | Sama + timeout 10s pada test upload Cloudinary (tidak melemahkan assertion) |
| `backend/src/app.test.ts` | Diubah | Tambah `afterAll` cleanup owner test yang dibuat |

### Hasil Verifikasi
- `npm run check` (tsc): ✅ bersih (0 error)
- `npx vitest run` run #1: ✅ **12/12 passed** (4 files), 11.78s
- `npx vitest run` run #2: ✅ **12/12 passed** (4 files), 12.42s (idempoten, tanpa bentrok)
- Host test: `ep-xxxx` (bukan DB utama) ✅
- Row count DB test sesudah: **User = 2, CoffeeShop = 5** ✅ (kembali ke baseline)
- File temp dibersihkan: `backend/check-db.ts`, `backend/check-db.js`, `backend/check-menu.js`, `_tmp-*.ts`

---

## 2026-10-14 - Update Dokumentasi (README.md & AGENTS.md)

**Aktivitas:** Melengkapi dokumentasi sesuai kondisi operasional terbaru.

### README.md
- Tabel environment variables lengkap (17 baris: `DATABASE_URL`, `DIRECT_URL`, `PORT`, `CLIENT_URL`, `NODE_ENV`, `JWT_SECRET`, `CLOUDINARY_*`, `SEED_ADMIN_*`, `SEED_OWNER_*`, `ADMIN_*`) dengan kolom wajib/opsional — semua placeholder.
- Seksi **Database (Neon)**: perbedaan `DATABASE_URL` (pooled, `-pooler`, `pgbouncer=true`, runtime) vs `DIRECT_URL` (direct, untuk migrate), contoh format, keduanya harus ke DB yang sama.
- Seksi **Seed & Maintenance**: `prisma:seed`, `prisma:seed:prod`, `prisma:reset` (preview/`--confirm`), `prisma:cleanup-test` (preview/`--confirm`), format `coffee-shops.csv`.
- Seksi **Testing**: wajib `.env.test` branch test, guard `setup-env.ts`, test mandiri.

### AGENTS.md
- Pertahankan aturan lama (test hanya ke branch test).
- Tambahan: larangan menampilkan password/connection string utuh, preview dulu sebelum `--confirm`, larangan edit `.env*`, ringkasan `DATABASE_URL` vs `DIRECT_URL`.

---

## 2026-10-14 - Script Update Coffee Shop (`prisma:update-shops`)

**Aktivitas:** Membuat script UPDATE data coffee shop berbasis CSV (preview default + `--apply`).

### File Dibuat/Diubah
| File | Jenis | Deskripsi |
|------|-------|-----------|
| `backend/prisma/update-coffee-shops.ts` | **Baru** | Script update: baca `coffee-shop-updates.csv` (csv-parse), validasi, preview default, `--apply` dalam satu `prisma.$transaction` |
| `backend/prisma/data/coffee-shop-updates.csv` | **Baru** | Template header + 5 slug (perasa/semeru/888/namu/hiro), kolom lain kosong; tidak ter-ignore git |
| `backend/package.json` | Diubah | Tambah script `"prisma:update-shops": "tsx prisma/update-coffee-shops.ts"` |

### Aturan yang Diimplementasikan
1. **Sel kosong = jangan ubah** field (tidak menimpa dengan kosong/null).
2. **lat/long** dibaca sebagai string; <5 desimal → WARNING "presisi rendah"; di luar kisaran Jember (lat -8.6..-7.8, lng 113.2..114.2) → WARNING; hanya salah satu diisi → **error, baris ditolak**.
3. **instagram**: buang `@`; **phone**: buang spasi/`-`/`+`, awalan `0` → `62`.
4. **facilities/categories**: pemisah `|`, nama harus persis sama `seed.ts`; tidak cocok → error (baris + nama), berhenti SEBELUM menulis; non-kosong → ganti seluruh relasi; kosong → relasi lama tidak disentuh.
5. **slug** harus ada di DB (tidak buat baru).
6. Hanya ubah field yang diizinkan (tidak sentuh ownerId/status/isVerified/isFeatured/Review/Menu).
7. Preview & apply hanya mencetak host DB (password/connection string TIDAK pernah dicetak).
8. `--apply` membungkus semua update dalam satu transaction, lalu cetak jumlah coffee shop yang diupdate.

### Cara Pakai
```bash
cd backend
npm run prisma:update-shops            # preview (default, tidak menulis)
npm run prisma:update-shops -- --apply # terapkan
```

### Verifikasi
- `npm run check` (tsc): ✅ bersih (exit 0).
- Type-check terpisah `prisma/update-coffee-shops.ts`: ✅ exit 0 (karena `tsconfig` hanya `include` `src/**`).
- `git check-ignore`: CSV update ✅ **tidak** ter-ignore.
- Script **tidak** dijalankan ke database apa pun (sesuai batasan); tidak ada data coffee shop yang dikarang.

---

## 2026-10-14 - Audit Read-Only Sebelum Commit (Root package.json, Secret, Email, Remote)

**Aktivitas:** Audit read-only (tanpa `git add/commit/push`) untuk kesiapan commit.

### Hasil
1. **Root `package.json`**: ditambah script `"db:clean": "tsx prisma/clean-production.ts"`; `@prisma/client ^7.10.0` + `prisma ^7.10.0` ada di `devDependencies` root (tidak di-import kode aplikasi — hanya deklarasi; versi backend tetap `6.19.3`).
2. **Pencarian URL Neon** (`ep-xxxx|ep-xxxx|neon.tech`):
   - `README.md:80-81` (placeholder `ep-xxxx`).
   - `progres.md:109-110, 442-464` (riwayat host test — tanpa kredensial).
   - `docs/` & `.superpowers/`: tidak ditemukan.
3. **Pencarian email** di file target (domain saja, sebelum `@` disamarkan):
   - `progres.md:342-343` → domain `gmail.com` (email user DB test, bukan secret).
   - `README.md:80-81`, `docs/`, `.superpowers/` → placeholder (`yourdomain.com`, `example.com`).
   - Tidak ada email `@test.com`/`@ngopijember.test` di file target.
4. **`git log --oneline` (10 terakhir)**: `3181743 docs: add production deployment guide` … `de8703d Remove stray ts file`.
5. **Remote**: `origin https://github.com/nafisaqil24/ngopi-jember.git` (tanpa token).
6. **Keamanan**: `.env.test` & `.env*` ter-ignore; tidak ada secret asli di file non-`.env`; semua match `postgresql://`, `api_secret`, `JWT_SECRET=` hanya placeholder.

### Rekomendasi (belum dieksekusi)
- `backend/check-data.ts` kandidat hapus (skrip debug, tidak dirujuk).
- `.superpowers/` pertimbangkan ignore bila tidak ingin di-commit.
- Versi Prisma root (`7.10.0`) vs backend (`6.19.3`) → potensi kebingungan.
- `cleanup-test-data.ts` tidak memuat `.env.test` → berhati-hati agar tidak menyasar DB utama.

---

*Last updated: 2026-10-14 WIB*