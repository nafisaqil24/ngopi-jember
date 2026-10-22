# Catatan Progres - Ngopi Jember

1. **Ringkasan Proyek**
   Ngopi Jember adalah platform direktori kafe dan kedai kopi di Jember. Dibangun dengan tumpukan teknologi React 19 + TypeScript + Vite + Tailwind v4 di sisi frontend, serta Node.js + Express + Prisma + PostgreSQL di sisi backend. Fitur inti aplikasi sudah lengkap dan siap demo, meliputi: autentikasi berbasis JWT (User, Owner, Admin), manajemen dan verifikasi kedai kopi, pencarian dan halaman detail kedai dengan ulasan, analitik kedai untuk owner, upload gambar (lokal/Cloudinary), asisten chatbot, serta perankingan rekomendasi kedai memakai metode Simple Additive Weighting (SAW).

2. **Status Fitur Chatbot**
   Fitur chatbot sudah **SELESAI** dan di-merge ke branch `main` melalui PR #1 (merge commit `1397341`):
   - **Backend:** Endpoint publik `POST /api/chat` tanpa login. Urutan middleware/pipeline: rate limiter per IP -> validasi Zod body -> validasi koordinat GPS di wilayah Jember -> pengecekan status LLM aktif -> pengecekan kuota harian -> pemahaman maksud (`intent`) -> pencarian kedai / FAQ -> perender template jawaban.
   - **Frontend:** Tombol bulat melayang di pojok kanan bawah (hanya tampil di halaman `/`, `/coffee-shops`, dan `/coffee-shops/:slug`), panel jendela chat interaktif, kartu kedai mini untuk hasil rekomendasi, serta manajemen izin GPS (koordinat dibulatkan 3 desimal, disimpan di memori state React, tidak masuk ke local storage).
   - **LLM:** Menggunakan Groq (kompatibel dengan OpenAI API), model `openai/gpt-oss-20b`, `max_tokens: 1024`, `reasoning_effort: 'low'`, dan `response_format: { type: 'json_object' }`.
   - **Pengaman & Ketahanan:** Batas rate limit 5 req/menit dan 30 req/jam per IP, kuota harian `CHAT_DAILY_LIMIT` (default 800, counter di memori), batasan ukuran body request `/api/chat` maksimum 4kb (ditangani middleware `errorHandler` mengembalikan status 413 tanpa bocoran stack trace), respons publik tidak pernah membocorkan field sensitif (`ownerId`, `subscription`, `email`), respons seragam `"Chatbot lagi istirahat, coba lagi nanti ya."` (status 200) untuk LLM mati maupun kuota habis, serta log server yang bersih dari isi pesan pengguna dan kunci API.
   - **Pencarian Cerdas:** Mendukung filter kecamatan, fasilitas, harga, status buka sekarang, dan jarak radius GPS. Dilengkapi mekanisme *fallback* bertahap saat hasil 0 (tahap a: melonggarkan filter fasilitas; tahap b: melonggarkan filter harga) dengan balasan yang jujur. Parser harga mendukung format standar (`"Rp25000 - Rp50000"`), serta singkatan `"rb"`, `"k"`, dan `"ribu"`.
   - **Prioritas Pengguna:** LLM hanya mengekstrak level prioritas (`tinggi` | `normal` | `rendah`) per kriteria, bukan angka bobot. Konversi level ke bobot dilakukan deterministik di kode.

3. **Status Metode Perekomendasi SAW**
   Perankingan rekomendasi kedai (dipakai fitur chatbot) sudah memakai **Simple Additive Weighting (SAW)** yang benar-benar menentukan urutan, menggantikan sort sederhana (jarak/rating):
   - **Kriteria & tipe:** jarak (COST), harga (COST), rating (BENEFIT), fasilitas (BENEFIT, selalu jumlah total fasilitas kedai).
   - **Bobot default (`DEFAULT_WEIGHTS`):** jarak `0.30`, harga `0.25`, rating `0.30`, fasilitas `0.15`.
   - **Prioritas pengguna sebagai pengali:** `tinggi=2`, `normal=1`, `rendah=0.5` dikalikan ke bobot default, lalu dinormalisasi agar total = 1. Tanpa prioritas, bobot persis `DEFAULT_WEIGHTS`.
   - **Normalisasi:** benefit `x / max` (max=0 -> 0); cost `min / x` (x=0 -> 1). Kriteria dibuang + bobot dinormalisasi ulang bila tanpa lokasi (jarak) atau seluruh nilai kriteria kosong.
   - **Data kosong (aturan nilai terburuk):** harga tidak terparse -> harga maksimum dataset; rating null -> 0; jarak hilang -> jarak maksimum dataset.
   - **Transparansi:** respons menyertakan `sawScore` dan `sawDetails` (nilai mentah, normalisasi, bobot) agar chatbot bisa menjelaskan alasan peringkat.

