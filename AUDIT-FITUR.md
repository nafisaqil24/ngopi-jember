# AUDIT FITUR NGOPI JEMBER

**Tanggal audit:** 28 Oktober 2026  
**Sifat:** audit read-only. Tidak ada file kode yang diubah/ditambah/dihapus. Satu-satunya file baru adalah laporan ini.  
**Lingkungan:** Windows, Node.js, repo `D:\projects\ngopi-jember`, branch `fitur-saw`, commit terakhir `13a79ff` (23 Oktober 2026).  
**Acuan PRD:** `PRD.md` yang ada adalah **v1.2 tanggal 16 Oktober 2026** (`PRD.md:3`), bukan v1.1. Riwayat v1.1 hanya disebut di `PRD.md:16`; tidak ada file PRD v1.1 terpisah di repo. Karena itu audit memakai PRD v1.2 + daftar fitur pada permintaan audit + `docs/PROGRESS.md`.  
**Acuan rancangan skripsi:** tidak ditemukan dokumen rancangan skripsi terpisah di repo. Yang tersedia hanya PRD, `docs/PROGRESS.md`, `progres.md`, `desain.md`, dan kode. Klaim “sesuai skripsi” karena itu hanya bisa diverifikasi terhadap PRD/log, bukan naskah skripsi.

> Catatan penting: `PRD.md` v1.2 justru mencantumkan “rekomendasi berbasis AI” sebagai **non-tujuan rilis 1.0** (`PRD.md:93`), sedangkan kode dan `docs/PROGRESS.md` memuat chatbot + SAW. Jadi chatbot/SAW **tidak bisa dinilai “sesuai PRD v1.2”**; keduanya dinilai terhadap `docs/PROGRESS.md` dan daftar fitur audit.

---

## 1. RINGKASAN EKSEKUTIF

Dari **47 sub-fitur** yang diperiksa: **13 ✅ lengkap**, **26 ⚠️ ada/berjalan tetapi bermasalah atau belum sesuai**, dan **8 ❌ belum ada/rusak**. Tidak ada sub-fitur yang saya beri ❓ di tabel; hal-hal yang tidak bisa dibuktikan dicatat terpisah di bagian 8.

Fondasi utama ada dan sebagian besar berjalan: direktori + detail, auth JWT/bcrypt, CRUD kedai/menu owner, verifikasi/featured/rating Google admin, SAW 4 kriteria, Haversine, chatbot, rate limit, dan single-service frontend. Test backend **110/110 lulus dua kali**; typecheck backend dan frontend lulus; lint frontend hanya warning.

Masalah terbesar: (1) CSP produksi memblokir Leaflet/OpenStreetMap/Nominatim sehingga peta dan pencarian lokasi owner/admin kemungkinan besar rusak di single-service; (2) UI daftar tidak punya pagination dan filter rating backend diterapkan setelah pagination; (3) chatbot `nearby` membuang filter fasilitas/harga/buka-sekarang; (4) beberapa gap PRD penting (moderasi ulasan, kategori oleh owner, kelola kategori/fasilitas admin); (5) test frontend gagal 1 dari 86.

Inti SAW **secara matematis benar** dan sudah saya hitung ulang manual; namun bobot default masih placeholder tanpa dasar survei, dan SAW hanya dipakai di jalur chatbot—bukan di `/nearby` atau daftar biasa. Chatbot baru diuji dengan LLM tiruan; belum ada uji akurasi dengan LLM/provider nyata.

---

## 2. HASIL TEST DAN PEMERIKSAAN

### 2.1 Guard database test

- `.env.test` ada.
- Guard aktif: `backend/src/test/setup-env.ts:8-15` mewajibkan `.env.test`, dan `:49-54` memblokir bila host `DATABASE_URL`/`DIRECT_URL` sama dengan `.env` utama.
- Hasil pemeriksaan host tanpa menampilkan connection string: `env_test_ada=True`, `main_host_present=True`, `test_host_present=True`, `host_sama=False`, `test_is_pooler=True`.
- Artinya test dijalankan ke host yang **berbeda** dari `.env` utama. Nama branch Neon secara literal tidak bisa dipastikan tanpa membuka connection string; yang terbukti hanya host berbeda. Tidak ada akses ke database utama, tidak ada migrate/seed/reset/cleanup.

### 2.2 Perintah dan hasil

| Perintah | Hasil |
|---|---|
| `cd backend; npm run check` (`tsc --noEmit`) | **Lulus**, exit 0 |
| `cd backend; npm test` (run 1) | **18 file, 110 test lulus**, 14,12 detik |
| `cd backend; npm test` (run 2) | **18 file, 110 test lulus**, 13,11 detik |
| `cd backend; npx vitest run src/analytics.test.ts` (3 kali) | **9/9 lulus** setiap run |
| `cd frontend; npx tsc --noEmit -p tsconfig.app.json` | **Lulus**, exit 0 |
| `cd frontend; npm test` | **11 file, 86 test: 85 lulus, 1 gagal** |
| `cd frontend; npm run lint` | **0 error, 10 warning** (react set-state-in-effect, exhaustive-deps, catch variable tak terpakai) |
| Build ulang | **Tidak dijalankan** karena batas audit; artifact `frontend/dist/index.html` sudah ada dan test SPA lulus |

**Test frontend yang gagal (bukan flaky, Reproducible):**

```text
FAIL src/components/admin/GoogleRatingPanel.test.tsx > formatGoogleRatingLabel
AssertionError: expected 'Rating per 22 Okt 2026 (150 ulasan)'
to contain 'Rating Google Maps, per'
  at GoogleRatingPanel.test.tsx:91
```

Penyebab: implementasi mengembalikan `Rating per ...` (`frontend/src/utils/rating.ts:17`), sedangkan test mengharapkan `Rating Google Maps, per ...` (`frontend/src/components/admin/GoogleRatingPanel.test.tsx:91`). Ini mismatch test vs kode, bukan kegagalan render panel.

