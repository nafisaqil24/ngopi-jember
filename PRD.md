# PRD Ngopi Jember

**Versi:** 1.2 (sinkron dengan `progres.md` s.d. 16 Oktober 2026) | **Tanggal:** 16 Oktober 2026 | **Status:** Draf untuk direview pemilik proyek | **Menggantikan:** v1.1

> Label yang dipakai: **\[Terkonfirmasi\]** = tercatat di log progres dengan bukti (output perintah atau hasil test). **\[Usulan\]** = rekomendasi yang butuh persetujuan pemilik proyek. **\[Perlu dicek\]** = harus diverifikasi langsung ke kode atau database sebelum dianggap final.

---

## 0. Catatan Versi dan Sinkronisasi

### 0.1 Riwayat versi

| Versi | Tanggal | Ringkasan |
| --- | --- | --- |
| 1.0 | Awal Okt 2026 | Draf dari ringkasan awal proyek |
| 1.1 | 15 Okt 2026 | Disesuaikan dengan log progres (test, Neon branch test, seed, skrip perawatan) |
| 1.2 | 15 Okt 2026 | Sinkron penuh PRD vs log (diperbarui 16 Okt: perbaikan gambar production, test jadi 25): angka test, status database, deployment single-service, utang teknis, risiko baru, Definition of Done bertingkat |

### 0.2 Ketidaksinkronan yang diperbaiki di v1.2

| No | Sebelumnya | Kondisi benar (sumber log) | Tindakan di v1.2 |
| --- | --- | --- | --- |
| 1 | Bagian 14 menyebut 59 test | 25 test lulus di 7 file (npm test, 16 Okt; sebelumnya 24 di 6 file). Angka 59 tidak pernah terverifikasi | Semua rujukan jadi 25 (per 16 Okt) |
| 2 | Bagian 5.1 menulis "Neon selesai", bagian 20 menulis migrasi belum jalan | Hanya **branch `test`** yang termigrasi (2 migrasi, schema up to date). `.env` utama per 13 Okt masih localhost dan belum punya `DIRECT_URL`. Koreksi 16 Okt: konsol Neon menunjukkan cabang produksi sudah termigrasi dan berisi 2 user, log 13 Okt hanya ketinggalan | Dipisah jelas: DB test = selesai, DB utama = **\[Perlu dicek\]** |
| 3 | Deployment disarankan terpisah (Vercel + Render) | Backend kini menyajikan `frontend/dist` (single-service) dengan SPA fallback dan override `FRONTEND_DIST_PATH` | Single-service jadi opsi utama, split jadi alternatif |
| 4 | Prisma dianggap seragam | Backend 6.19.3, tetapi `package.json` root punya `@prisma/client ^7.10.0` dan `prisma ^7.10.0` di devDependencies | Dicatat sebagai utang teknis (bagian 21) |
| 5 | Test dianggap stabil | `analytics.test.ts` sempat gagal 1 kali (flaky), lolos saat rerun | Dicatat sebagai risiko, ditambah target stabilisasi |
| 6 | `spa-fallback.test.ts` tidak disebut | Test itu bergantung pada `frontend/dist` yang sudah di-build; di fresh clone atau CI tanpa build bisa merah | Dicatat sebagai risiko dan perbaikan di bagian 14 |
| 7 | Data seed dianggap lengkap | 5 kedai asli di CSV, tetapi `priceRange` (Hiro, Namu) dan `openingHours` (Semeru) berisi placeholder "Belum tersedia"; koordinat dan kontak masih menunggu `coffee-shop-updates.csv` | Dicatat di bagian 15 dan persyaratan FR-11 |
| 8 | Hanya skrip seed dan reset | Ada 4 skrip perawatan: `prisma:seed`, `prisma:reset`, `prisma:cleanup-test`, `prisma:update-shops`, plus `db:clean` di root | Didokumentasikan di bagian 15 |
| 9 | Keamanan umum | Temuan audit`  13 Okt: .env punya CLIENT_URL ganda (sudah beres per 16 Okt) `, `cleanup-test-data.ts` tidak memuat `.env.test`, `progres.md` memuat host Neon test | Masuk daftar tindakan keamanan (bagian 13) |

### 0.3 Pembaruan 16 Oktober 2026

Entri log 16 Okt (01.07 WIB) memperbaiki gambar rusak di mode production dan mengubah beberapa angka di dokumen ini.

- **Diagnosa:** CSP helmet `img-src 'self' data:` memblokir gambar Unsplash dan Cloudinary, dan middleware `/uploads` hanya aktif di dev sehingga 404 di production.
- **Perbaikan (backend saja):** `img-src` diperluas ke self, data:, blob:, res.cloudinary.com, dan images.unsplash.com; `/uploads` disajikan di semua environment dengan pembuatan folder otomatis (anti-crash); header CORP `cross-origin` hanya untuk rute `/uploads`.
- **Test:** file baru `backend/src/uploads-static.test.ts`; total 25 lulus (sebelumnya 24). Runtime: CSP benar, `/uploads` mengembalikan 200 `image/jpeg`, file tidak ada mengembalikan 404.
- **Git:** perubahan baru hanya `backend/src/app.ts` dan file test baru, di atas perubahan sesi sebelumnya yang belum di-commit.
- **Dampak ke PRD:** semua rujukan test jadi 25; catatan CSP masuk bagian 13; penyimpanan upload masuk bagian 15 dan 16.

Catatan tambahan dari log lengkap 16 Okt: (1) sesi 15 Okt malam (21.33 WIB) menyepakati cakupan Fase C (CRUD dan analytics) bersama pemilik proyek, tetapi isi cakupannya belum tertulis di log, jadi belum bisa dimasukkan ke PRD; (2) di Windows, proses node lama yang menahan port 4000 membuat `prisma generate` gagal EPERM saat build, hentikan server uji dulu sebelum build; (3) `GET /` tetap memakai CORP `same-origin`, hanya `/uploads` yang `cross-origin`.

**Koreksi 16 Okt (setelah screenshot konsol Neon):** database utama ternyata sudah di Neon. Proyek `ngopijember` punya dua cabang, `produksi` dan `tes`; cabang `produksi` sudah berisi tabel hasil migrasi Prisma dan 2 user (ADMIN dan OWNER). Penyebab selisih: `progres.md` berhenti mencatat langkah ini pada 13 Okt, sedangkan migrasi dan seed ke DB utama dilakukan di sesi lain. Karena itu penghalang rilis sebenarnya bukan lagi pemindahan database, tetapi kelengkapan data kedai, penuntasan Fase C, dan deployment. Pengecekan .env utama (16 Okt): DATABASE\_URL pooled dan DIRECT\_URL direct sudah ke Neon, hostnya beda dari DB test, dan CLIENT\_URL tinggal satu. Bagian yang terdampak sudah disesuaikan (bagian 5, roadmap, risiko, Definition of Done, utang teknis).

---

## 1. Ringkasan Eksekutif

**Ngopi Jember** adalah direktori coffee shop berbasis web untuk Kabupaten Jember, Jawa Timur. Pengunjung mencari kedai berdasarkan lokasi terdekat, kecamatan, rating, dan fasilitas. Pemilik kedai mengelola profil, menu, dan melihat statistik kunjungan. Admin memverifikasi kedai agar hanya data tervalidasi yang tampil ke publik.

