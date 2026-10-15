import { Link } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";

// Halaman 404, dipindah dari App.tsx. Dipakai untuk 2 kasus:
// 1. Route yang tidak dikenal sama sekali (wildcard "*")
// 2. Slug coffee shop yang tidak ditemukan (dipanggil dari
//    CoffeeShopDetail.tsx dengan prop shop={true})

export default function NotFound({ shop = false }: { shop?: boolean }) {
  return (
    <MainLayout>
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <p className="text-6xl">☕</p>
        <h1 className="mt-5 text-3xl font-black text-heading">
          {shop ? "Coffee Shop tidak ditemukan" : "Halaman tidak ditemukan"}
        </h1>
        <p className="mt-3 text-body">
          {shop
            ? "Kedai yang kamu cari mungkin sudah tidak tersedia atau tautannya keliru."
            : "Alamat yang kamu buka tidak tersedia."}
        </p>
        <Link
          to={shop ? "/coffee-shops" : "/"}
          className="mt-6 rounded-xl bg-espresso px-5 py-3 font-bold text-cream shadow-md hover:bg-espresso/90 transition"
        >
          {shop ? "Kembali menjelajah" : "Kembali ke beranda"}
        </Link>
      </main>
    </MainLayout>
  );
}