**Catatan flaky `analytics.test.ts`:** riwayat di `docs/PROGRESS.md:76` menyebut pernah gagal 1 kali karena data slug/event tersisa di DB test bersama. Saat audit, 3 run terpisah dan 2 run full suite semuanya lulus; flaky **tidak tereproduksi**. Test ini masih rapuh karena memakai `>=` untuk sebagian count dan `toBe(1)` untuk total (`backend/src/analytics.test.ts:137-144`), sehingga bergantung pada kebersihan data test.

**Baseline dokumen tidak sinkron:** PRD v1.2 menulis 25 test (`PRD.md:455`), `docs/PROGRESS.md:82` menulis 76 test. Kondisi nyata saat audit: **110 test backend** dan **86 test frontend**.

---

## 3. PETA STRUKTUR, ROUTE, DAN ENDPOINT

### 3.1 Struktur

- `frontend/`: React 19, TypeScript, Vite, Tailwind 4, React Router 7 (`frontend/package.json`).
- `backend/`: Express 5, Prisma **6.19.3** (`backend/package.json:34,57`), PostgreSQL/Neon, JWT, bcrypt salt 12 (`backend/src/utils/password.ts:3`).
- Frontend memakai API, bukan `frontend/src/data.ts`; tidak ada import ke `data.ts` (hasil pencarian import kosong). `data.ts` adalah dead code.

### 3.2 Route frontend

| Route | Halaman | Proteksi |
|---|---|---|
| `/` | Home | publik |
| `/coffee-shops` | Explorer | publik |
| `/coffee-shops/:slug` | Detail | publik |
| `/login`, `/register` | Auth | publik |
| `/dashboard`, `/owner/dashboard` | Dashboard owner | `PrivateRoute` role OWNER (`frontend/src/App.tsx:44-59`) |
| `/admin/dashboard` | Dashboard admin | `PrivateRoute` role ADMIN (`App.tsx:60-67`) |
| `/admin/coffee-shops/:id/edit` | Edit kedai admin | `PrivateRoute` role ADMIN (`App.tsx:68-75`) |
| `*` | NotFound | publik |

Tidak ada route khusus USER. Chat widget hanya tampil di `/`, `/coffee-shops`, dan `/coffee-shops/:slug` (`frontend/src/App.tsx:17,32-34,78`).

### 3.3 Endpoint backend

| Area | Endpoint |
|---|---|
| Publik | `GET /api/health`, `GET /api/coffee-shops`, `GET /api/coffee-shops/nearby`, `GET /api/coffee-shops/:slug`, `GET /api/categories`, `GET /api/facilities`, `GET /uploads/*`, `POST /api/coffee-shops/:id/events`, `POST /api/chat` |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Owner | `GET /api/owner/coffee-shop`, `GET /api/owner/analytics` |
| Admin | `GET /api/admin/coffee-shops`, `GET /api/admin/coffee-shops/:id`, `PATCH .../verify`, `PATCH .../featured`, `PATCH .../google-rating`, `DELETE .../:id`, `GET /api/admin/users`, `PATCH /api/admin/users/:id/role`, `DELETE /api/admin/users/:id` |
| Kedai (owner/admin) | `POST /api/coffee-shops`, `PUT /api/coffee-shops/:id`, `DELETE /api/coffee-shops/:id`, `PUT /api/coffee-shops/:id/taxonomy` |
| Menu | `GET /api/coffee-shops/:coffeeShopId/menus`, `POST .../menus`, `PUT .../menus/:menuId`, `DELETE .../menus/:menuId` |
| Ulasan | `POST /api/coffee-shops/:coffeeShopId/reviews` |

Bukti route: `backend/src/app.ts:67-78`, `backend/src/routes/*.ts`, `backend/src/chat/chat.routes.ts:31`.

---

## 4. TABEL STATUS FITUR

Legenda: ✅ lengkap; ⚠️ ada/berjalan tetapi bermasalah atau belum sesuai; ❌ belum ada/rusak.