Arsitektur dua paket dalam satu repositori: `frontend` (React 19, TypeScript, Vite, Tailwind CSS 4) dan `backend` (Express 5, TypeScript, Prisma 6.19.3, PostgreSQL di Neon). Untuk produksi, backend dapat menyajikan hasil build frontend sehingga cukup satu layanan.

**Tujuan rilis 1.0:** aplikasi online dengan database PostgreSQL nyata, data kedai asli, aman untuk publik, dan dapat dipakai pengunjung, pemilik, serta admin.

**Posisi saat ini (16 Okt 2026):** kode inti, test, dan skrip perawatan data sudah kuat. Yang masih menjadi penghalang rilis adalah (a) pemindahan database utama ke Neon, (b) pengisian data asli lengkap, (c) penuntasan dashboard admin dan CRUD, serta (d) deployment.

---

## 2. Latar Belakang dan Masalah

### 2.1 Masalah pengguna

1. Informasi kedai kopi di Jember tersebar di Instagram, Google Maps, dan rekomendasi lisan, tanpa satu tempat yang rapi.
2. Informasi sering tidak lengkap atau tidak seragam: jam buka, menu, fasilitas (Wi-Fi, colokan, outdoor, musala, parkir), dan kontak.
3. Mahasiswa dan pekerja remote butuh filter fasilitas, bukan sekadar nama tempat.
4. Pemilik kedai kecil tidak punya etalase digital yang murah dan mudah dikelola.

### 2.2 Peluang

- Jember memiliki populasi mahasiswa besar dan budaya ngopi yang kuat.
- Fokus lokal membuat data lebih relevan dibanding peta umum.
- Pemilik dapat menjadi sumber data utama sehingga beban pengisian tidak hanya di admin.

---

## 3. Tujuan, Non-Tujuan, dan Metrik Sukses

### 3.1 Tujuan

| Kode | Tujuan |
| --- | --- |
| G1 | Pengunjung menemukan kedai terdekat dalam kurang dari 10 detik sejak halaman dibuka |
| G2 | Pengunjung dapat menyaring berdasarkan kecamatan, rating, dan fasilitas |
| G3 | Halaman detail cukup lengkap untuk memutuskan datang: lokasi, jam, menu, kontak, ulasan |
| G4 | Pemilik mengelola profil dan menu sendiri tanpa bantuan developer |
| G5 | Admin dapat memverifikasi, menandai unggulan, dan memoderasi data |
| G6 | Aplikasi aman, teruji, dan di-hosting dengan biaya serendah mungkin |

### 3.2 Non-Tujuan rilis 1.0 \[Usulan\]

Subscription dan pembayaran, pemesanan makanan atau minuman, aplikasi mobile native, fitur sosial (follow, chat, feed), multi-kota di luar Jember, rekomendasi berbasis AI, notifikasi email, dan reset password.

**Alasan:** langganan dan pembayaran menambah kompleksitas hukum, keamanan, dan operasional. Rilis 1.0 fokus pada direktori yang bagus dan data yang terpercaya.

### 3.3 Metrik sukses

| Metrik | Target |
| --- | --- |
| Kedai terverifikasi dengan data asli | Minimal 15 saat rilis 1.0, 50 dalam 3 bulan \[Usulan\] |
| Kedai terverifikasi dengan menu terisi | Minimal 60 persen |
| Pemilik terdaftar dan aktif | Minimal 10 dalam 3 bulan |
| Lighthouse Performance halaman utama | 85 atau lebih |
| Keberhasilan fitur "terdekat" (izin diberikan lalu hasil tampil) | Lebih dari 90 persen dari yang mencoba |
| Uptime backend | 99 persen atau lebih |
| Test otomatis backend | Seluruh endpoint utama tercakup; baseline 25 test lulus (7 file), stabil 10 run berturut-turut tanpa flaky |

---

## 4. Pengguna dan Persona

- **Pengunjung (tanpa login), Rani, 21, mahasiswa.** Butuh tempat mengerjakan tugas dengan Wi-Fi dan colokan, buka sampai malam, dekat kampus. Membuka dari HP tanpa membuat akun.
- **USER, Dimas, 25, pekerja.** Ingin menulis ulasan dan rating; perlu akun agar satu orang hanya satu ulasan per kedai.
- **OWNER, Bu Sari, 40, pemilik kedai kecil.** Tidak teknis. Butuh dashboard sederhana untuk ubah jam buka, tambah menu, dan melihat jumlah pengunjung profil.
- **ADMIN, pengelola platform.** Memverifikasi kedai baru, menandai unggulan, mengelola pengguna, menghapus konten bermasalah.

---

## 5. Status Proyek Terkini

Kolom **Bukti** merujuk ke entri `progres.md`.

| Area | Status 16 Okt 2026 | Bukti |
| --- | --- | --- |
| UI publik (Home, Explorer, Detail) | Selesai; build frontend sukses. `frontend/src/data.ts` masih berisi data statis | Build 14 dan 15 Okt; \[Perlu dicek\] apakah halaman masih memakainya |
| API publik (list, detail, categories, facilities) | Selesai | Audit 13 Okt |
| Pencarian terdekat dan skor gabungan | Selesai | \[Perlu dicek\] rumus persis di kode |
| Auth (register, login, `/auth/me`, JWT, bcrypt) | Selesai | Audit 13 Okt |
| Middleware autentikasi dan role | Selesai | Audit 13 Okt |
| Dashboard pemilik (kedai, menu, fasilitas, taksonomi, analytics) | Sebagian besar selesai | \[Perlu dicek\] kelengkapan CRUD |
| Endpoint admin (verifikasi, featured, CRUD user) | Selesai di backend | Audit 13 Okt |
| UI dashboard admin | Halaman ada, belum diverifikasi lengkap | Audit 13 Okt |
| Upload gambar (Cloudinary, fallback disk lokal) | Siap pakai | Audit 13 Okt; 16 Okt: gambar rusak di production diperbaiki (CSP dan /uploads), ada test uploads-static |
| Test backend | 25 lulus, 7 file, di Neon branch `test`, mandiri dan idempoten | npm test 16 Okt; `analytics.test.ts` flaky 1 kali |
| Test frontend | Belum ada | - |
| Guard test (`setup-env.ts`, `env-guard.test.ts`) | Selesai; test diblokir bila host sama dengan DB utama atau `.env.test` hilang | Entri 14 Okt |
| Database **test** (Neon branch `test`) | Selesai: 2 migrasi, schema up to date | `migrate status` 14 Okt |
| Database **utama** | **Sudah di Neon (cabang produksi).** `Log 13 Okt mencatat .env masih localhost, tetapi konsol Neon 16 Okt menunjukkan cabang produksi sudah berisi tabel migrasi dan 2 user; seed ke DB utama sudah jalan (5 kedai) dan API lokal tersambung ke Neon` | `Screenshot konsol Neon 16 Okt dan sesi seed 14 Okt (belum tercatat di progres.md); .env utama sudah dicek 16 Okt (CLIENT_URL tinggal satu)` |
| Seed idempoten dari CSV | Selesai; dry-run sukses, 5 kedai asli diproses | Entri 13 Okt |
| Skrip perawatan data | `prisma:reset`, `prisma:cleanup-test`, `prisma:update-shops` selesai; `db:clean` ada di root | Entri 14 Okt dan audit read-only |
| Single-service (backend sajikan `frontend/dist`) + SPA fallback | Selesai; 3 test baru; teruji dari cwd root dan backend | Entri 15 Okt |
| Dokumentasi (README, AGENTS.md, panduan deployment produksi) | Diperbarui; commit `docs: add production deployment guide` | Entri 14 Okt, git log |
| Subscription | Tidak dibangun (di luar rilis 1.0) | - |

