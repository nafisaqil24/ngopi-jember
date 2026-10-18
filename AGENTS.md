Selalu jawab dan berkomunikasi menggunakan Bahasa Indonesia, kecuali untuk kode/variable/nama teknis.

- Test hanya boleh jalan ke Neon branch 'test' (backend/.env.test). Dilarang menjalankan npm test jika .env.test belum ada atau hostnya sama dengan DB utama. Dilarang menjalankan seed/reset/cleanup --confirm ke DB utama tanpa persetujuan eksplisit user.
- Jangan pernah menampilkan password, token, atau connection string utuh di output. Samarkan nilainya (contoh: `****`).
- Jangan jalankan `prisma:reset` / `prisma:cleanup-test` dengan `--confirm` tanpa persetujuan eksplisit user. Selalu jalankan mode preview dulu.
- Jangan edit file `.env*` (`.env`, `.env.test`, `.env.production`, dll.).
- Neon butuh dua koneksi ke database yang sama: `DATABASE_URL` = pooled (host ada `-pooler`, `pgbouncer=true`, dipakai runtime) dan `DIRECT_URL` = direct (tanpa `-pooler`, dipakai `prisma migrate`).

- Sebelum menjawab pertanyaan tentang progres, status, atau 'sampai mana', baca docs/PROGRESS.md, lalu verifikasi kondisi nyata dengan git branch --show-current, git status --short, dan git log --oneline -10. Jika catatan bertentangan dengan kondisi nyata, percayai kondisi nyata dan sebutkan perbedaannya.
- Saat pengguna melaporkan bug atau error, mulai dari 'Panduan diagnosa bug' dan 'Peta kode' di docs/PROGRESS.md; sebutkan file:baris dugaan penyebab beserta cara membuktikannya. Jangan menebak: buktikan dengan log, test, atau skrip sementara yang dihapus setelahnya.
- Setiap selesai satu tahap pekerjaan yang berarti, tawarkan untuk memperbarui docs/PROGRESS.md (bagian status, masalah yang diketahui, dan to-do). Jangan menulis rahasia ke file itu.