# Catatan Progres - Ngopi Jember

1. **Ringkasan Proyek**
   Ngopi Jember adalah platform direktori kafe dan kedai kopi di Jember. Dibangun dengan tumpukan teknologi React 19 + TypeScript + Vite + Tailwind v4 di sisi frontend, serta Node.js + Express + Prisma + PostgreSQL di sisi backend. Fitur inti aplikasi sudah lengkap dan siap demo, meliputi: autentikasi berbasis JWT (User, Owner, Admin), manajemen dan verifikasi kedai kopi, pencarian dan halaman detail kedai dengan ulasan, analitik kedai untuk owner, serta upload gambar (lokal/Cloudinary).

2. **Status Fitur Chatbot**
   Fitur chatbot sudah **SELESAI** dan di-merge ke branch `main` melalui PR #1 (merge commit `1397341`):
   - **Backend:** Endpoint publik `POST /api/chat` tanpa login. Urutan middleware/pipeline: rate limiter per IP -> validasi Zod body -> validasi koordinat GPS di wilayah Jember -> pengecekan status LLM aktif -> pengecekan kuota harian -> pemahaman maksud (`intent`) -> pencarian kedai / FAQ -> perender template jawaban.
   - **Frontend:** Tombol bulat melayang di pojok kanan bawah (hanya tampil di halaman `/`, `/coffee-shops`, dan `/coffee-shops/:slug`), panel jendela chat interaktif, kartu kedai mini untuk hasil rekomendasi, serta manajemen izin GPS (koordinat dibulatkan 3 desimal, disimpan di memori state React, tidak masuk ke local storage).
   - **LLM:** Menggunakan Groq (kompatibel dengan OpenAI API), model `openai/gpt-oss-20b`, `max_tokens: 1024`, `reasoning_effort: 'low'`, dan `response_format: { type: 'json_object' }`.
   - **Pengaman & Ketahanan:** Batas rate limit 5 req/menit dan 30 req/jam per IP, kuota harian `CHAT_DAILY_LIMIT` (default 800, counter di memori), batasan ukuran body request `/api/chat` maksimum 4kb (ditangani middleware `errorHandler` mengembalikan status 413 tanpa bocoran stack trace), respons publik tidak pernah membocorkan field sensitif (`ownerId`, `subscription`, `email`), respons seragam `"Chatbot lagi istirahat, coba lagi nanti ya."` (status 200) untuk LLM mati maupun kuota habis, serta log server yang bersih dari isi pesan pengguna dan kunci API.
   - **Pencarian Cerdas:** Mendukung filter kecamatan, fasilitas, harga, status buka sekarang, dan jarak radius GPS. Dilengkapi mekanisme *fallback* bertahap saat hasil 0 (tahap a: melonggarkan filter fasilitas; tahap b: melonggarkan filter harga) dengan balasan yang jujur. Parser harga mendukung format standar (`"Rp25000 - Rp50000"`), serta singkatan `"rb"`, `"k"`, dan `"ribu"`.

3. **Peta Kode**