Perubahan yang belum di-commit per akhir sesi 15 Okt: `README.md`, `backend/package.json`, `backend/src/app.test.ts`, `backend/src/app.ts`, `backend/src/middleware/upload.ts`, `backend/src/server.ts`, `frontend/src/services/coffeeShop.ts`, `package.json`, `progres.md`, dan file baru `backend/src/spa-fallback.test.ts`.

**Pembaruan 16 Okt:** perbaikan gambar rusak di production selesai (`backend/src/app.ts` dan `backend/src/uploads-static.test.ts`). Daftar perubahan belum di-commit di atas tetap berlaku, ditambah file test baru tersebut.

---

## 6. Peran dan Hak Akses

| Kemampuan | Pengunjung | USER | OWNER | ADMIN |
| --- | --- | --- | --- | --- |
| Lihat daftar dan detail kedai terverifikasi | Ya | Ya | Ya | Ya |
| Cari terdekat dan filter | Ya | Ya | Ya | Ya |
| Tulis ulasan dan rating | Tidak | Ya | Ya, bukan kedai sendiri \[Usulan\] | Ya |
| Daftarkan kedai | Tidak | Tidak | Ya | Ya |
| Edit kedai, menu, fasilitas milik sendiri | Tidak | Tidak | Ya | Ya |
| Lihat analytics kedai sendiri | Tidak | Tidak | Ya | Ya |
| Verifikasi kedai, tandai unggulan | Tidak | Tidak | Tidak | Ya |
| Kelola pengguna dan ubah role | Tidak | Tidak | Tidak | Ya |
| Hapus ulasan atau kedai bermasalah | Tidak | Tidak | Tidak | Ya |

**Aturan penting \[Terkonfirmasi\]:** kedai baru berstatus `isVerified = false` dan tidak tampil publik sampai ADMIN memverifikasi. Akun ADMIN tidak boleh dibuat lewat registrasi publik; hanya lewat seed (variabel `SEED_ADMIN_*`) atau perintah admin.

---

## 7. Kebutuhan Fungsional

Prioritas: **M** (Must), **S** (Should), **C** (Could). Status: **Ada** = diklaim selesai, **Sebagian**, **Belum**, **Cek** = perlu verifikasi kode.

### 7.1 Halaman publik dan penemuan kedai

| ID | Kebutuhan | Prioritas | Status |
| --- | --- | --- | --- |
| FR-01 | Home: hero, kedai populer, unggulan, terbaru, ajakan bergabung untuk pemilik | M | Ada |
| FR-02 | Explorer: daftar kedai terverifikasi dengan pagination | M | Ada |
| FR-03 | Pencarian teks berdasarkan nama atau alamat | M | Ada |
| FR-04 | Filter kecamatan, fasilitas, rating minimum, status unggulan | M | Ada |
| FR-05 | Pengurutan: terdekat, rating, terbaru | M | Ada |
| FR-06 | Mode "terdekat" memakai GPS peramban, menampilkan jarak, urut skor gabungan | M | Ada |
| FR-07 | Izin lokasi ditolak atau gagal: pesan ramah dan jalur alternatif (pilih kecamatan) | M | Cek |
| FR-08 | Keadaan kosong, memuat (skeleton), dan error yang ramah di semua daftar | M | Cek |
| FR-09 | State filter ada di query string sehingga URL bisa dibagikan | C | Belum |
| FR-09a | Halaman tidak lagi bergantung pada `data.ts` statis; semua data dari API (terverifikasi 16 Okt: data.ts tidak di-import di mana pun) | M | Cek |

### 7.2 Halaman detail kedai

| ID | Kebutuhan | Prioritas | Status |
| --- | --- | --- | --- |
| FR-10 | Detail diakses lewat slug (`/coffee-shops/:slug`) | M | Ada |
| FR-11 | Nama, deskripsi, alamat, kecamatan, jam buka, status (OPEN, CLOSED, TEMPORARILY\_CLOSED). Nilai placeholder "Belum tersedia" pada `priceRange` atau `openingHours` ditampilkan sebagai label netral, bukan teks mentah yang tampak seperti bug | M | Cek |
| FR-12 | Galeri atau foto utama | S | Cek |
| FR-13 | Daftar fasilitas dan kategori | M | Ada |
| FR-14 | Daftar menu dengan harga | M | Ada |
| FR-15 | Peta dan tombol "Buka di Maps" dengan koordinat kedai yang benar; bila koordinat tidak ada, tombol disembunyikan, bukan diarahkan ke 0,0. Kode saat ini (audit 16 Okt): bila koordinat null, tautan jatuh ke pencarian alamat Google Maps (alamat, kecamatan, Jember), jadi tombol tetap tampil; diterima sebagai alternatif, tetapi pastikan nilai 0 juga ditangani | M | Cek |
| FR-16 | Tautan WhatsApp dan Instagram bila diisi | M | Ada |
| FR-17 | Daftar ulasan dan rating rata-rata | M | Ada |
| FR-18 | Promosi aktif ditampilkan bila ada | C | Cek |
| FR-19 | Metadata SEO per halaman (title, description, Open Graph) | S | Belum |

Catatan: `isOpenNow` saat ini hanya memakai `status === "OPEN"`, tidak mengurai `openingHours`. Ini sengaja untuk 1.0 dan tidak boleh dipromosikan sebagai "buka sekarang berdasarkan jam".

### 7.3 Autentikasi dan akun

| ID | Kebutuhan | Prioritas | Status |
| --- | --- | --- | --- |
| FR-20 | Registrasi USER atau OWNER dengan validasi Zod | M | Ada |
| FR-21 | Login mengembalikan JWT; password hash bcrypt (saltRounds 12) | M | Ada |
| FR-22 | `GET /api/auth/me` mengembalikan profil dari token | M | Ada |
| FR-23 | Rate limit pada endpoint auth | M | Cek |
| FR-24 | Logout menghapus token dari klien | M | Ada |
| FR-25 | Navbar adaptif sesuai role; rute dilindungi `PrivateRoute` | M | Ada |
| FR-26 | Lupa password dan reset | C | Ditunda |
| FR-27 | Ubah profil dan ganti password | S | Belum |

### 7.4 Ulasan dan rating

| ID | Kebutuhan | Prioritas | Status |
| --- | --- | --- | --- |
| FR-30 | USER login menulis ulasan rating 1 sampai 5 | M | Ada |
| FR-31 | Satu ulasan per pengguna per kedai (unique `coffeeShopId + userId`) | M | Ada |
| FR-32 | Pengguna mengedit atau menghapus ulasannya sendiri | S | Cek |
| FR-33 | ADMIN menghapus ulasan yang melanggar | M | Cek |
| FR-34 | Rata-rata rating dan jumlah ulasan tampil di kartu dan detail | M | Ada |