4. **Peta Kode**

| Area | File | Tanggung Jawab / Fungsi Utama |
|---|---|---|
| Backend | `backend/src/chat/chat.routes.ts` | Endpoint router untuk `/api/chat` dengan rate limiter, validasi payload, dan penerusan `priorities`. |
| Backend | `backend/src/chat/limits.ts` | Manajemen rate limit per IP dan kuota harian (`CHAT_DAILY_LIMIT`) di memori. |
| Backend | `backend/src/chat/schema.ts` | Skema validasi Zod ketat (`.strict()`) untuk intent, filter, dan `priorities`. |
| Backend | `backend/src/chat/intent.ts` | Parsing dan normalisasi intent pengguna dari LLM dengan pembersihan key `null` rekursif. |
| Backend | `backend/src/chat/prompts.ts` | Konstruksi system prompt, daftar fasilitas/kategori valid, dan instruksi ekstraksi `priorities`. |
| Backend | `backend/src/chat/llm.client.ts` | Klien HTTP fetch ke penyedia LLM (Groq) dengan penanganan error aman dan `reasoning_effort`. |
| Backend | `backend/src/chat/saw.service.ts` | Fungsi murni SAW: manajemen bobot, normalisasi matriks keputusan, penanganan data kosong, dan skor akhir. |
| Backend | `backend/src/chat/search.service.ts` | Layanan pencarian kedai: filter keras, pemanggilan SAW untuk perankingan, field publik terbatas, fallback bertahap. |
| Backend | `backend/src/chat/parsers.ts` | Utilitas parsing range harga (mendukung titik, rb, k, ribu) dan status buka/tutup jam operasional. |
| Backend | `backend/src/chat/geo.ts` | Perhitungan jarak geografis (Haversine) dan validasi titik koordinat dalam wilayah Jember. |
| Backend | `backend/src/chat/templates.ts` | Perender template balasan teks jujur dan ramah untuk berbagai intent dan hasil pencarian. |
| Backend | `backend/src/chat/faq.ts` | Sumber jawaban tanya jawab (FAQ) seputar platform Ngopi Jember. |
| Backend | `backend/prisma/seed-uji.ts` | Seed data uji SAW/chatbot (idempotent, DRY-RUN default, selalu ke Neon branch test). |
| Backend | `backend/prisma/cleanup-uji.ts` | Hapus data uji saja (preview default, urutan FK benar, tidak menyentuh data asli). |
| Frontend | `frontend/src/components/chat/ChatPanel.tsx` | Panel jendela chat interaktif (styling palet tema: krem/border/aksen oranye). |
| Frontend | `frontend/src/components/chat/ChatWidget.tsx` | Tombol bulat melayang untuk membuka/tutup widget chat. |
| Frontend | `frontend/src/components/chat/ChatShopCard.tsx` | Komponen kartu mini kedai kopi untuk hasil rekomendasi di chat. |
| Frontend | `frontend/src/hooks/useChat.ts` | Hook state manajemen chat (riwayat pesan, status loading, penanganan error ramah). |
| Frontend | `frontend/src/hooks/useGeolocation.ts` | Hook manajemen izin dan pengambilan koordinat GPS pengguna dengan pembulatan 3 desimal di memori. |
| Frontend | `frontend/src/services/chat.ts` | Layanan API klien frontend untuk memanggil endpoint `/api/chat`. |

5. **Kontrak API (`/api/chat`)**
   - **Request (POST):** Body JSON `{ message: string (1-300 char), location?: { lat: number, lng: number }, history?: Array<{ role: 'user' | 'assistant', content: string (maks 300 char) }> }`. Field `priorities` dihasilkan LLM secara internal (bukan dari klien).
   - **Respons Sukses (200 OK):** `{ success: true, data: { reply: string, shops?: Array<PublicShopResult>, needsLocation?: boolean } }`. Tiap `PublicShopResult` dapat memuat `sawScore` dan `sawDetails`.
   - **Respons Error (400 Bad Request / 413 Payload Too Large / 429 Too Many Requests):** `{ success: false, message: string }`.