| Area | File | Tanggung Jawab / Fungsi Utama |
|---|---|---|
| Backend | `backend/src/chat/chat.routes.ts` | Endpoint router untuk `/api/chat` dengan rate limiter dan validasi payload. |
| Backend | `backend/src/chat/limits.ts` | Manajemen rate limit per IP dan kuota harian (`CHAT_DAILY_LIMIT`) di memori. |
| Backend | `backend/src/chat/schema.ts` | Skema validasi Zod ketat (`.strict()`) untuk intent, filter, dan payload chat. |
| Backend | `backend/src/chat/intent.ts` | Parsing dan normalisasi intent pengguna dari LLM dengan pembersihan key `null` rekursif. |
| Backend | `backend/src/chat/prompts.ts` | Konstruksi system prompt dan daftar fasilitas/kategori valid untuk LLM. |
| Backend | `backend/src/chat/llm.client.ts` | Klien HTTP fetch ke penyedia LLM (Groq) dengan penanganan error aman dan `reasoning_effort`. |
| Backend | `backend/src/chat/search.service.ts` | Layanan pencarian kedai dengan filter, field publik terbatas, dan mekanisme fallback bertahap. |
| Backend | `backend/src/chat/parsers.ts` | Utilitas parsing range harga (mendukung titik, rb, k, ribu) dan status buka/tutup jam operasional. |
| Backend | `backend/src/chat/geo.ts` | Perhitungan jarak geografis (Haversine) dan validasi titik koordinat dalam wilayah Jember. |
| Backend | `backend/src/chat/templates.ts` | Perender template balasan teks jujur dan ramah untuk berbagai intent dan hasil pencarian. |
| Backend | `backend/src/chat/faq.ts` | Sumber jawaban tanya jawab (FAQ) seputar platform Ngopi Jember. |
| Backend | `backend/src/app.ts` | Konfigurasi aplikasi Express utama termasuk trust proxy, security headers, dan router chat. |
| Backend | `backend/src/middleware/errorHandler.ts` | Penanganan error terpusat (termasuk batas ukuran body 413 dan error generik tanpa stack trace). |
| Frontend | `frontend/src/services/chat.ts` | Layanan API klien frontend untuk memanggil endpoint `/api/chat`. |
| Frontend | `frontend/src/hooks/useChat.ts` | Hook state manajemen chat (riwayat pesan, status loading, penanganan error ramah). |
| Frontend | `frontend/src/hooks/useGeolocation.ts` | Hook manajemen izin dan pengambilan koordinat GPS pengguna dengan pembulatan 3 desimal di memori. |
| Frontend | `frontend/src/components/chat/ChatWidget.tsx` | Tombol bulat melayang untuk membuka/tutup widget chat. |
| Frontend | `frontend/src/components/chat/ChatPanel.tsx` | Panel jendela chat interaktif dengan input pesan dan daftar riwayat percakapan. |
| Frontend | `frontend/src/components/chat/ChatShopCard.tsx` | Komponen kartu mini kedai kopi untuk menampilkan hasil rekomendasi di chat. |
| Frontend | `frontend/src/App.tsx` | Definisi routing aplikasi React dan allowlist rute halaman yang menampilkan widget chat. |

4. **Kontrak API (`/api/chat`)**
   - **Request (POST):** Body JSON `{ message: string (1-300 char), location?: { lat: number, lng: number }, history?: Array<{ role: 'user' | 'assistant', content: string (maks 300 char) }> }`.
   - **Respons Sukses (200 OK):** `{ success: true, data: { reply: string, shops?: Array<PublicShopResult>, needsLocation?: boolean } }`.
   - **Respons Error (400 Bad Request / 413 Payload Too Large / 429 Too Many Requests):** `{ success: false, message: string }`.

5. **Panduan Diagnosa Bug**

| Gejala / Error | Kemungkinan Penyebab | File untuk Dicek | Cara Membuktikan |
|---|---|---|---|
| Balasan `"Chatbot lagi istirahat..."` | Variabel env LLM belum diatur/belum restart server, atau kuota harian habis. | `backend/src/chat/llm.client.ts`, `backend/src/chat/limits.ts` | Cek log server `[Chat] reason=llm_disabled` atau `reason=daily_quota`. |
| Balasan sapaan generik (`smalltalk`) padahal pertanyaan pencarian jelas | Model LLM gagal validasi Zod atau mengalami error dari provider. | `backend/src/chat/intent.ts`, `backend/src/chat/llm.client.ts` | Cek log `[LLM] error`, `[Intent] Error parsing intent`, atau respons JSON mentah dari LLM. |
| Hasil pencarian kedai kosong (`0` hasil) | Data kedai di database belum lengkap (mis. fasilitas kedai belum ditautkan atau rentang harga kosong). | `backend/src/chat/search.service.ts` | Periksa data kedai di database dan lihat metadata `fallbackUsed` pada respons pencarian. |
| Tombol chat tidak terlihat atau tata letak aneh di HP DevTools | Browser DevTools sedang melakukan zoom/scaling tampilan. | `frontend/src/components/chat/ChatWidget.tsx` | Cek `visualViewport.scale` di browser (bukan bug kode aplikasi). |
| Gagal meminta izin lokasi GPS | Browser menolak karena tidak menggunakan HTTPS atau bukan di `localhost`. | `frontend/src/hooks/useGeolocation.ts` | Cek console browser untuk error Geolocation API. |
| Seluruh pesan pengguna terkena error 429 (`Too Many Requests`) | Salah konfigurasi `TRUST_PROXY` di environment produksi (semua request terbaca berasal dari IP proxy yang sama). | `backend/src/app.ts` | Cek nilai `app.set('trust proxy', ...)` dan header `X-Forwarded-For`. |

   *Arti Baris Log:*
   - `[Chat] status=... reason=... intent=... duration=...` -> Catatan eksekusi endpoint chat masuk beserta alasan fallback atau durasi.
   - `[LLM] status=... duration=... model=...` -> Catatan panggilan sukses ke penyedia LLM.
   - `[LLM] error status=... duration=... model=... code=... message=...` -> Catatan error aman dari provider LLM (tanpa membocorkan key/pesan pengguna).
   - `[Intent] Error parsing intent...` -> Catatan ketika parsing atau validasi JSON intent dari LLM gagal.