### 7.5 Dashboard pemilik

| ID | Kebutuhan | Prioritas | Status |
| --- | --- | --- | --- |
| FR-40 | Mendaftarkan dan mengubah profil kedai (nama, alamat, koordinat, jam, kontak) | M | Sebagian |
| FR-41 | Mengelola menu: tambah, ubah, hapus, termasuk gambar | M | Sebagian |
| FR-42 | Memilih fasilitas dan kategori | M | Ada |
| FR-43 | Upload gambar, batas 5 MB, hanya format gambar | M | Ada |
| FR-44 | Status verifikasi (menunggu atau terverifikasi) tampil jelas | M | Cek |
| FR-45 | Analytics: profil dilihat, klik peta, WhatsApp, Instagram, menu dilihat per rentang waktu | S | Sebagian |
| FR-46 | Mengelola promosi | C | Belum |
| FR-47 | Pemilih koordinat mudah (klik peta atau "pakai lokasi saya") | S | Belum |

### 7.6 Dashboard admin

| ID | Kebutuhan | Prioritas | Status |
| --- | --- | --- | --- |
| FR-50 | Daftar kedai dengan filter status verifikasi | M | Cek (UI) |
| FR-51 | Verifikasi atau batalkan verifikasi | M | Backend ada, UI cek |
| FR-52 | Tandai atau lepas unggulan | M | Backend ada, UI cek |
| FR-53 | CRUD kedai lengkap oleh admin | M | Sebagian |
| FR-54 | Daftar pengguna, ubah role, hapus pengguna | M | Backend ada, UI cek |
| FR-55 | Moderasi ulasan (lihat dan hapus) | M | Cek |
| FR-56 | Kelola kategori dan fasilitas referensi | S | Belum |
| FR-57 | Ringkasan statistik platform | S | Belum |
| FR-58 | Audit log aktivitas admin | C | Belum |

### 7.7 Analytics

| ID | Kebutuhan | Prioritas | Status |
| --- | --- | --- | --- |
| FR-60 | Catat event: `PROFILE_VIEW`, `MAP_CLICK`, `WHATSAPP_CLICK`, `INSTAGRAM_CLICK`, `MENU_VIEW`, `PROMOTION_VIEW` | M | Sebagian |
| FR-61 | Pencatatan tidak memperlambat atau menggagalkan tampilan halaman | M | Cek |
| FR-62 | Tanpa data pribadi pengunjung anonim, tanpa IP mentah \[Usulan\] | M | Cek |
| FR-63 | Agregasi per kedai per hari untuk dashboard pemilik | S | Sebagian |

---

## 8. Logika Pencarian Terdekat

**Kode sudah dibaca (audit 16 Okt): endpoint terpisah /api/coffee-shops/nearby dengan parameter lat, lng, radius (default 25 km), dan limit (default 10); jarak Haversine (R = 6371 km); field distance dikembalikan per kedai**. Spesifikasi acuan agar konsisten:

1. Input: `lat`, `lng` pengunjung, radius opsional, filter lain.
2. Jarak kedai ke pengunjung memakai rumus Haversine (di aplikasi atau SQL).
3. Skor gabungan di kode saat ini: skor = (rating x 1,5) dikurangi (jarak km x 0,3). Usulan awal 70 persen rating dan 30 persen jarak belum dipakai; putuskan mana yang jadi acuan. \[Perlu dicek\] perlakuan kedai tanpa rating (rating null) dalam rumus ini.
4. Kedai tanpa ulasan tetap tampil dengan label "Belum ada rating", bukan bintang nol.
5. Bobot dan radius disimpan di satu berkas konfigurasi.
6. Koordinat pengunjung hanya dikirim sebagai parameter permintaan dan tidak disimpan; pertimbangkan pembulatan 3 desimal.
7. Respons item menyertakan `lat` dan `lng` kedai agar tautan peta akurat.
8. Kedai tanpa koordinat dikecualikan dari mode terdekat (tidak diberi jarak palsu); sudah demikian di kode, difilter di query database.

---

## 9. Kebutuhan Non-Fungsional

| Kategori | Kebutuhan |
| --- | --- |
| Performa | API daftar di bawah 500 ms pada beban normal; LCP halaman utama di bawah 2,5 detik pada 4G |
| Responsif | Nyaman dari lebar 360 px; target sentuh minimal 44 px |
| Aksesibilitas | WCAG AA: kontras 4,5:1, navigasi keyboard, label ARIA, fokus terlihat |
| Keamanan | Lihat bagian 13 |
| Ketersediaan | Target 99 persen; cold start tier gratis harus dimitigasi atau diberi tahu ke pengguna |
| Skalabilitas | Pagination wajib di semua daftar; indeks pada kolom filter |
| Maintainability | TypeScript ketat, lint bersih, test otomatis, konfigurasi lewat environment variable |
| Observabilitas | Log terstruktur, endpoint `/api/health`, error handler terpusat, peringatan jelas bila frontend build tidak ditemukan |
| Kompatibilitas | Chrome, Safari, Firefox, Edge dua versi terakhir |
| Lokalisasi | Bahasa Indonesia |
| Biaya | Hosting nol atau sangat rendah selama 6 bulan pertama |

---

## 10. Arsitektur dan Tech Stack

### 10.1 Struktur repositori

```
ngopi-jember/
├── frontend/   React 19, TypeScript, Vite, Tailwind CSS 4
├── backend/    Express 5, TypeScript (CommonJS), Prisma 6.19.3, PostgreSQL
├── docs/       dokumentasi (termasuk panduan deployment produksi)
├── AGENTS.md   aturan kerja untuk agen AI
└── progres.md  log progres
```

### 10.2 Frontend

React 19, React Router DOM 7, framer-motion, Tailwind CSS 4, test dengan happy-dom, lint dengan oxlint. Lapisan layanan di `src/services/` (`coffeeShop.ts`, `auth.ts`, `admin.ts`). Hook `useAuth` menyinkronkan token dan user. Komponen kunci: `CoffeeShopCard`, `AuthForm`, `PrivateRoute`, `Navbar`, `MainLayout`. Lint saat ini selesai dengan beberapa warning non-blocking (React effect, variabel tak terpakai).

### 10.3 Backend

- Express 5 dengan helmet, cors, express-rate-limit; validasi Zod; error handler terpusat (Zod, Prisma P2002 duplikat, P2025 tidak ditemukan).
- Autentikasi JWT, `JWT_SECRET` minimal 32 karakter.
- Upload dengan Multer dan Cloudinary (fallback disk lokal hanya untuk pengembangan).
- **Penyajian frontend:** path `frontend/dist` dihitung dari `__dirname` (`path.resolve(__dirname, '../../frontend/dist')`) sehingga benar dari cwd root maupun `backend/`. Override lewat `FRONTEND_DIST_PATH`. Bila folder atau `index.html` tidak ada, server tetap jalan dan mencetak peringatan ke stderr.
- **SPA fallback:** hanya untuk `GET`, bukan `/api/*`, dan path tanpa ekstensi file. Permintaan file statis yang tidak ada mengembalikan 404 (bukan `index.html`). `/api/*` tidak dikenal mengembalikan 404 JSON `{ success: false, message: "Endpoint tidak ditemukan" }`.
- Test: vitest dan supertest, wajib ke Neon branch `test`.