6. **Panduan Diagnosa Bug**

| Gejala / Error | Kemungkinan Penyebab | File untuk Dicek | Cara Membuktikan |
|---|---|---|---|
| Balasan `"Chatbot lagi istirahat..."` | Variabel env LLM belum diatur/belum restart server, atau kuota harian habis. | `backend/src/chat/llm.client.ts`, `backend/src/chat/limits.ts` | Cek log server `[Chat] reason=llm_disabled` atau `reason=daily_quota`. |
| Balasan sapaan generik (`smalltalk`) padahal pertanyaan pencarian jelas | Model LLM gagal validasi Zod atau mengalami error dari provider. | `backend/src/chat/intent.ts`, `backend/src/chat/llm.client.ts` | Cek log `[LLM] error`, `[Intent] Error parsing intent`, atau respons JSON mentah dari LLM. |
| Hasil pencarian kedai kosong (`0` hasil) | Data kedai di database belum lengkap (mis. fasilitas kedai belum ditautkan atau rentang harga kosong). | `backend/src/chat/search.service.ts` | Periksa data kedai di database dan lihat metadata `fallbackUsed` pada respons pencarian. |
| Urutan rekomendasi terasa aneh | Bobot/kriteria SAW atau data mentah (harga/rating/fasilitas) tidak lengkap. | `backend/src/chat/saw.service.ts`, `backend/src/chat/search.service.ts` | Periksa `sawScore` & `sawDetails` pada respons; cek `DEFAULT_WEIGHTS` dan jumlah data mentah tiap kedai. |
| Tombol chat tidak terlihat atau tata letak aneh di HP DevTools | Browser DevTools sedang melakukan zoom/scaling tampilan. | `frontend/src/components/chat/ChatWidget.tsx` | Cek `visualViewport.scale` di browser (bukan bug kode aplikasi). |
| Gagal meminta izin lokasi GPS | Browser menolak karena tidak menggunakan HTTPS atau bukan di `localhost`. | `frontend/src/hooks/useGeolocation.ts` | Cek console browser untuk error Geolocation API. |
| Seluruh pesan pengguna terkena error 429 (`Too Many Requests`) | Salah konfigurasi `TRUST_PROXY` di environment produksi (semua request terbaca berasal dari IP proxy yang sama). | `backend/src/app.ts` | Cek nilai `app.set('trust proxy', ...)` dan header `X-Forwarded-For`. |
| Script `seed-uji`/`cleanup-uji` menolak jalan | Host DB tujuan sama dengan host di `backend/.env` (utama), atau `backend/.env.test` tidak lengkap. | `backend/prisma/seed-uji.ts`, `backend/prisma/cleanup-uji.ts` | Baca pesan `❌ DIBLOKIR:` yang dicetak script; pastikan host branch test berbeda dari DB utama. |

   *Arti Baris Log:*
   - `[Chat] status=... reason=... intent=... duration=...` -> Catatan eksekusi endpoint chat masuk beserta alasan fallback atau durasi.
   - `[LLM] status=... duration=... model=...` -> Catatan panggilan sukses ke penyedia LLM.
   - `[LLM] error status=... duration=... model=... code=... message=...` -> Catatan error aman dari provider LLM (tanpa membocorkan key/pesan pengguna).
   - `[Intent] Error parsing intent...` -> Catatan ketika parsing atau validasi JSON intent dari LLM gagal.