| Fitur | Ada | Jalan | Sesuai PRD/Skripsi | Status | Bukti (file:baris) |
|---|---|---|---|---|---|
| A1. Daftar kedai + pagination backend | Ya | Ya | Sebagian | ⚠️ | `backend/src/routes/coffee-shop.routes.ts:185-215`; `limit` maks 50 di `:24-25` |
| A2. Pagination di UI daftar | Tidak | — | Tidak | ⚠️ | `frontend/src/pages/CoffeeShopExplorer.tsx:140-149` tidak mengirim `page/limit`; service mendukung (`frontend/src/services/coffeeShop.ts:97-98`) |
| A3. Pencarian teks nama/alamat | Ya | Sebagian | Tidak | ⚠️ | `coffee-shop.routes.ts:192` hanya `name`/`district`, bukan `address`; UI `CoffeeShopExplorer.tsx:140-145` |
| A4. Filter kategori/fasilitas/harga/buka sekarang | Sebagian | Sebagian | Tidak | ⚠️ | Hanya facility di `coffee-shop.routes.ts:195`; UI `CoffeeShopExplorer.tsx:273-286`; tidak ada kategori/harga/openNow |
| A5. Urutan/ranking daftar | Sebagian | Sebagian | Tidak | ⚠️ | `sort=rating` ada di enum `:23` tetapi tidak diimplementasikan di `:198-203`; UI hanya sort lokal `CoffeeShopExplorer.tsx:151-155` |
| A6. Detail: info, jam, fasilitas, kategori, menu, ulasan | Ya | Ya | Sebagian | ⚠️ | `CoffeeShopDetail.tsx:226-230` hanya kategori pertama; jam `:261-263`; fasilitas `:344-362`; menu `:366-409`; ulasan `:411-485` |
| A7. Galeri foto | Tidak | — | Tidak | ❌ | Hanya `shop.images?.[0]` (`CoffeeShopDetail.tsx:322-326`); gambar lain tidak dirender |
| A8. WhatsApp dari kolom phone | Ya | Sebagian | Tidak | ⚠️ | `CoffeeShopDetail.tsx:112-115,277-288`; nomor `08...` tidak dikonversi ke `62...`; nomor tanpa digit menghasilkan `https://wa.me/` |
| A9. Peta/koordinat | Ya | Sebagian | Sebagian | ⚠️ | `CoffeeShopDetail.tsx:105-110` hanya tautan Maps, bukan peta embed; koordinat `0` dianggap kosong karena truthiness |
| A10. Promosi | Tidak | — | Tidak | ❌ | API detail mengirim `promotions` (`coffee-shop.routes.ts:283`), tetapi halaman detail tidak merendernya |
| A11. Mode terdekat/GPS | Ya | Ya | Sebagian | ⚠️ | `CoffeeShopExplorer.tsx:157-195,320-346`; backend skor gabungan `coffee-shop.routes.ts:252-262`; UI menyebut “Rating & Jarak” |
| B1. Register/login/JWT/bcrypt | Ya | Ya | Ya | ✅ | `auth.routes.ts:40-68`; `password.ts:3-5`; `jwt.ts:12-13`; test `audit.test.ts:40-60` |
| B2. Logout/session/token | Ya | Sebagian | Tidak | ⚠️ | Logout hanya hapus localStorage (`useAuth.ts:54-62`, `Navbar.tsx:27-30`); JWT 7 hari tanpa pencabutan (`jwt.ts:12-13`) |
| B3. Proteksi endpoint per role | Ya | Ya | Ya | ✅ | `middleware/auth.ts:7-25`; admin/owner router `admin.routes.ts:10`, `owner.routes.ts:13`; test 401/403 `audit.test.ts:32-60` |
| B4. Proteksi halaman/PrivateRoute | Ya | Sebagian | Sebagian | ⚠️ | `PrivateRoute.tsx:27-35`; status role dari localStorage (`useAuth.ts:64`); ADMIN diarahkan ke `/` (`AuthForm.tsx:84-88`) |
| B5. Larangan ulasan kedai sendiri | Tidak | — | Tidak | ❌ | `review.routes.ts:18` mengizinkan OWNER/ADMIN tanpa cek kepemilikan; PRD menyarankan tidak (`PRD.md:158`) |
| C1. Tulis ulasan + rating + unique + rata-rata | Ya | Ya | Ya | ✅ | `review.routes.ts:8-11,33-55`; `utils/rating.ts:34-47`; unik `schema.prisma:123` |
| C2. Edit/hapus ulasan sendiri + moderasi admin | Sebagian | Sebagian | Tidak | ❌ | Hanya `POST` upsert (`review.routes.ts:18-59`); tidak ada DELETE; admin tidak punya endpoint ulasan (`admin.routes.ts` tidak memuat review) |
| C3. Rating Google khusus ADMIN | Ya | Ya | Ya (permintaan audit) | ✅ | `admin.routes.ts:10,144-195`; test `google-rating.test.ts:91-161` |
| C4. Rating efektif Google vs sistem + rating kosong SAW | Ya | Ya | Ya | ✅ | `utils/rating.ts:22-31`; `search.service.ts:145,172,222`; `saw.service.ts:175-184`; `saw.test.ts:97-119`; `google-rating.test.ts:163-177` |
| D1. CRUD kedai OWNER | Ya | Ya | Sebagian | ⚠️ | `coffee-shop.routes.ts:318-376`; `owner/Dashboard.tsx:214-305`; `findFirst` tanpa orderBy `owner.routes.ts:23,67` |
| D2. Validasi form + upload gambar OWNER | Ya | Sebagian | Sebagian | ⚠️ | Backend description min 10, price/hours wajib, koordinat berpasangan `coffee-shop.routes.ts:87-104`; upload `upload.ts:43-71`; UI memaksa koordinat `owner/Dashboard.tsx:206-209,258-261` |
| D3. Kategori dan fasilitas OWNER | Sebagian | Sebagian | Tidak | ❌ | Owner hanya memilih fasilitas (`owner/Dashboard.tsx:497-521`); tidak ada kategori; backend mendukung `categoryIds` (`coffee-shop.routes.ts:106-109`) |
| D4. Menu CRUD OWNER | Ya | Ya | Ya | ✅ | `menu.routes.ts:47-104`; `owner/Dashboard.tsx:307-394` |
| D5. Analytics OWNER | Ya | Ya | Sebagian | ⚠️ | `owner.routes.ts:67-103`; UI `owner/Dashboard.tsx:906-957`; `findFirst` tanpa orderBy dan rating analytics hanya ulasan internal |
| D6. Status verifikasi tampil | Ya | Ya | Ya | ✅ | `owner/Dashboard.tsx:647-663`; `AdminDashboard.tsx:239-252` |
| E1. Kelola kedai ADMIN | Ya | Ya | Sebagian | ⚠️ | Verifikasi/featured/edit/delete `admin.routes.ts:50-213`; UI `AdminDashboard.tsx:123-319`; tidak ada tombol/endpoint create khusus admin di UI |
| E2. Kelola user ADMIN | Ya | Ya | Sebagian | ⚠️ | `admin.routes.ts:215-278`; UI `AdminDashboard.tsx:342-391`; tidak ada guard self-demote/self-delete/admin terakhir |
| E3. Moderasi ulasan + CRUD kategori/fasilitas + statistik/audit admin | Tidak | — | Tidak | ❌ | Tidak ada endpoint review di `admin.routes.ts`; referensi hanya GET (`reference.routes.ts:6-11`); tab admin hanya kedai/user (`AdminDashboard.tsx:26,142-161`) |
| F1. SAW 4 kriteria + normalisasi + data kosong | Ya | Ya | Ya | ✅ | `saw.service.ts:123-271`; kriteria/tipe di `:4-9,226-248`; test `saw.test.ts:78-119` |
| F2. Hitung manual + prioritas/bobot | Ya | Ya | Ya | ✅ | Manual audit: A distance 4/price 30000/rating 4/facility 2; B 2/20000/5/4 → B 1.0000, A 0.6317 (output fungsi sama); `saw.service.ts:48-107`; `saw.test.ts:16-49` |
| F3. Dasar bobot default | Ya | Ya | Tidak | ⚠️ | `DEFAULT_WEIGHTS` 0.30/0.25/0.30/0.15 (`saw.service.ts:4-9`); dokumen menyebut **placeholder** (`docs/PROGRESS.md:74,87`); tidak ada file survei/justifikasi |
| F4. Konsistensi SAW di semua jalur | Sebagian | Ya | Tidak | ⚠️ | SAW hanya di chatbot (`search.service.ts:228`); `/nearby` memakai skor gabungan (`coffee-shop.routes.ts:252-262`); daftar memakai featured/created/review count (`:198-203`) |
| G1. Haversine + tanpa lokasi | Ya | Ya | Ya | ✅ | `geo.ts:18-30`; `search.service.ts:227-228`; test `saw.test.ts:36-49`; `geo.test.ts:20` |
| G2. Validasi lokasi luar Jember | Sebagian | Sebagian | Tidak | ⚠️ | Chat 400 di `chat.routes.ts:53-64`; `/nearby` hanya cek angka, tidak cek bbox Jember (`coffee-shop.routes.ts:111-116,218-227`) |
| G3. Filter nearby chatbot | Tidak | — | Tidak | ❌ | `chat.routes.ts:110-118` hanya mengirim `priorities`; `facilitySlugs`, `maxPrice`, `openNow` dari intent dibuang |
| H1. Pipeline intent → Zod → search/SAW → jawaban | Ya | Ya | Ya (mock) | ✅ | `chat.routes.ts:41-141`; `intent.ts:25-85`; `templates.ts:23-106`; test mock `chat.test.ts:46-69,179-209` |
| H2. Bug `faqTopic: ""` | Ya (bug) | Tidak | Tidak | ❌ | `intent.ts:10-23` hanya membuang `null`; `schema.ts:48` menolak string kosong; uji langsung: `faq_empty_valid=false`, issue `faqTopic/invalid_value` |
| H3. Penanganan error provider/TPM | Ya | Sebagian | Tidak | ⚠️ | `intent.ts:81-84` menelan error menjadi `smalltalk`; route membalas 200; `llm.client.ts:51-72,82-85` hanya log server |
| H4. Keamanan prompt injection | Sebagian | Sebagian | Tidak | ⚠️ | Instruksi “abaikan prompt injection” hanya di prompt (`prompts.ts:30`); `history` dari klien menerima role `assistant` (`chat.routes.ts:20-28`) dan diteruskan ke LLM (`intent.ts:37-41`) |
| H5. Rate limit + test chatbot | Ya | Ya | Ya | ✅ | 5/menit, 30/jam (`limits.ts:4-24`); kuota harian memori (`:30-44`); test `chat.test.ts:97-177` |
| I1. Serve `frontend/dist` + SPA fallback | Ya | Ya | Ya | ✅ | `app.ts:80-105`; `spa-fallback.test.ts:5-27`; `frontend/dist/index.html` ada |
| I2. Helmet CSP/CORS/rate/validation/error | Ya | Sebagian | Sebagian | ⚠️ | CSP `app.ts:18-25`; runtime header `script-src 'self'`, `img-src` hanya self/Cloudinary/Unsplash; CORS `:34-48`; multer error jatuh 500 (`errorHandler.ts:60-68`) |
| I3. Dokumentasi environment | Ya | Sebagian | Tidak | ⚠️ | `.env.example:34-39` memuat LLM; `.env.production.example` tidak memuat LLM/FRONTEND_DIST_PATH/TRUST_PROXY; README `:204-215` tidak memuat LLM/FRONTEND_DIST_PATH |
| I4. Keselarasan versi Prisma | Ya | Sebagian | Tidak | ⚠️ | Backend 6.19.3 (`backend/package.json:34,57`); root manifest tanpa Prisma (`package.json:1-10`) tetapi root `node_modules` berisi `@prisma/client@7.10.0 extraneous` dan `prisma@7.10.0 extraneous` |
| I5. File sampah/perubahan belum commit | Ya | — | Tidak | ⚠️ | `backend/check-data.js`, `backend/verify-csv.js` tak dirujuk; `frontend/src/data.ts` dead code; 16 file modified + 3 untracked (`git status`) |
| I6. Responsif/loading/empty/error/SEO | Ya | Sebagian | Sebagian | ⚠️ | Skeleton/empty/error ada (`Home.tsx:67-81`, `CoffeeShopExplorer.tsx:349-358`, `CoffeeShopDetail.tsx:194-208`); error tanpa retry; detail error jaringan jadi 404; metadata SEO per halaman tidak ada (`index.html:7-16`) |

