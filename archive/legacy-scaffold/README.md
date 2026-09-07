# Ngopi Jember

Platform direktori coffee shop khusus wilayah Jember. Membantu pengunjung
menemukan coffee shop berdasarkan lokasi, harga, rating, fasilitas, dan
suasana — sekaligus membantu pemilik coffee shop mempromosikan tempat
usahanya.

> Status: **PHASE 1 selesai** (Project setup + frontend dasar). Backend,
> database, autentikasi, dan dashboard belum dibangun — akan menyusul di
> phase berikutnya.

## Tech Stack

**Frontend** (sudah berjalan)
- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4
- React Router v7

**Rencana Backend** (belum dibangun)
- Node.js + Express.js + TypeScript
- PostgreSQL + Prisma ORM
- JWT + bcrypt
- Zod untuk validasi

## Struktur Project

```
ngopi-jember/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── layout/       # Navbar, Footer
│       │   └── coffeeshop/   # Kartu coffee shop, dsb.
│       ├── pages/            # Home, Explorer, Detail, Login, Register
│       ├── layouts/          # MainLayout (navbar + konten + footer)
│       ├── hooks/            # (belum dipakai, disiapkan untuk PHASE berikutnya)
│       ├── services/         # (belum dipakai, untuk pemanggilan API nanti)
│       ├── types/            # Tipe data TypeScript, mis. CoffeeShop
│       ├── utils/            # Data dummy & helper
│       └── assets/
└── README.md
```

## Cara Menjalankan (Frontend)

```bash
cd frontend
npm install
npm run dev
```

Buka `http://localhost:5173`.

## Build Production

```bash
cd frontend
npm run build
```

## Lint

```bash
cd frontend
npm run lint
```

## Catatan

Data coffee shop yang tampil di Home saat ini masih **data dummy**
(`src/utils/dummyCoffeeShops.ts`) untuk keperluan tampilan, bukan data
coffee shop nyata di Jember. Data ini akan digantikan oleh data dari
REST API setelah backend dan database dibangun.