* **Gambar di production \[Terkonfirmasi 16 Okt\]:** CSP helmet mengizinkan `img-src` dari `'self'`, `data:`, Unsplash, dan Cloudinary. `/uploads` disajikan di semua environment (folder dibuat otomatis bila belum ada). Header CORP `cross-origin` hanya dipasang pada rute `/uploads`. Host terverifikasi dari log 16 Okt: self, data:, blob:, res.cloudinary.com, images.unsplash.com. Gambar kartu memakai path relatif /uploads atau URL Cloudinary; hero Home memakai URL Unsplash. Kode ada di `app.ts`.

### 10.4 Database

PostgreSQL di Neon dengan dua koneksi:

- `DATABASE_URL`: pooled (host berisi `-pooler`, `sslmode=require`, `pgbouncer=true`) untuk runtime.
- `DIRECT_URL`: langsung (tanpa `-pooler`, tanpa `pgbouncer=true`) untuk migrasi dan seed.
- Keduanya harus menunjuk database yang sama.
- Branch terpisah `test` dipakai khusus test otomatis.

### 10.5 Diagram alur

```
Produksi single-service:
Browser --HTTPS--> Express (API + file statis frontend/dist) --> Prisma --> Neon PostgreSQL
                         |
                         +--> Cloudinary (gambar)
```

---

## 11. Model Data

Nama model \[Terkonfirmasi\] dari `schema.prisma` (187 baris). Detail kolom \[Perlu dicek\] terhadap skema.

| Model | Tujuan | Catatan |
| --- | --- | --- |
| User | Akun | Role USER, OWNER, ADMIN; password hash |
| CoffeeShop | Profil kedai | `isVerified` default false, `isFeatured`, status OPEN/CLOSED/TEMPORARILY\_CLOSED, slug unik, koordinat, kecamatan, `priceRange` dan `openingHours` (NOT NULL) |
| Category | Kategori | Referensi; 7 item di seed |
| Facility | Fasilitas | Referensi; 12 item di seed |
| CoffeeShopCategory, CoffeeShopFacility | Relasi banyak ke banyak | Dikelola seed dan skrip update |
| CoffeeShopImage | Galeri | Tidak di-seed |
| Menu | Item menu | Nama, harga, gambar; seed opsional dari `menus.csv` |
| Review | Ulasan dan rating | Unik pada `coffeeShopId + userId` |
| Promotion | Promosi | Masa berlaku |
| AnalyticsEvent | Event | Tipe, kedai, waktu |
| Subscription | Langganan | Ada di skema, tidak dipakai di 1.0 |

### 11.1 Aturan data

- Slug dari nama dan dijamin unik (sufiks `-2`, `-3` bila bentrok).
- Koordinat divalidasi dalam bounding box Jember: lat -8.6 sampai -7.8, lng 113.2 sampai 114.2.
- Koordinat dengan kurang dari 5 desimal ditandai peringatan presisi rendah. Mengisi hanya salah satu dari lat atau lng ditolak.
- Kategori dan fasilitas harus persis sama dengan daftar di `seed.ts`.
- Menghapus kedai harus menangani relasi (menu, ulasan, event, gambar, kategori, fasilitas) secara konsisten.
- Indeks pada `slug`, `isVerified`, `district`, dan kolom filter lain.
- Data demo dan data asli dipisahkan; baris `CONTOH*` di CSV selalu dilewati seed.
- Gambar: URL eksternal (misalnya Unsplash) hanya untuk contoh. Untuk produksi, foto asli dari pemilik diunggah ke Cloudinary \[Usulan\].

---

## 12. Kontrak API

Semua rute berawalan `/api`, respons JSON, bentuk error seragam (kode HTTP sesuai, pesan jelas, detail validasi bila ada).

### 12.1 Publik

| Metode | Rute | Fungsi |
| --- | --- | --- |
| GET | `/api/health` | Status layanan |
| GET | `/api/coffee-shops` | Daftar: `search`, `district`, `facility`, `featured`, `minRating`, `sort`, `page`, `limit`, dan kartu hanya memuat id, name, slug, district, priceRange, isFeatured, status, image, facilities, rating, reviewCount. Mode terdekat memakai GET /api/coffee-shops/nearby (lat, lng, radius, limit) |
| GET | `/api/coffee-shops/:slug` | Detail |
| GET | `/api/categories` | Kategori |
| GET | `/api/facilities` | Fasilitas |
| GET | `/uploads/*` | File unggahan lokal; 200 bila ada, 404 bila tidak \[Terkonfirmasi 16 Okt\] |

### 12.2 Autentikasi

| Metode | Rute | Fungsi |
| --- | --- | --- |
| POST | `/api/auth/register` | Registrasi USER atau OWNER |
| POST | `/api/auth/login` | Login, mengembalikan token |
| GET | `/api/auth/me` | Profil dari token |

### 12.3 Owner (token OWNER)

| Metode | Rute | Fungsi |
| --- | --- | --- |
| GET | `/api/owner/coffee-shop` | Kedai milik sendiri |
| GET | `/api/owner/analytics` | Statistik kedai sendiri |
| CRUD | Kedai, menu, promosi milik sendiri | \[Perlu dicek\] kelengkapan |

### 12.4 Admin (token ADMIN)

Kedai (CRUD, verifikasi, unggulan), pengguna (daftar, ubah role, hapus), ulasan (moderasi).

### 12.5 Aturan lintas rute

- Validasi Zod di setiap rute yang menerima data.
- Otorisasi di middleware; kepemilikan sumber daya dicek di handler.
- Pagination dengan batas `limit` maksimum.
- Respons tidak membocorkan hash password atau data internal.
- Rute `/api/*` tidak dikenal: 404 JSON, tidak pernah HTML. File statis yang tidak ada: 404, bukan `index.html`.
- Header CORP `cross-origin` hanya pada `/uploads`, bukan global.

---

## 13. Keamanan