**Rekap status tabel:** 13 ✅, 26 ⚠️, 8 ❌, 0 ❓.

---

## 5. DETAIL MASALAH

### 5.1 Kritis

**K-1. CSP produksi memblokir peta dan pencarian lokasi owner/admin.**
- Lokasi: `backend/src/app.ts:18-25`; `frontend/index.html:14-15`; `frontend/src/components/common/LocationPickerMap.tsx:25`; `frontend/src/pages/owner/Dashboard.tsx:111,135`; `frontend/src/pages/admin/CoffeeShopEdit.tsx:132`.
- Bukti runtime: header CSP dari `GET /api/health` berisi `script-src 'self'` dan `img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com`; tidak ada `unpkg.com`, `tile.openstreetmap.org`, atau `nominatim.openstreetmap.org`; `connect-src` tidak didefinisikan sehingga jatuh ke `default-src 'self'`.
- Dampak: pada deployment single-service, script Leaflet dari unpkg diblokir; tile OSM diblokir; `fetch` Nominatim diblokir. Peta bisa kosong dan pencarian alamat gagal, tepat saat owner diminta melengkapi koordinat/data asli.
- Saran (belum diterapkan): bundle Leaflet sebagai dependency, atau tambahkan host yang diperlukan ke `script-src`/`img-src`/`connect-src`; lebih aman proxy Nominatim dari backend.

**K-2. Pagination UI tidak ada dan filter rating diterapkan setelah pagination.**
- Lokasi: `frontend/src/pages/CoffeeShopExplorer.tsx:140-149`; `backend/src/routes/coffee-shop.routes.ts:205-214`.
- Dampak: UI hanya pernah menerima maksimal 12 kedai (default `limit=12`), jadi kedai ke-13 dan seterusnya tidak bisa ditemukan. `minRating` difilter setelah `skip/take`, sehingga halaman bisa kosong/lebih pendek meski ada kedai cocok di halaman berikutnya; `meta.total` juga tidak memperhitungkan filter rating. Target rilis 15 kedai membuat ini terasa.
- Saran: kirim `page/limit`, tampilkan kontrol pagination; pindahkan `minRating` ke `where` Prisma dan hitung `total` dengan filter yang sama.

