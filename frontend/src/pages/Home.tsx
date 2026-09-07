import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import CoffeeShopCard from "../components/coffeeshop/CoffeeShopCard";
import { coffeeShops, type CoffeeShopWithExtra } from "../data";

// Halaman Home dipindah dari App.tsx (yang tadinya numpuk semua komponen
// jadi satu file) ke sini. Perubahan utama:
// 1. Pakai <MainLayout> (Navbar + Footer terpusat) bukan <Layout> inline.
// 2. Pakai <CoffeeShopCard> yang sudah diperbaiki warnanya, bukan <Card>
//    versi lama yang ada di dalam App.tsx.
// 3. Filter isPopular/isFeatured/isNew tetap jalan karena coffeeShops
//    sekarang bertipe CoffeeShopWithExtra (superset dari CoffeeShop),
//    jadi field itu masih tersedia.

function Section({
  title,
  subtitle,
  shops,
  tinted = false,
}: {
  title: string;
  subtitle: string;
  shops: CoffeeShopWithExtra[];
  tinted?: boolean;
}) {
  return (
    <section className={`mt-16 px-5 py-12 ${tinted ? "bg-white" : ""}`}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-black">{title}</h2>
            <p className="mt-2 text-espresso/65">{subtitle}</p>
          </div>
          <Link
            className="hidden text-sm font-bold text-terracotta sm:block"
            to="/coffee-shops"
          >
            Lihat semua →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <CoffeeShopCard key={shop.id} coffeeShop={shop} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <>
      <section className="mx-5 mt-16 rounded-3xl bg-terracotta px-6 py-12 text-center text-white sm:mx-auto sm:max-w-7xl">
        <h2 className="text-3xl font-black">Sudah tahu mau ngopi di mana?</h2>
        <p className="mt-3 text-white/80">
          Jelajahi lebih banyak pilihan berdasarkan lokasi, harga, dan fasilitas.
        </p>
        <Link
          to="/coffee-shops"
          className="mt-6 inline-block rounded-xl bg-white px-5 py-3 font-bold text-terracotta"
        >
          Jelajahi coffee shop
        </Link>
      </section>
      <section className="mx-auto mt-16 max-w-7xl px-5 text-center">
        <p className="text-sm font-bold text-terracotta">UNTUK PEMILIK KEDAI</p>
        <h2 className="mt-2 text-3xl font-black">Punya coffee shop di Jember?</h2>
        <p className="mt-3 text-espresso/70">
          Bantu lebih banyak orang menemukan kedaimu dan ceritakan keunikan kopimu.
        </p>
        <Link
          to="/register"
          className="mt-6 inline-block rounded-xl border border-espresso/20 px-5 py-3 font-bold"
        >
          Daftarkan coffee shop
        </Link>
      </section>
    </>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    navigate("/coffee-shops?q=" + encodeURIComponent(query));
  }

  return (
    <MainLayout>
      <section className="relative overflow-hidden px-5 py-20 text-center sm:py-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,#efd3bd,transparent_45%)]" />
        <p className="text-sm font-bold tracking-wide text-terracotta">
          DIREKTORI COFFEE SHOP LOKAL
        </p>
        <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
          Temukan Tempat Ngopi Favoritmu di Jember
        </h1>
        <p className="mx-auto mt-5 max-w-2xl leading-7 text-espresso/70">
          Dari sudut tenang untuk bekerja hingga tempat seru untuk berbagi
          cerita—temukan kedai yang cocok untuk harimu.
        </p>
        <form
          onSubmit={handleSearch}
          className="mx-auto mt-8 flex max-w-2xl rounded-2xl bg-white p-2 shadow-lg ring-1 ring-espresso/10"
        >
          <input
            aria-label="Cari coffee shop"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent px-3 outline-none"
            placeholder="Cari coffee shop atau kecamatan..."
          />
          <button className="rounded-xl bg-espresso px-5 py-3 text-sm font-bold text-cream">
            Cari
          </button>
        </form>
      </section>

      <Section
        title="Coffee shop populer"
        subtitle="Pilihan yang paling banyak dicari warga Jember."
        shops={coffeeShops.filter((shop) => shop.isPopular).slice(0, 3)}
      />
      <Section
        title="Pilihan featured"
        subtitle="Kedai dengan pengalaman yang istimewa."
        shops={coffeeShops.filter((shop) => shop.isFeatured).slice(0, 3)}
        tinted
      />
      <Section
        title="Baru di Jember"
        subtitle="Tempat baru untuk masuk daftar ngopimu."
        shops={coffeeShops.filter((shop) => shop.isNew).slice(0, 3)}
      />

      <CTA />
    </MainLayout>
  );
}