6. **Masalah dan Catatan yang Diketahui**
   - Test `analytics.test.ts` terkadang *flaky* karena bentrok data slug di database pengujian bersama tanpa pembersihan tersendiri; tidak terkait dengan fitur chatbot.
   - Definisi `"murah"` (`maxPrice`) ditentukan secara dinamis oleh LLM berdasarkan instruksi teks di prompt (`prompts.ts`), bukan batasan angka statis di kode backend.
   - Deteksi error lokasi di `useChat.ts` menggunakan pencocokan teks pesan error karena objek `ApiError` tidak membawa status HTTP.
   - Lebar komponen Toast (`Toast.tsx`) selebar ~384px dapat sedikit melebihi layar ponsel sempit (393px), berasal dari komponen global di luar chatbot.
   - Klien Groq pada free tier memiliki batas laju (`TPM`) yang perlu diperhatikan saat pengujian beruntun.
   - Counter kuota harian disimpan di memori, sehingga akan tereset saat server restart dan tidak akurat untuk arsitektur multi-instance/serverless.
   - **Hasil Verifikasi Terakhir (Langkah 2):** Backend `src/chat` (34 test) **LULUS**; Frontend (56 test) **LULUS**; Build backend dan frontend **BERHASIL**.

7. **To-Do Berikutnya (Belum Dikerjakan)**
   - Uji coba langsung di perangkat seluler fisik (melalui port forwarding USB atau hosting HTTPS).
   - Meninjau kembali dan menetapkan kepastian definisi angka `"murah"` jika diperlukan.
   - Merapikan penataan lebar komponen Toast global.
   - Memperbaiki test `analytics.test.ts` di PR terpisah.

8. **Cara Menjalankan & Environment**
   - **Environment Variables (Nama Saja):** `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_TIMEOUT_MS`, `CHAT_DAILY_LIMIT`, `TRUST_PROXY`, `VITE_API_URL`, `DATABASE_URL`, `DIRECT_URL`.
   - **Backend:** 
     - Jalankan dev: `npm run dev` (di folder `backend`)
     - Jalankan test chat: `npx vitest run src/chat`
     - Build: `npm run build`
   - **Frontend:**
     - Jalankan dev: `npm run dev` (di folder `frontend`)
     - Jalankan test: `npm test`
     - Build: `npm run build`

9. **Riwayat Singkat (Git Log Terakhir)**
   - `1397341` Merge pull request #1 from nafisaqil24/feat/chatbot-frontend
   - `0c152e8` fix(chat): fallback pencarian bertahap dan parser harga rb/k
   - `e5bead1` feat(chat): widget chatbot melayang dengan izin lokasi
   - `ea6e75d` fix(chat): perbaiki intent null dan batas token LLM
   - `51bb14c` feat(chat): route /api/chat dengan validasi, pembatas, dan template jawaban
   - `6ca3077` feat(chat): klien LLM dan pemahaman maksud dengan validasi ketat
   - `f9d4dac` feat(chat): layanan pencarian kedai dengan field publik terbatas
   - `407dc30` feat(chat): parser harga dan jam buka serta util geo
   - `4e41a1b` fix(frontend): default API base URL ke /api di production
   - `969d2f6` chore(deps): audit fix non-breaking (proxy-addr, multer, ip-address, source-map-js)
   *(Catatan dibuat pada: 19 Oktober 2026)*