### 5.2 Sedang

**S-1. Chatbot `nearby` mengabaikan filter intent.**
- Lokasi: `backend/src/chat/chat.routes.ts:110-118`.
- Dampak: pengguna yang minta “dekat sini, ada WiFi, murah, buka sekarang” akan mendapat rekomendasi tanpa filter fasilitas/harga/buka. Ini juga membuat perilaku `search_shops` dan `nearby` tidak konsisten.
- Saran: teruskan `filters` yang sama seperti cabang `search_shops`, tambahkan test integrasi untuk nearby + filter.

**S-2. Tautan WhatsApp rusak untuk format nomor umum.**
- Lokasi: `frontend/src/pages/CoffeeShopDetail.tsx:112-115,277-288`.
- Dampak: `0812...` menjadi `https://wa.me/0812...` (wa.me butuh kode negara), dan nomor tanpa digit menjadi `https://wa.me/` tetapi tombol tetap tampil. Phone kosong/null memang aman karena tombol disembunyikan; yang bermasalah adalah nomor tidak valid.
- Saran: normalisasi `0` → `62`, validasi 9–15 digit, sembunyikan tombol bila tidak valid.

**S-3. `faqTopic: ""` masih menjatuhkan intent FAQ ke smalltalk.**
- Lokasi: `backend/src/chat/intent.ts:10-23,59-64`; `backend/src/chat/schema.ts:48`.
- Bukti langsung: `parsedIntentSchema.safeParse({intent:'faq', faqTopic:''})` → `success=false`, issue `faqTopic/invalid_value`. Karena `stripNullKeys` hanya membuang `null`, string kosong tetap lolos ke Zod dan seluruh intent dibuang.
- Dampak: pertanyaan FAQ yang diekstrak LLM dengan topik kosong dijawab sapaan generik, bukan jawaban FAQ.
- Saran: buang string kosong (dan trim) sebelum validasi, atau ubah skema agar `""` dinormalisasi ke `undefined`; tambahkan test.

**S-4. Error provider LLM (mis. rate limit TPM) jatuh diam-diam ke smalltalk.**
- Lokasi: `backend/src/chat/intent.ts:81-84`; `backend/src/chat/llm.client.ts:51-72,82-85`.
- Dampak: saat Groq membalas 429/TPM, pengguna menerima sapaan “Halo! Ada yang bisa saya bantu...” seolah tidak terjadi masalah. Tidak ada pesan “coba lagi” yang jelas dan tidak ada test perilaku ini.
- Saran: bedakan error provider dari intent kecil; kembalikan pesan ramah “layanan sedang sibuk” dengan status yang sesuai, dan tambahkan test 429/timeout.

**S-5. Token JWT 7 hari, role tidak dicek ulang, logout tidak mencabut token.**
- Lokasi: `backend/src/utils/jwt.ts:12-13`; `backend/src/middleware/auth.ts:7-17`; `frontend/src/hooks/useAuth.ts:54-62`; `backend/src/routes/admin.routes.ts:236-278`.
- Dampak: admin yang di-demote atau user yang dihapus tetap memegang role lama sampai token kedaluwarsa (hingga 7 hari). Logout hanya menghapus token di browser; token yang dicuri tetap valid.
- Saran: cek role/user ke DB pada operasi sensitif atau perpendek umur token + refresh; sediakan mekanisme revoke/version.

**S-6. Gap CRUD/moderasi di dashboard.**
- Lokasi: owner kategori tidak ada (`frontend/src/pages/owner/Dashboard.tsx:497-521`); admin tidak punya moderasi ulasan/kategori/fasilitas/statistik (`backend/src/routes/admin.routes.ts`; tab admin `frontend/src/pages/AdminDashboard.tsx:26,142-161`); admin tidak punya tombol create kedai di UI.
- Dampak: PRD FR-42/FR-53/FR-55/FR-56/FR-57 belum terpenuhi; owner yang mendaftar sendiri tidak bisa mengisi kategori; ulasan bermasalah tidak bisa dihapus admin.
- Saran: tambahkan pemilihan kategori di form owner, tab moderasi ulasan + endpoint DELETE, CRUD referensi, dan create shop admin.

**S-7. Analytics owner nondeterministik dan sumber rating tidak konsisten.**
- Lokasi: `backend/src/routes/owner.routes.ts:23,67` (`findFirst` tanpa `orderBy`); `:77-81,100-101` (rating hanya ulasan internal); `frontend/src/pages/owner/Dashboard.tsx:948-957`.
- Dampak: jika satu owner punya lebih dari satu kedai (tidak dicegah schema/endpoint), dashboard/analytics bisa menampilkan kedai berbeda secara acak. Kedai dengan rating Google bisa tampil “0 ulasan/0.0” di analytics karena analytics tidak memakai rating efektif.
- Saran: batasi satu kedai per owner atau pilih `orderBy: { createdAt: 'asc' }` secara eksplisit; gunakan rating efektif yang sama dengan profil.

**S-8. Rating kosong tampil 0.0; status CLOSED diabaikan bila jam valid; parser jam backend tidak menerima format titik.**
- Lokasi: `frontend/src/pages/Home.tsx:20`; `frontend/src/pages/CoffeeShopDetail.tsx:212`; `frontend/src/components/coffeeshop/CoffeeShopCard.tsx:62`; `frontend/src/utils/openStatus.ts:40-51`; `backend/src/chat/parsers.ts:62-65`.
- Dampak: kedai tanpa rating terlihat punya rating 0.0 (PRD meminta label “Belum ada rating”); kedai `TEMPORARILY_CLOSED` dengan jam valid bisa berbadge “Buka”; data jam `08.00-22.00` dikenali frontend tetapi tidak dikenali parser chatbot (menjadi `tidak_diketahui`).
- Saran: tampilkan “Belum ada rating” bila null; status CLOSED/TEMPORARILY_CLOSED harus menang; normalisasi titik ke titik dua di parser backend.