7. **Masalah dan Catatan yang Diketahui**
   - Bobot `DEFAULT_WEIGHTS` SAW masih **placeholder**, akan dijustifikasi lewat survei.
   - `backend/.env.test` belum memuat variabel LLM (`LLM_API_KEY`, `LLM_MODEL` wajib; `LLM_BASE_URL`, `LLM_TIMEOUT_MS`, `CHAT_DAILY_LIMIT`, `TRUST_PROXY` opsional), sehingga saat `dev:test` chatbot mengembalikan pesan istirahat sampai diisi. (Nilai rahasia tidak ditulis di file ini.)
   - Test `analytics.test.ts` **flaky** karena bentrok data slug di database pengujian bersama tanpa pembersihan tersendiri; tidak terkait fitur chatbot. Terbukti lolos saat dijalankan terpisah.
   - Definisi `"murah"` (`maxPrice`) ditentukan secara dinamis oleh LLM berdasarkan instruksi teks di prompt (`prompts.ts`), bukan batasan angka statis di kode backend.
   - Deteksi error lokasi di `useChat.ts` menggunakan pencocokan teks pesan error karena objek `ApiError` tidak membawa status HTTP.
   - Lebar komponen Toast (`Toast.tsx`) selebar ~384px dapat sedikit melebihi layar ponsel sempit (393px), berasal dari komponen global di luar chatbot.
   - Klien Groq pada free tier memiliki batas laju (`TPM`) yang perlu diperhatikan saat pengujian beruntun.
   - Counter kuota harian disimpan di memori, sehingga akan tereset saat server restart dan tidak akurat untuk arsitektur multi-instance/serverless.
   - **Hasil Verifikasi Terakhir:** Backend `npm run check` (typecheck) **LULUS**; Backend `npm test` **76/76 LULUS** (satu run awal gagal di `analytics.test.ts` karena flaky); Frontend `npm test` **56/56 LULUS**; Build backend dan frontend **BERHASIL**.

8. **To-Do Berikutnya (Belum Dikerjakan)**
   - Mengisi variabel LLM di `backend/.env.test` agar chatbot aktif saat `dev:test` (nilai diisi manual oleh pemilik, bukan disalin ke file lain).
   - Menjalankan alur penuh data uji: `seed-uji --confirm` -> uji manual via `dev:test` -> `cleanup-uji --confirm` -> baru `npm test`.
   - Meninjau kembali dan menetapkan kepastian angka bobot `DEFAULT_WEIGHTS` SAW (justifikasi survei).
   - Uji coba langsung di perangkat seluler fisik (melalui port forwarding USB atau hosting HTTPS).
   - Merapikan penataan lebar komponen Toast global.
   - Memperbaiki test `analytics.test.ts` di PR terpisah.

9. **Cara Menjalankan & Environment**
   - **Environment Variables (Nama Saja):** `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_TIMEOUT_MS`, `CHAT_DAILY_LIMIT`, `TRUST_PROXY`, `VITE_API_URL`, `DATABASE_URL`, `DIRECT_URL`.
   - **Backend:**
     - Jalankan dev (DB utama): `npm run dev` (di folder `backend`)
     - Jalankan dev terhadap Neon branch test: `npm run dev:test`
     - Jalankan test chat: `npx vitest run src/chat`
     - Build: `npm run build`
     - Typecheck: `npm run check`
   - **Frontend:**
     - Jalankan dev: `npm run dev` (di folder `frontend`)
     - Jalankan test: `npm test`
     - Build: `npm run build`
   - **Data Uji (folder `backend`):**
     - Seed (dry-run): `npx tsx prisma/seed-uji.ts`; tulis: tambah `--confirm`
     - Cleanup (preview): `npx tsx prisma/cleanup-uji.ts`; hapus: tambah `--confirm`
     - Atau via npm: `npm run prisma:seed-uji` / `npm run prisma:cleanup-uji`
   - **Aturan penting:** Kedua script data uji **selalu** memuat `backend/.env.test` dan menolak jalan bila host tujuan = DB utama. Test hanya boleh ke Neon branch 'test'. Jangan jalankan seed/reset/cleanup `--confirm` ke DB utama.

10. **Data Uji SAW/Chatbot**
   - **Kecamatan:** `Kaliwates` (tidak dipakai kedai asli; CSV kedai asli hanya `Sumbersari`).
   - **Titik acuan uji "terdekat":** lat `-8.168`, lng `113.700` (pusat Kaliwates).
   - **Kedai uji** (nama `[UJI]`, slug `uji-`), semua terverifikasi, jam buka konsisten tanpa fasilitas "Buka 24 Jam":