| Risiko | Mitigasi | Status |
| --- | --- | --- |
| Kebocoran rahasia | `.env*` ter-ignore git (terverifikasi); rahasia di environment hosting; rotasi bila pernah tertempel di tempat tidak aman; agen AI dilarang mencetak password atau connection string utuh | Ada |
| `.env` rapi | `Entri CLIENT_URL ganda sudah beres (dicek 16 Okt); sebelum deploy isi dengan domain produksi` | Sebagian |
| Test menyasar DB utama | Guard `setup-env.ts` memblokir bila host sama dengan DB utama | Ada |
| Skrip pembersih menyasar DB utama | `cleanup-test-data.ts` tidak memuat `.env.test`; tambahkan guard host atau muat env eksplisit, dan tetap preview-dulu sebelum `--confirm` | Belum |
| CSP terlalu ketat atau terlalu longgar | `img-src` dibatasi ke `'self'`, `data:`, blob:, Cloudinary (res.cloudinary.com), dan Unsplash (images.unsplash.com) (16 Okt). Jangan melebarkan ke wildcard; Unsplash masih dipakai hero Home; hapus dari daftar hanya bila hero diganti | Sebagian |
| Header CORP | `cross-origin` hanya untuk `/uploads` agar gambar bisa dimuat lintas origin, tanpa melonggarkan rute lain | Ada |
| File unggahan lokal | `/uploads` hanya fallback; produksi memakai Cloudinary. Folder dibuat otomatis agar server tidak crash | Ada |
| Brute force login | Rate limit ketat pada `/api/auth/*` | Cek |
| Token dicuri (XSS) | Sanitasi output, CSP lewat helmet; cookie `httpOnly` di versi berikutnya | Sebagian |
| Eskalasi hak akses | ADMIN tidak bisa dibuat lewat registrasi | Cek |
| Akses data kedai orang lain | Cek kepemilikan di setiap operasi OWNER | Cek |
| Upload berbahaya | Batas 5 MB, filter tipe gambar, nama file diacak, simpan di Cloudinary | Ada |
| Injeksi | Prisma terparameter, validasi Zod | Ada |
| CORS longgar | `CLIENT_URL` hanya domain produksi. Pada single-service, same-origin sehingga CORS bisa diperketat | Cek |
| Spam ulasan | Satu ulasan per pengguna per kedai, rate limit pembuatan ulasan | Sebagian |
| Data lokasi pengguna | Tidak disimpan; pembulatan sebelum dikirim \[Usulan\] | Cek |
| Kerentanan dependensi | `npm audit` berkala, versi dikunci | Belum |
| Info infrastruktur di repo | `progres.md` memuat host Neon test dan domain email; aman bila repo privat, samarkan bila akan dipublikasikan. Pertimbangkan ignore `.superpowers/` | Belum |
| Kredensial seed | `SEED_ADMIN_*` dan `SEED_OWNER_*` wajib dari env, password kuat, diganti setelah login pertama | Ada (mekanisme) |

---

## 14. Pengujian dan Kualitas

### 14.1 Baseline

- **Backend:** 25 test lulus (per 16 Okt) di Neon branch `test`, mencakup `app.test.ts`, `audit.test.ts`, `comprehensive-audit.test.ts`, `analytics.test.ts`, `env-guard.test.ts`, `spa-fallback.test.ts`, dan `uploads-static.test.ts`.
- **Mandiri dan idempoten:** test membuat admin dan user sendiri lewat `helpers.ts` (email `@ngopijember.test`, guard hanya email test), membersihkan di `afterAll`, dan dua run berturut-turut lulus dengan row count kembali ke baseline (User 2, CoffeeShop 5).
- **Aturan:** test tidak boleh dihapus atau dilonggarkan agar hasil menjadi hijau. Timeout 10 detik pada test upload tidak melemahkan assertion.
- **TDD** dipakai pada SPA fallback (RED dibuktikan lebih dulu); `uploads-static.test.ts` memverifikasi `/uploads` 200 `image/jpeg` dan 404 untuk file tidak ada.

### 14.2 Perbaikan yang diperlukan

| No | Masalah | Tindakan |
| --- | --- | --- |
| 1 | `spa-fallback.test.ts` mengandalkan `frontend/dist` hasil build; di fresh clone atau CI tanpa build, test merah | Buat dist dummy di folder sementara dan arahkan `FRONTEND_DIST_PATH` di test, atau lewati bila dist tidak ada |
| 2 | `analytics.test.ts` flaky 1 kali ("hanya menghitung kedai milik owner": expected 0 to be >= 1); log 16 Okt tidak mencatat flaky | Selidiki timing atau event run sebelumnya; target 10 run berturut-turut hijau |
| 3 | Belum ada test frontend | Tambah test logika filter, format jarak dan rating, pembentukan tautan peta |
| 4 | Regresi tautan peta 0,0 dan label "Belum ada rating" | Wajib ada test (FR-15, bagian 8) |
| 5 | Test `uploads-static` bisa meninggalkan file contoh di `/uploads` | \[Perlu dicek\] pastikan file test dibersihkan |

### 14.3 Gerbang kualitas sebelum merge

Lint, typecheck (`npm run check`), test, dan build backend serta frontend (`npm run build` di root) harus lulus.

### 14.4 Uji manual dan audit

Daftar centang manual: izin lokasi diizinkan atau ditolak, layar 360 px, navigasi keyboard, alur tiap role, **gambar kedai tampil di build production** (bukan hanya mode dev). Lighthouse (Performance, Accessibility, Best Practices, SEO) pada Home, Explorer, Detail.

---

## 15. Operasional Data dan Skrip Perawatan

Semua skrip berada di `backend/` dan tidak pernah mencetak password atau connection string utuh (hanya host dan nama database).

| Skrip | Fungsi | Pengaman |
| --- | --- | --- |
| `npm run prisma:seed` | Upsert Category (7), Facility (12), user ADMIN dan OWNER dari env, CoffeeShop dari `coffee-shops.csv`, menu opsional dari `menus.csv` | Idempoten; `--dry-run` hanya validasi; baris `CONTOH*` dilewati; validasi koordinat Jember |
| `npm run prisma:reset` | Hapus data aplikasi dengan urutan aman FK | Default preview (host dan row count); hapus hanya dengan `--confirm`; tabel migrasi tidak disentuh |
| `npm run prisma:cleanup-test` | Hapus user `@test.com` atau `@ngopijember.test` beserta kedai dan anak datanya | Default preview; `--confirm` dalam transaksi; menolak bila ada user di luar dua domain target atau bila kedai target ada di CSV seed; melaporkan sisa admin |
| `npm run prisma:update-shops` | Update kedai dari `coffee-shop-updates.csv` | Preview default, `--apply` dalam satu transaksi; sel kosong tidak mengubah apa pun; normalisasi instagram dan telepon; nama fasilitas atau kategori tidak cocok menghentikan proses sebelum menulis; hanya field yang diizinkan |
| `npm run db:clean` (root) | Pembersihan produksi (`prisma/clean-production.ts`) | \[Perlu dicek\] perilaku dan pengaman sebelum dipakai |

### 15.1 Kondisi data kedai asli

Lima kedai di CSV seed: Hiro Coffee and Space, Namu Coffee & Eatery, 888 Coffee & More, Semeru Cafe & Resto, Perasa Coffee & Eatery. Yang masih harus dilengkapi `(rencana: lewat dashboard OWNER, lihat keputusan 16 Okt di bawah)`:

- `priceRange` Hiro dan Namu masih "Belum tersedia"; `openingHours` Semeru masih "Belum tersedia".
- Koordinat, kontak, dan Instagram menunggu pengisian. Data tidak boleh dikarang; sumber dari pemilik, observasi lapangan, atau OpenStreetMap, lalu diverifikasi admin.
- Kategori "Resto" untuk Semeru dibuang karena bukan kategori valid; putuskan apakah perlu ditambahkan ke daftar kategori.
- Gambar kedai: pastikan sumber gambar di build production sesuai daftar host yang diizinkan CSP (bagian 13), atau pindah ke Cloudinary.
- Target rilis: minimal 15 kedai asli (saat ini 5).