**S-9. SAW tidak konsisten di semua jalur.**
- Lokasi: SAW `backend/src/chat/search.service.ts:228`; `/nearby` `backend/src/routes/coffee-shop.routes.ts:252-262`; daftar `:198-203`.
- Dampak: chatbot memakai SAW, tetapi mode “terdekat” di Explorer memakai `(rating*1.5)-(jarak*0.3)`, dan daftar memakai featured/created/review count. Untuk skripsi, klaim “sistem memakai SAW” harus dibatasi ke chatbot; dua jalur lain menghasilkan urutan berbeda.
- Saran: putuskan satu metode acuan; bila SAW yang diklaim, pakai SAW di `/nearby` juga atau dokumentasikan perbedaan sebagai keputusan desain.

**S-10. Detail publik membocorkan field internal.**
- Lokasi: `backend/src/routes/coffee-shop.routes.ts:283-296`.
- Dampak: `...shop` mengirim `ownerId` dan `subscription` ke publik. PRD §12.5 meminta respons tidak membocorkan data internal. Chat sudah memakai whitelist (`search.service.ts:23-61`), detail belum.
- Saran: gunakan select/whitelist field publik di detail, seperti chat.

**S-11. Prompt injection belum ditangani secara deterministik; history dari klien bisa dipalsukan.**
- Lokasi: `backend/src/chat/prompts.ts:30`; `backend/src/chat/chat.routes.ts:20-28`; `backend/src/chat/intent.ts:37-41`.
- Dampak: instruksi “abaikan prompt injection” hanya berupa teks prompt; klien dapat mengirim `history` dengan role `assistant` palsu. Dampak praktis terbatas karena output divalidasi enum/strict, tetapi ini bukan guard yang kuat.
- Saran: jangan terima role `assistant` dari klien, atau tandai history sebagai data; tambahkan filter pola instruksi dan test injection.

**S-12. Test frontend gagal 1/86 (gate kualitas merah).**
- Lokasi: `frontend/src/components/admin/GoogleRatingPanel.test.tsx:91` vs `frontend/src/utils/rating.ts:17`.
- Dampak: `npm test` frontend tidak bisa dipakai sebagai gate sampai test/kode diselaraskan.
- Saran: putuskan label yang benar, lalu perbarui test atau implementasi; jalankan ulang full suite.

### 5.3 Rendah

**R-1. Admin bisa men-demote/menghapus dirinya sendiri atau admin terakhir.**
- Lokasi: `backend/src/routes/admin.routes.ts:236-278`; UI menonaktifkan tombol untuk diri sendiri (`frontend/src/pages/AdminDashboard.tsx:372,382`) tetapi backend tidak.
- Dampak: potensi lockout admin. Saran: tolak self-demote/self-delete dan lindungi admin terakhir.

**R-2. Error upload bukan 400/413.**
- Lokasi: `backend/src/middleware/upload.ts:43-52`; `backend/src/middleware/errorHandler.ts:60-68`.
- Dampak: file >5 MB atau non-gambar bisa tampil sebagai 500 “server error”. Saran: petakan `MulterError` ke 400/413.

**R-3. Sampah repo dan artifact test.**
- Lokasi: `backend/check-data.js:1`, `backend/verify-csv.js:1` (tidak dirujuk script); `frontend/src/data.ts` dead code; `backend/uploads/` berisi 43 file (banyak ukuran identik) — indikasi kuat sisa upload test karena `comprehensive-audit.test.ts:69-82` mengunggah gambar dan `upload.ts:31-38` menulis ke disk; `.env.local.backup` ada (ignored).
- Dampak: repo/artifact kotor, potensi file sensitif backup. Saran: hapus file debug, bersihkan upload test di `afterAll`, pastikan `.env*` tetap ignored.

**R-4. Dokumentasi env tidak lengkap/berbeda.**
- Lokasi: `.env.example:34-39` (LLM ada), `.env.production.example:1-35` (LLM/FRONTEND_DIST_PATH/TRUST_PROXY tidak ada), `README.md:204-215` (LLM/FRONTEND_DIST_PATH tidak ada), `frontend/.env.example` hanya `VITE_API_URL` sedangkan `auth.ts:1`/`admin.ts:1` juga membaca `VITE_API_BASE_URL`.
- Dampak: deploy bisa lupa LLM atau memakai base API berbeda. Saran: satukan daftar variabel dan contoh.

**R-5. Prisma root 7.10.0 extraneous.**
- Lokasi: `package.json:1-10` tidak mendeklarasikan Prisma; `npm ls` menunjukkan `@prisma/client@7.10.0 extraneous` dan `prisma@7.10.0 extraneous` di root; backend 6.19.3 (`backend/package.json:34,57`).
- Dampak: risiko tooling root menjalankan Prisma 7 terhadap schema 6.19.3. Saran: hapus `node_modules` Prisma root atau samakan versi.

**R-6. Error/empty state belum konsisten dan SEO belum ada.**
- Lokasi: `CoffeeShopDetail.tsx:169-179,208` (error jaringan jadi 404), `CoffeeShopExplorer.tsx:137-149` (tanpa debounce/abort), `frontend/index.html:7-16` (metadata generik).
- Dampak: UX error/retry kurang, hasil pencarian bisa tertukar, SEO per halaman tidak ada. Saran: gunakan `ErrorState`/`EmptyState`, tambah retry/debounce, metadata per halaman.

**R-7. Rate limit pembuatan ulasan belum ada.**
- Lokasi: `backend/src/routes/review.routes.ts:18`.
- Dampak: spam ulasan masih mungkin meski unik per user/kedai; PRD §13 menyebut rate limit ulasan “Sebagian”. Saran: tambahkan limiter khusus review.

---

## 6. GAP TERHADAP PRD

### 6.1 Ada di PRD, belum/tidak lengkap di kode

