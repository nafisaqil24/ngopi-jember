Kamu adalah frontend engineer yang detail soal UI. Tugasmu: MENYERUPAKAN tampilan halaman detail coffee shop di project Ngopi Jember dengan desain referensi yang ada di file `desain.md` (dan gambar referensi kalau ikut dilampirkan).

=== ATURAN UTAMA (WAJIB DIPATUHI) ===
1. HANYA ubah hal yang berkaitan dengan TAMPILAN frontend: JSX/markup (struktur layout), class Tailwind, CSS, font, warna, spacing, ikon, dan komponen presentasional.
2. JANGAN sentuh: folder backend/, schema Prisma, API route, service, logic fetch data, state management, routing, auth, validasi, test backend, file .env, dan package.json (kecuali memang butuh install font/ikon — kalau iya, TANYA DULU).
3. JANGAN ubah nama prop, nama fungsi, struktur data, atau hasil fetch API. Data tetap dipakai apa adanya; kamu cuma mengubah cara menampilkannya.
4. JANGAN hapus fitur yang sudah ada (mis. tombol, review, menu, chatbot widget). Kalau ada elemen di desain referensi yang datanya belum ada di API, tampilkan hanya jika data memang tersedia, kalau tidak, sembunyikan secara conditional rendering (jangan bikin data palsu, jangan ubah backend).
5. Tetap pakai stack yang sudah ada: React + TypeScript + Vite + Tailwind. Jangan ganti library UI.
6. Jangan hapus data.ts atau file data dummy.
7. Kerjakan di branch yang sedang aktif, jangan commit apa pun. Biar aku yang review dan commit sendiri.

=== LANGKAH 1: BACA & PAHAMI (jangan ngoding dulu) ===
- Baca `desain.md` sampai habis.
- Cari file halaman detail coffee shop di frontend/src (komponen halaman detail + komponen turunannya + Navbar kalau berpengaruh).
- Tampilkan ke aku: (a) daftar file yang akan kamu ubah, (b) daftar file yang sengaja TIDAK kamu ubah, (c) elemen desain yang datanya belum tersedia di API.
- Tunggu konfirmasi "lanjut" dariku sebelum mulai mengubah kode.

=== LANGKAH 2: TARGET TAMPILAN (setelah aku bilang lanjut) ===
Samakan dengan desain referensi, detailnya begini:

Layout umum:
- Background halaman warna krem/off-white hangat (bukan putih murni).
- Container lebar maksimal sekitar 1280px, center, padding horizontal yang lega.
- Halaman detail berupa 2 kolom di desktop: kolom kiri lebih lebar (foto utama + fasilitas + deskripsi), kolom kanan berupa kartu info (sticky kalau memungkinkan). Di mobile jadi 1 kolom bertumpuk.

Navbar:
- Kiri: logo bulat gelap berisi inisial "NJ" putih + teks "Ngopi" (gelap) dan "Jember" (oranye terracotta).
- Kanan: menu "Beranda" (aktif: oranye + garis bawah), "Jelajahi", "Panel Admin" (sesuai role yang sudah ada), badge user berbentuk pill dengan titik hijau dan font monospace, tombol "Keluar" berbentuk pill outline.
- Navbar background krem terang dengan bayangan tipis di bawah.

Tombol kembali:
- Pill outline dengan ikon panah kiri dan teks "Kembali menjelajahi", warna teks/ikon oranye, background krem muda.

Kolom kiri:
- Foto utama: lebar penuh kolom, rasio sekitar 2:1, sudut membulat besar (rounded-2xl), object-cover.
- Badge status di pojok kiri bawah foto: pill hijau muda dengan titik hijau + teks "Buka sekarang" (kalau tutup, pakai versi merah/abu dengan teks "Tutup"; ikuti logika buka/tutup yang sudah ada, jangan ubah logikanya).
- Heading "Fasilitas" (bold), di bawahnya chip-chip fasilitas: pill abu-krem, ikon oranye di kiri, teks abu di kanan, tinggi seragam, jarak antar chip rapi dan wrap kalau kepanjangan.
- Judul/tagline deskripsi (font sedang, gelap) lalu paragraf deskripsi abu muda dengan line-height longgar dan lebar teks dibatasi supaya nyaman dibaca.

Kolom kanan (kartu info):
- Kartu putih, rounded-2xl, bayangan lembut, padding lega.
- Label kategori kecil berwarna oranye dengan ikon tag di kiri.
- Nama kedai: huruf besar, extra bold, warna cokelat gelap.
- Alamat: ikon pin oranye di kiri + teks abu, boleh wrap 2 baris.
- Rating: ikon bintang oranye + angka besar tebal oranye, di bawahnya keterangan kecil abu (sumber rating, tanggal, jumlah ulasan) — tampilkan hanya yang datanya ada.
- Garis pemisah tipis.
- Heading "Informasi lokasi" (bold). Dua baris info dengan ikon bulat outline oranye: "Jam operasional" (label kecil abu, nilai bold gelap) dan "Kisaran harga" (ikon bulat oranye solid bertuliskan "Rp").
- Tiga tombol full-width berbentuk pill (rounded-full), tinggi ±48px:
  1. WhatsApp: solid oranye terracotta, teks + ikon putih.
  2. Instagram: outline oranye, teks + ikon oranye.
  3. Buka Google Maps: outline oranye, ikon pin.
  Tombol hanya muncul kalau datanya ada (nomor WA / link IG / link Maps). Hover: sedikit lebih gelap / ada transisi halus.

Gaya global:
- Font: sans-serif modern bersih (mirip Inter). Kalau perlu tambah font, pakai yang sudah ada dulu, tanya aku sebelum install apa pun.
- Palet: oranye terracotta (aksen utama, sekitar #C2410C s.d. #C8501A), cokelat gelap hampir hitam (judul), abu hangat (teks sekunder), krem (#FAF7F2 atau mirip) sebagai background.
- Ambil nilai warna/ukuran PERSIS dari `desain.md` kalau ada; kalau bentrok dengan instruksi di atas, `desain.md` yang menang.
- Gunakan design token / Tailwind theme extend di tempat yang sudah ada kalau project sudah punya, jangan hardcode berulang kali.
- Responsif: cek di lebar 375px, 768px, dan 1280px. Tidak boleh ada horizontal scroll.
- Pertahankan aksesibilitas dasar: alt pada gambar, kontras teks cukup, tombol bisa difokus keyboard.

=== LANGKAH 3: VERIFIKASI ===
Setelah selesai, jalankan di folder frontend:
- npm run lint
- npm run build
(Jangan jalankan test backend. Jangan jalankan seed/reset/cleanup apa pun di database.)

Lalu laporkan ke aku:
1. Daftar file yang diubah + ringkasan perubahan tiap file.
2. Konfirmasi eksplisit bahwa tidak ada file backend/logic yang berubah (tunjukkan hasil `git status` dan `git diff --stat`).
3. Elemen desain yang tidak bisa ditampilkan karena datanya tidak ada di API.
4. Hasil lint dan build.
5. Cara aku ngecek hasilnya di browser (URL halaman, ukuran layar yang perlu dites).

Kalau ada hal yang ambigu atau berpotensi menyentuh logika, BERHENTI dan tanya aku dulu, jangan menebak.