Temuan pemeriksaan data di DB utama (sesi 14 Okt): seed berhasil dengan 5 kedai, 9 relasi kategori, 7 kategori, 12 fasilitas, dan 2 user. Yang masih perlu dibenahi:

- Endpoint daftar `/api/coffee-shops` tidak mengirim koordinat dan jam buka, sedangkan endpoint detail `/api/coffee-shops/:slug` mengirim lengkap. Audit kode 16 Okt: ini berasal dari desain kartu (cardInclude dan toCard di coffee-shop.routes.ts), bukan data kosong. Dampaknya kecil: mode terdekat memakai endpoint terpisah /api/coffee-shops/nearby yang sudah mengirim jarak, dan tautan peta di halaman detail aman. Yang belum bisa hanya kartu di daftar biasa menampilkan jarak atau jam buka.
- Koordinat presisi rendah: Semeru 2 desimal, Perasa 3 desimal.
- Jam buka Perasa 00:00-23:59 mencurigakan; jam buka Semeru dan Instagram Hiro masih kosong.
- Relasi fasilitas (`CoffeeShopFacility`) masih 0, jadi fasilitas belum terisi di kedai mana pun.
- K`eputusan 16 Okt: kelima kedai tidak dilengkapi lewat CSV; pemilik proyek akan menginputnya sendiri lewat dashboard role OWNER setelah semua fitur selesai. Karena itu dashboard pemilik harus bisa mengisi koordinat, jam buka, fasilitas, dan kontak (FR-40, FR-42), dan perlu dicek bahwa kelima kedai terhubung ke akun OWNER yang akan dipakai [Perlu dicek]`.

---

## 16. Deployment dan Environment

### 16.1 Opsi hosting \[Usulan\]

| Opsi | Susunan | Kapan dipilih |
| --- | --- | --- |
| **A (utama): single-service** | Satu layanan Node (Render atau Railway) menjalankan `node backend/dist/server.js` yang menyajikan API dan `frontend/dist`; database Neon; gambar Cloudinary | Paling sederhana, tanpa masalah CORS, satu domain |
| B (alternatif): terpisah | Frontend di Vercel atau Netlify (SPA fallback ke `index.html`), backend di Render atau Railway | Bila butuh CDN frontend atau deploy terpisah |

Catatan hosting: cold start di tier gratis perlu dimitigasi. Disk layanan hosting biasanya tidak persisten \[Perlu dicek di penyedia terpilih\], jadi unggahan di `/uploads` bisa hilang saat restart; di produksi pakai Cloudinary dan anggap `/uploads` hanya fallback. Domain: mulai dengan subdomain gratis.

### 16.2 Variabel lingkungan (backend)