| PRD | Kondisi | Bukti |
|---|---|---|
| FR-03 pencarian nama **atau alamat** | Hanya nama/kecamatan | `coffee-shop.routes.ts:192` |
| FR-04 filter kecamatan/fasilitas/rating/featured | Ada, tetapi rating difilter setelah pagination; tidak ada kategori/harga/openNow | `coffee-shop.routes.ts:189-214`; `CoffeeShopExplorer.tsx:273-286` |
| FR-05 urutan terdekat/rating/terbaru | Terdekat via endpoint terpisah; `sort=rating` backend tidak diimplementasikan | `coffee-shop.routes.ts:198-203` |
| FR-08 empty/loading/error ramah | Skeleton/empty ada; error tanpa retry; detail error jaringan jadi 404 | `CoffeeShopDetail.tsx:169-179,208` |
| FR-09 state filter di query string | Hanya `q` dibaca sekali; filter lain tidak di URL | `CoffeeShopExplorer.tsx:114-119` |
| FR-11 placeholder “Belum tersedia” netral | Ditampilkan mentah | `CoffeeShopDetail.tsx:261-273` |
| FR-12 galeri/foto utama | Hanya cover pertama | `CoffeeShopDetail.tsx:322-326` |
| FR-15 peta + tombol Maps | Hanya tautan Maps; tidak ada peta embed; koordinat 0 fallback alamat | `CoffeeShopDetail.tsx:105-110` |
| FR-18 promosi | Tidak dirender | `coffee-shop.routes.ts:283`; halaman detail |
| FR-19 metadata SEO per halaman | Tidak ada | `frontend/index.html:7-16` |
| FR-32 edit/hapus ulasan sendiri | Edit lewat upsert; hapus tidak ada | `review.routes.ts:18-59` |
| FR-33 admin hapus ulasan | Tidak ada endpoint/UI | `admin.routes.ts` |
| FR-42 owner memilih kategori | Owner hanya fasilitas | `owner/Dashboard.tsx:497-521` |
| FR-46 kelola promosi | Tidak ada | — |
| FR-50/51/52/53 admin kedai | Verifikasi/featured/edit/delete ada; create di UI tidak ada | `AdminDashboard.tsx:123-319` |
| FR-55 moderasi ulasan | Tidak ada | `admin.routes.ts` |
| FR-56 kelola kategori/fasilitas | Hanya GET referensi | `reference.routes.ts:6-11` |
| FR-57 statistik platform | Tidak ada panel/endpoint agregat | `AdminDashboard.tsx:150,160` |
| FR-58 audit log admin | Tidak ada | — |

### 6.2 Ada di kode, tidak tercantum di PRD v1.2

- **Rating Google Maps admin** (`googleRating`, `googleReviewCount`, `googleRatingAt`) ada di `schema.prisma:40-42`, endpoint `admin.routes.ts:144-195`, UI `GoogleRatingPanel.tsx`, dan test `google-rating.test.ts`. Tidak ada di PRD v1.2.
- **Chatbot + SAW + prioritas LLM** ada di `backend/src/chat/*`, tetapi PRD v1.2 justru mengecualikan “rekomendasi berbasis AI” (`PRD.md:93`). Ini perlu diselaraskan dengan naskah skripsi.
- **Skrip data uji SAW** (`seed-uji.ts`, `cleanup-uji.ts`) dan data uji `uji-kopi-*` ada di repo; tidak dirinci di PRD v1.2.

### 6.3 Ketidaksinkronan dokumen