| Slug | Harga | Rating (dari ulasan) | Fasilitas | Jarak ke acuan |
|---|---|---|---|---|
| `uji-kopi-a` | Rp15000 - Rp25000 | 3.8 (5 ulasan) | 3 | ~0.4 km |
| `uji-kopi-b` | Rp25000 - Rp40000 | 4.7 (10 ulasan) | 6 | ~2 km |
| `uji-kopi-c` | Rp10000 - Rp18000 | 4.0 (5 ulasan) | 2 | ~4 km |
| `uji-kopi-d` | Rp35000 - Rp60000 | 4.9 (10 ulasan) | 8 | ~7 km |
| `uji-kopi-e` | Rp20000 - Rp30000 | 3.2 (5 ulasan) | 5 | ~11 km |

   - **User uji:** `uji-owner@ngopijember.test` (OWNER) + 10 reviewer `uji-reviewer1..10@ngopijember.test` (USER). Rating berasal dari tabel `Review` (bukan field palsu).
   - **Urutan kerja:** seed -> uji manual via `dev:test` -> cleanup -> baru `npm test` (jangan `npm test` saat data uji masih ada).
   - **Hasil Uji Kriteria Jarak SAW (dengan lokasi):** Diuji pada **level fungsi** (memanggil `searchShops` langsung, bukan lewat chatbot/LLM) ke **Neon branch test**. Titik acuan lat `-8.168`, lng `113.700`, `includeDistance=true`, tanpa prioritas (bobot default). Pengujian belum lewat endpoint chatbot karena `LLM_API_KEY`/`LLM_MODEL` belum ada di `backend/.env.test`.

     Perbandingan sistem vs hitungan manual (semua **LULUS**):

     | Slug | Jarak sistem | Jarak manual | Skor sistem | Skor manual |
     |---|---|---|---|---|
     | `uji-kopi-a` | 0.4 km | 0.4 km | 0.7639 | 0.7639 |
     | `uji-kopi-b` | 2.0 km | 2.0 km | 0.5679 | 0.5679 |
     | `uji-kopi-c` | 4.0 km | 4.0 km | 0.5624 | 0.5624 |
     | `uji-kopi-d` | 7.0 km | 7.0 km | 0.5408 | 0.5408 |
     | `uji-kopi-e` | 11.0 km | 11.0 km | 0.4406 | 0.4406 |

     Bobot terpakai (`sawDetails.weight`) sesuai: jarak `0.30`, harga `0.25`, rating `0.30`, fasilitas `0.15` (**LULUS**).

     - **Lokasi luar Jember** (contoh lat `-6.2`, lng `106.8`): ditolak oleh `isWithinJember` (false) dan endpoint `POST /api/chat` mengembalikan **400** `"Lokasi Anda berada di luar wilayah Jember."`
     - **Tanpa lokasi:** `distanceKm` dibuang dan bobot dinormalisasi ulang menjadi harga `0.3571`, rating `0.4286`, fasilitas `0.2143` (**LULUS**); urutan rekomendasi ikut berubah.
     - **Catatan:** database test juga memuat 5 kedai asli (berada dalam radius 25 km) yang ikut masuk matriks SAW; nilai ekstrem min/max tetap berasal dari kedai uji sehingga skor tetap cocok. `searchShops` hanya mengembalikan **5 teratas**.
     - **Kesimpulan:** jarak terbukti ikut dihitung (Haversine, kriteria COST `min/x`, bobot `0.30`) dan memengaruhi urutan; tidak ada selisih terhadap hitungan manual.

11. **Riwayat Singkat (Git Log Terakhir)**
   - `05a50ed` Merge pull request #2 from nafisaqil24/docs/progress-notes
   - `acf7b04` docs: catatan progres proyek dan panduan diagnosa bug
   - `1397341` Merge pull request #1 from nafisaqil24/feat/chatbot-frontend
   - `0c152e8` fix(chat): fallback pencarian bertahap dan parser harga rb/k
   - `e5bead1` feat(chat): widget chatbot melayang dengan izin lokasi
   - `ea6e75d` fix(chat): perbaiki intent null dan batas token LLM
   - `51bb14c` feat(chat): route /api/chat dengan validasi, pembatas, dan template jawaban
   - `6ca3077` feat(chat): klien LLM dan pemahaman maksud dengan validasi ketat
   - `f9d4dac` feat(chat): layanan pencarian kedai dengan field publik terbatas
   - `407dc30` feat(chat): parser harga dan jam buka serta util geo
   *(Catatan diperbarui pada: 21 Oktober 2026. Perubahan belum di-commit: SAW, prioritas LLM, styling chatbot, dan script data uji.)*