`DATABASE_URL`, `DIRECT_URL`, `PORT`, `CLIENT_URL`, `NODE_ENV`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`, `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`, `SEED_OWNER_NAME`, `ADMIN_*` (README mencatat 17 variabel), dan opsional `FRONTEND_DIST_PATH`. `FRONTEND_DIST_PATH` belum terdokumentasi di README. Frontend: URL dasar API (misalnya `VITE_API_URL`), \[Perlu dicek\] nama variabel di kode; pada single-service cukup path relatif `/api`.

### 16.3 Langkah rilis

1. Isi `backend/.env` ke Neon utama: `DATABASE_URL` pooled dan `DIRECT_URL` direct, database sama`  (sudah terpasang di lokal, dicek 16 Okt). Untuk hosting, isi variabel yang sama di dashboard layanan dan set CLIENT_URL ke domain produksi `.
2. Pastikan `npx prisma validate` dan `npx prisma migrate status` berhasil.
3. Jalankan `prisma migrate deploy` memakai `DIRECT_URL`.
4. Dry-run seed, lalu seed produksi (kategori, fasilitas, admin, kedai asli).
5. Isi data lengkap lewat `prisma:update-shops` (preview dulu, lalu `--apply`).
6. Build (`npm run build` di root), deploy, cek `/api/health`.
7. Isi `CLIENT_URL` sesuai domain, uji CORS.
8. Cek manual di build production: gambar kedai tampil (CSP tidak memblokir), SPA fallback jalan, `/uploads` tidak 404 untuk file yang ada.
9. Uji end-to-end: daftar, login, buat kedai, verifikasi admin, tampil publik, ulasan.

### 16.4 Cadangan dan pemulihan

Aktifkan backup atau point-in-time restore di Neon bila tersedia; catat prosedur pemulihan di README.

---

## 17. Roadmap

| Fase | Isi | Status |
| --- | --- | --- |
| **A. Fondasi** | Versi Prisma backend selaras, `directUrl`, branch test termigrasi, seed dan skrip perawatan, guard test | Sebagian besar selesai. `DB utama di Neon (cabang produksi) sudah termigrasi dan di-seed. Sisa: isi variabel produksi di hosting` |
| **B. Audit** | Lint, typecheck, test, build; frontend terhubung ke backend | Hampir selesai (25 test lulus). Sisa: stabilkan flaky test, perbaiki test SPA, verifikasi `data.ts` |
| **C. Lengkapi** | UI dashboard admin, penuntasan CRUD, analytics dasar, rapikan error handling | Berjalan; cakupan disepakati 15 Okt, rincian belum di log |
| **D. Hardening** | Rahasia produksi, CORS, rate limit, Cloudinary, review keamanan (bagian 13), aksesibilitas, Lighthouse | Dimulai: CSP gambar dan `/uploads` beres (16 Okt) |
| **E. Data asli** | Lengkapi 5 kedai, tambah sampai minimal 15, verifikasi koordinat | Dimulai (5 kedai di CSV) |
| **F. Deploy** | Neon utama, layanan Node single-service, uji produksi | Belum; panduan deployment sudah ada |
| **G. Rilis 1.0** | QA akhir, dokumentasi, tag `v1.0.0` | Belum |

**Backlog setelah 1.0:** reset password via email, cookie `httpOnly`, promosi, subscription dan pembayaran, notifikasi, mode gelap, PWA.

---

## 18. Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| DB utama (Neon produksi) sudah berisi data nyata | Skrip reset atau cleanup yang salah target bisa menghapus data nyata | Selalu preview dan cek host sebelum `--confirm` atau `--apply` |
| Data sedikit atau placeholder | Merusak kepercayaan | Lengkapi data asli; label "Belum tersedia" yang netral |
| Koordinat salah atau kosong | Pengguna nyasar | Validasi bounding box, peringatan presisi, verifikasi manual, test regresi tautan peta |
| Gambar rusak hanya muncul di production | Tampilan jelek tanpa terdeteksi di dev | Sudah diperbaiki 16 Okt; tambahkan cek manual build production ke daftar rilis |
| Unggahan lokal hilang di hosting | Foto kedai hilang | Pakai Cloudinary di produksi; `/uploads` hanya fallback |
| Test flaky | Pipeline tidak dipercaya | Selidiki `analytics.test.ts`, target 10 run hijau |
| Test SPA merah di fresh clone atau CI | Hambatan kontribusi | Dist dummy via `FRONTEND_DIST_PATH` di test |
| Versi Prisma root 7.10.0 vs backend 6.19.3 | Migrasi atau generate gagal | Samakan atau hapus dari root; naik ke 7 hanya lewat rencana terpisah |
| Skrip pembersih menyasar DB utama | Kehilangan data | Guard host, preview default, `--confirm` wajib |
| Cold start backend gratis | Respons pertama lambat | Skeleton, ping berkala, atau layanan yang tidak tidur |
| Pemilik tidak aktif mengisi data | Data tipis | Admin dan pemilik sama-sama bisa mengisi; bantu onboarding langsung |
| Kebocoran rahasia atau info infrastruktur | Kompromi sistem | `.env*` di `.gitignore`, rotasi, samarkan log sebelum repo publik |
| Cakupan melebar (subscription) | Rilis mundur | Dikeluarkan dari 1.0 |
| Satu orang pengembang | Kecepatan terbatas | Fase kecil, gerbang kualitas otomatis, log progres rutin |
| Penyalahgunaan ulasan | Reputasi platform | Satu ulasan per pengguna, moderasi admin, rate limit |

---

## 19. Keputusan Terkunci dan Pertanyaan Terbuka

### 19.1 Keputusan terkunci

1. Frontend dan backend sebagai dua paket di satu repositori.
2. Prisma 6.19.3 dengan PostgreSQL (Neon).
3. Tiga role: USER, OWNER, ADMIN.
4. Kedai wajib diverifikasi admin sebelum tampil publik.
5. Satu ulasan per pengguna per kedai.
6. Bahasa antarmuka Indonesia.
7. Test hanya boleh berjalan ke Neon branch `test`.
8. Skrip yang menghapus atau mengubah data wajib preview dulu; eksekusi lewat `--confirm` atau `--apply`.
9. Backend menyajikan `frontend/dist` dengan path berbasis `__dirname`.

### 19.2 Pertanyaan terbuka

| No | Pertanyaan | Usulan |
| --- | --- | --- |
| 1 | Subscription ditunda setelah 1.0? | Ya |
| 2 | Sumber data kedai asli? | Gabungan pemilik, observasi, OpenStreetMap, dengan verifikasi admin |
| 3 | Render atau Railway? | Pilih yang tier gratisnya paling stabil saat deploy |
| 4 | Pakai domain sendiri? | Mulai dengan subdomain gratis |
| 5 | Pemilik boleh mengulas kedainya sendiri? | Tidak |
| 6 | Reset password di 1.0? | Tidak, masuk backlog |
| 7 | Token di penyimpanan lokal atau cookie `httpOnly`? | Mulai dari yang ada, migrasi setelah 1.0 |
| 8 | Deployment single-service sebagai jalur utama? | Ya |
| 9 | Kategori "Resto" ditambahkan ke daftar kategori? | Putuskan sebelum mengisi data kedai berikutnya |
| 10 | Prisma di `package.json` root dihapus atau diselaraskan? | Selaraskan ke 6.19.3 atau hapus |
| 11 | Hero Home (Unsplash) dan gambar contoh dipertahankan di produksi atau diganti foto asli di Cloudinary? | Ganti dengan foto asli, hapus Unsplash dari CSP bila tidak dipakai |

---

## 20. Definition of Done Rilis 1.0

Tanda: \[x\] terbukti di log, \[\~\] sebagian, \[ \] belum.

- [ ] Database Neon utama aktif, migrasi dan seed berhasil (terlihat di konsol Neon dan .env utama sudah dicek 16 Okt; dicentang setelah /api/health dicek)
- [x] Database Neon branch `test` termigrasi dan dipakai test

* &#91;\~\] Seluruh test backend lulus (25/25 lulus per 16 Okt; flaky belum diselesaikan); test frontend belum ada
* &#91;\~\] Lint dan typecheck bersih (typecheck bersih, lint punya warning non-blocking); build sukses (terbukti)

- [ ] Dashboard admin: verifikasi, unggulan, kelola pengguna dan ulasan berfungsi di UI

* &#91;\~\] Dashboard pemilik: kedai, menu, fasilitas, analytics (kelengkapan CRUD perlu dicek)

- [ ] Pencarian terdekat terbukti bekerja saat izin diizinkan dan punya jalur alternatif saat ditolak
- [ ] Tautan peta selalu ke koordinat benar (ada test regresi)
- [x] Gambar production tidak diblokir (header CSP dan `/uploads`): CSP dan respons terverifikasi via curl 16 Okt; tampilan di browser belum dicek
- [ ] Minimal 15 kedai asli terverifikasi tampil saat rilis (saat ini 5 di CSV)
- [ ] Tidak ada rahasia di repositori; CORS dan rate limit aktif; secret produksi unik; `CLIENT_URL` produksi diisi domain asli (lokal: http://localhost:5173)
- [ ] Lighthouse: Performance 85+, Accessibility 90+

* &#91;\~\] Single-service terbukti jalan dari root dan `backend/` (selesai); online di produksi (belum)

- [ ] `/api/health` sehat dan alur end-to-end teruji di produksi

* &#91;\~\] README berisi setup, menjalankan, dan deploy (ada; tambahkan `FRONTEND_DIST_PATH`)

- [ ] Perubahan sesi 15 dan 16 Okt sudah di-commit; tag `v1.0.0` dibuat

---

## 21. Utang Teknis dan Tindakan Berikutnya

| Prioritas | Item | Catatan |
| --- | --- | --- |
| Tinggi | `Siapkan variabel environment produksi di hosting (DATABASE_URL, DIRECT_URL, CLIENT_URL, JWT_SECRET baru)` | Lokal sudah beres (dicek 16 Okt); sisa untuk hosting |
| Tinggi | Commit perubahan 15 dan 16 Okt setelah review | `.env*` tetap ter-ignore |
| Tinggi | Perbaiki test SPA agar tidak bergantung build | Lihat 14.2 |
| Sedang | Stabilkan `analytics.test.ts` | Target 10 run hijau |
| Sedang | Guard host pada `cleanup-test-data.ts` | Lihat bagian 13 |
| Sedang | Selaraskan Prisma root vs backend | Lihat risiko |
| Sedang | Lengkapi `data 5 kedai lewat dashboard OWNER (setelah fitur selesai)` | Data asli, tidak dikarang |
| Sedang | `Hapus frontend/src/data.ts (tidak di-import di mana pun, terverifikasi 16 Okt)` | Aman dihapus; ikut commit |
| Sedang | Cek file test `uploads-static` tidak meninggalkan sisa file | Lihat 14.2 |
| Rendah | Hapus `backend/check-data.ts` (skrip debug tak dirujuk) | Kandidat dari audit |
| Rendah | Rapikan warning lint frontend | Non-blocking |
| Rendah | Dokumentasikan `FRONTEND_DIST_PATH` di README | Seksi single-service |
| Rendah | Putuskan `.superpowers/` di-ignore atau tidak | Opsional |

---

## 22. Lampiran

- Proyek terpisah "cari-makan-jember" memakai pendekatan berbeda (PostGIS, tanpa login) dan tidak bergantung pada proyek ini.
- Bukti dan rincian teknis per langkah ada di `progres.md`; PRD ini menjadi acuan arah, log menjadi acuan fakta. Bila keduanya berselisih, log yang terbaru menang sampai PRD direvisi.
