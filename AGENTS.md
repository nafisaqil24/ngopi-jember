Selalu jawab dan berkomunikasi menggunakan Bahasa Indonesia, kecuali untuk kode/variable/nama teknis.

- Test hanya boleh jalan ke Neon branch 'test' (backend/.env.test). Dilarang menjalankan npm test jika .env.test belum ada atau hostnya sama dengan DB utama. Dilarang menjalankan seed/reset/cleanup --confirm ke DB utama tanpa persetujuan eksplisit user.
- Jangan pernah menampilkan password, token, atau connection string utuh di output. Samarkan nilainya (contoh: `****`).
- Jangan jalankan `prisma:reset` / `prisma:cleanup-test` dengan `--confirm` tanpa persetujuan eksplisit user. Selalu jalankan mode preview dulu.
- Jangan edit file `.env*` (`.env`, `.env.test`, `.env.production`, dll.).
- Neon butuh dua koneksi ke database yang sama: `DATABASE_URL` = pooled (host ada `-pooler`, `pgbouncer=true`, dipakai runtime) dan `DIRECT_URL` = direct (tanpa `-pooler`, dipakai `prisma migrate`).