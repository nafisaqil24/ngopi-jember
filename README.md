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

| Variabel | Kegunaan |
| --- | --- |
| `DATABASE_URL` | Koneksi PostgreSQL Prisma |
| `PORT` | Port API, default `4000` |
| `CLIENT_URL` | Asal frontend yang diizinkan CORS |
| `NODE_ENV` | Mode eksekusi aplikasi |
| `JWT_SECRET` | Kunci acak minimal 32 karakter untuk menandatangani JWT |

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