- PRD v1.2 menyebut 25 test (`PRD.md:455`), `docs/PROGRESS.md` menyebut 76, kondisi nyata 110 backend.
- `docs/PROGRESS.md:75` menyebut `.env.test` belum memuat variabel LLM; saat audit nama variabel `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `CHAT_DAILY_LIMIT` **ada** di `.env.test` (nilai tidak dibaca/ditampilkan). Status validitas key tidak diuji.
- PRD v1.2 menyebut root `package.json` memakai Prisma ^7.10.0 (`PRD.md:26`); manifest root saat ini tidak memuat Prisma, tetapi `node_modules` root masih berisi Prisma 7.10.0 extraneous.

---

## 7. KESIAPAN SIDANG SKRIPSI

### 7.1 SAW yang sudah bisa dibuktikan

- 4 kriteria dan tipe: jarak COST, harga COST, rating BENEFIT, fasilitas BENEFIT (`saw.service.ts:4-9,226-248`).
- Normalisasi cost `min/x`, benefit `x/max` (`:226-248`); data kosong: harga → max dataset, rating → 0, jarak → max dataset (`:141-172`); kriteria yang seluruhnya kosong dibuang dan bobot dinormalisasi ulang (`:174-186`; `saw.test.ts:97-119`).
- Prioritas `tinggi=2`, `normal=1`, `rendah=0.5`, lalu normalisasi total 1 (`saw.service.ts:11-15,75-106`; `saw.test.ts:16-34`).
- `sawScore`/`sawDetails` dikirim ke respons (`search.service.ts:237-242`).
- Rating Google dipakai sebagai rating efektif di SAW (`utils/rating.ts:22-31`; `search.service.ts:145,172,222`; `google-rating.test.ts:163-177`).
- Hitung manual audit (2 kedai): bobot default 0.30/0.25/0.30/0.15; A (jarak 4, harga 30.000, rating 4, fasilitas 2) = 0.6317; B (2, 20.000, 5, 4) = 1.0000. Output fungsi: B 1.0000, A 0.6317 — **cocok**.
- Tanpa lokasi: jarak dibuang, bobot menjadi harga 0.3571, rating 0.4286, fasilitas 0.2143 (`saw.test.ts:36-49`; `docs/PROGRESS.md:140`).

### 7.2 SAW yang belum siap dipertahankan di sidang

- **Dasar bobot**: masih placeholder (`saw.service.ts:4-9`; `docs/PROGRESS.md:74,87`); belum ada survei/jurnal/justifikasi angka di repo. Ini pertanyaan penguji yang paling mungkin.
- **Konsistensi klaim**: SAW hanya jalur chatbot; `/nearby` memakai skor gabungan dan daftar memakai featured/created/review count (`coffee-shop.routes.ts:198-203,252-262`). Jangan mengklaim “semua rekomendasi memakai SAW”.
- **Data real tipis**: PRD mencatat 5 kedai, sebagian `priceRange`/`openingHours` placeholder, fasilitas 0 (`PRD.md:494-508`); `kedai-real.csv` hanya 1 baris; DB utama tidak diaudit karena aturan. Uji SAW dengan data uji `uji-kopi-a..e` ada, tetapi bukan data produksi lengkap.
- **Kasus rating kosong semua**: terbukti di unit test, bukan pada dataset produksi nyata.
- **Tidak ada uji akurasi/peringkat SAW terhadap penilaian pakar**; belum ada metrik precision/recall atau korelasi ranking.

### 7.3 Chatbot yang sudah bisa dibuktikan

- Pipeline rate limit → validasi Zod → validasi Jember → cek LLM → kuota → intent → pencarian/SAW → template (`chat.routes.ts:31-141`).
- Intent `search_shops`, `nearby`, `shop_detail`, `faq`, `smalltalk`, `out_of_scope` ditangani di `templates.ts:30-105`.
- Pencarian + SAW + `sawScore`/`sawDetails` (`search.service.ts`), fallback bertahap (`:258-295`).
- Rate limit 5/menit, 30/jam, kuota harian; test 429/413/sensitive fields (`chat.test.ts:71-177`).
- Test intent null stripping dan strict schema (`intent.test.ts`), test SAW/parser/geo/search.

### 7.4 Chatbot yang belum siap dipertahankan di sidang

- **Belum ada uji dengan LLM/provider nyata** saat audit; test memakai `vi.spyOn(callLlmChat)` (`chat.test.ts:46-53`). `.env.test` punya nama variabel LLM, tetapi nilai/validitas dan kuota TPM tidak diuji.
- **Tidak ada dataset evaluasi intent/akurasi**: tidak ada metrik akurasi, precision, recall, atau confusion matrix.
- **Bug `faqTopic: ""`** masih ada; **error provider** jatuh ke smalltalk; **history assistant dari klien** bisa dipakai untuk prompt injection.
- **`nearby` mengabaikan filter**; ini bisa terlihat saat demo “dekat sini + WiFi + murah”.
- **Filter buka sekarang** bisa salah untuk format jam titik karena parser backend hanya mengenal `:` (`parsers.ts:62-65`), sedangkan form/CSV bisa memakai `08.00-22.00`.

---

## 8. HAL YANG TIDAK TERVERIFIKASI

1. **Isi database utama (`ep-soft-lake`)**: tidak dibuka/diquery sesuai aturan. Semua klaim data real berasal dari PRD/log/CSV, bukan verifikasi DB utama.
2. **Nama branch Neon “test”**: guard hanya membuktikan host `.env.test` berbeda dari `.env` utama; label branch tidak dibaca dari connection string.
3. **LLM provider nyata**: tidak ada panggilan LLM asli; nilai `LLM_MODEL`/key tidak ditampilkan; kualitas intent/akurasi belum diukur.
4. **Cloudinary produksi**: konfigurasi aktual tidak diperiksa; yang terbukti hanya kode fallback dan syarat env.
5. **Perilaku browser CSP**: header CSP sudah diverifikasi runtime, tetapi saya tidak membuka browser; kesimpulan blokir peta berasal dari header + URL eksternal yang dipakai kode.
6. **Nilai phone aktual**: tidak ada sampling data DB; yang terbukti adalah logika URL di frontend.
7. **Build ulang frontend/backend**: tidak dijalankan karena batas audit; `frontend/dist` sudah ada dan test SPA lulus.
8. **Apakah root Prisma 7.10.0 benar-benar dipakai**: `npm ls` menyebut extraneous dan manifest root tidak memuatnya; belum ada bukti script yang memakainya.
9. **Akurasi chatbot/SAW terhadap pakar**: tidak ada data evaluasi.

---

## 9. REKOMENDASI PRIORITAS (BELUM DITERAPKAN)

1. **Perbaiki CSP peta** (Leaflet/tile/Nominatim) atau bundle Leaflet + proxy geocoding. Ini menghambat owner mengisi koordinat di production.
2. **Perbaiki daftar**: pagination UI + pindahkan `minRating` ke query DB + implementasikan `sort=rating`/`sort=new` + teruskan `sort` dari UI.
3. **Perbaiki chatbot nearby**: teruskan `facilitySlugs`, `maxPrice`, `openNow`; tambah test integrasi nearby + filter.
4. **Perbaiki WhatsApp**: normalisasi `08` → `62`, validasi digit, sembunyikan tombol bila tidak valid; tambah test.
5. **Perbaiki SAW/chatbot**: buang string kosong sebelum Zod, tangani error provider dengan pesan jelas, batasi `history` role dari klien, tambah test `faqTopic:""` dan 429/timeout.
6. **Lengkapi gap PRD**: moderasi ulasan admin, kategori di form owner, create shop admin, CRUD kategori/fasilitas, statistik/audit log.
7. **Perbaiki keamanan/session**: cek role ke DB atau token pendek + refresh/revoke; lindungi self-demote/self-delete/last admin; whitelist field detail publik.
8. **Perbaiki konsistensi data/UX**: label “Belum ada rating”, status CLOSED menang, parser jam titik, `findFirst` + `orderBy`/unique owner, rating analytics memakai rating efektif.
9. **Stabilkan gate kualitas**: selaraskan test `formatGoogleRatingLabel`, isolasi data `analytics.test.ts`, update baseline test di PRD/PROGRESS, bersihkan upload test.
10. **Rapikan kesiapan rilis**: dokumentasikan `FRONTEND_DIST_PATH`/LLM/TRUST_PROXY di README dan contoh env, hapus `check-data.js`/`verify-csv.js`/`data.ts`, bereskan Prisma root extraneous, tambah uji LLM nyata + dataset akurasi chatbot.

---

## 10. CATATAN AKHIR

Audit berhenti di sini. Tidak ada perbaikan kode yang dilakukan. Semua perubahan kode yang terlihat di `git status` sudah ada sebelum audit (16 file modified + 3 untracked); laporan ini menambah satu file untracked, yaitu `AUDIT-FITUR.md`. Saya tidak melakukan commit/push/reset/stash dan tidak menyentuh database utama.