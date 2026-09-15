import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MainLayout from "../layouts/MainLayout";
import CoffeeShopCard from "../components/coffeeshop/CoffeeShopCard";
import { listCoffeeShops, getImageUrl, ApiError, type ApiCoffeeShopCard } from "../services/coffeeShop";
import type { CoffeeShop } from "../types/coffeeShop";

function mapToCoffeeShop(item: ApiCoffeeShopCard): CoffeeShop {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: "",
    district: item.district,
    address: "",
    priceRange: item.priceRange,
    rating: item.rating ?? 0,
    reviewCount: item.reviewCount,
    facilities: item.facilities.map((facility) => facility.name),
    imageUrl: getImageUrl(item.image) ?? "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85",
    isFeatured: item.isFeatured,
    isOpenNow: item.status === "OPEN",
  };
}

function Section({
  title,
  subtitle,
  shops,
  loading,
  error,
  tinted = false,
}: {
  title: string;
  subtitle: string;
  shops: CoffeeShop[];
  loading: boolean;
  error: string;
  tinted?: boolean;
}) {
  return (
    <section className={`mt-16 px-5 py-12 ${tinted ? "bg-white" : ""}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto max-w-7xl"
      >
        <div className="mb-7 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-950">{title}</h2>
            <p className="mt-2 text-slate-800 font-medium">{subtitle}</p>
          </div>
          <Link
            className="hidden font-mono text-xs font-bold text-indigo-700 hover:underline sm:block"
            to="/coffee-shops"
          >
            Lihat semua →
          </Link>
        </div>

        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 rounded-2xl skeleton" />
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="text-sm font-bold text-red-600">{error}</p>
        )}

        {!loading && !error && shops.length === 0 && (
          <p className="text-sm text-slate-600 font-medium">Belum ada coffee shop dalam kategori ini.</p>
        )}

        {!loading && !error && shops.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((shop, index) => (
              <CoffeeShopCard key={shop.id} coffeeShop={shop} index={index} />
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
}

function CTA() {
  return (
    <>
      <motion.section
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden mx-5 mt-16 rounded-3xl bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-12 text-center text-white sm:mx-auto sm:max-w-7xl shadow-xl"
      >
        <motion.div
          className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <h2 className="text-3xl font-black">Sudah tahu mau ngopi di mana?</h2>
        <p className="mt-3 text-white/90">
          Jelajahi lebih banyak pilihan berdasarkan lokasi, harga, dan fasilitas.
        </p>
        <motion.div
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="inline-block mt-6"
        >
          <Link
            to="/coffee-shops"
            className="group inline-flex items-center gap-2.5 rounded-xl bg-white px-7 py-4 font-bold text-indigo-900 shadow-xl hover:bg-slate-50 transition-all duration-300 ring-2 ring-white/50 hover:ring-white"
          >
            <span>Jelajahi coffee shop</span>
            <motion.span
              className="inline-block text-lg"
              animate={{ x: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            >
              →
            </motion.span>
          </Link>
        </motion.div>
      </motion.section>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mx-auto mt-16 max-w-7xl px-5 text-center"
      >
        <p className="font-mono text-xs font-bold text-indigo-700 tracking-wider">UNTUK PEMILIK KEDAI</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">Punya coffee shop di Jember?</h2>
        <p className="mt-3 text-slate-800 font-medium">
          Bantu lebih banyak orang menemukan kedaimu dan ceritakan keunikan kopimu.
        </p>
        <motion.div
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="inline-block mt-6"
        >
          <Link
            to="/register"
            className="group inline-flex items-center gap-2.5 rounded-xl border-2 border-indigo-600 bg-indigo-50/50 px-7 py-4 font-bold text-indigo-950 shadow-sm hover:bg-indigo-600 hover:text-white transition-all duration-300"
          >
            <motion.span
              className="inline-block"
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", repeatDelay: 1 }}
            >
              ☕
            </motion.span>
            <span>Daftarkan coffee shop</span>
            <span className="text-indigo-600 group-hover:text-white transition-colors">✨</span>
          </Link>
        </motion.div>
      </motion.section>
    </>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const [popularShops, setPopularShops] = useState<CoffeeShop[]>([]);
  const [featuredShops, setFeaturedShops] = useState<CoffeeShop[]>([]);
  const [newShops, setNewShops] = useState<CoffeeShop[]>([]);

  const [loadingPopular, setLoadingPopular] = useState(true);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingNew, setLoadingNew] = useState(true);

  const [errorPopular, setErrorPopular] = useState("");
  const [errorFeatured, setErrorFeatured] = useState("");
  const [errorNew, setErrorNew] = useState("");

  useEffect(() => {
    // 1. Popular (sort=popular)
    listCoffeeShops({ sort: "popular", limit: 3 })
      .then((res) => setPopularShops(res.data.map(mapToCoffeeShop)))
      .catch((err) => setErrorPopular(err instanceof ApiError ? err.message : "Gagal memuat data populer"))
      .finally(() => setLoadingPopular(false));

    // 2. Featured (featured=true)
    listCoffeeShops({ featured: "true", limit: 3 })
      .then((res) => setFeaturedShops(res.data.map(mapToCoffeeShop)))
      .catch((err) => setErrorFeatured(err instanceof ApiError ? err.message : "Gagal memuat data featured"))
      .finally(() => setLoadingFeatured(false));

    // 3. New (sort=new)
    listCoffeeShops({ sort: "new", limit: 3 })
      .then((res) => setNewShops(res.data.map(mapToCoffeeShop)))
      .catch((err) => setErrorNew(err instanceof ApiError ? err.message : "Gagal memuat data terbaru"))
      .finally(() => setLoadingNew(false));
  }, []);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    navigate("/coffee-shops?q=" + encodeURIComponent(query));
  }

  return (
    <MainLayout>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden px-5 py-20 text-center sm:py-28"
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,#efd3bd,transparent_45%)]" />
        <p className="font-mono text-xs font-semibold tracking-widest text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-500/20 inline-block mb-3 shadow-2xs">
          SYSTEM // COFFEE DIRECTORY & CURATION
        </p>
        <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black leading-tight text-slate-950 sm:text-6xl">
          Temukan Tempat Ngopi Favoritmu di Jember
        </h1>
        <p className="mx-auto mt-5 max-w-2xl leading-7 text-slate-900 font-medium">
          Dari sudut tenang untuk bekerja hingga tempat seru untuk berbagi
          cerita—temukan kedai yang cocok untuk harimu.
        </p>
        <form
          onSubmit={handleSearch}
          className="mx-auto mt-8 flex max-w-2xl rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-300"
        >
          <input
            aria-label="Cari coffee shop"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent px-4 outline-none font-sans text-slate-950 placeholder:text-slate-500 font-medium"
            placeholder="Cari coffee shop atau kecamatan..."
          />
          <button className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-500 transition">
            Cari
          </button>
        </form>
      </motion.section>

      <Section
        title="Coffee shop populer"
        subtitle="Pilihan yang paling banyak dicari warga Jember."
        shops={popularShops}
        loading={loadingPopular}
        error={errorPopular}
      />
      <Section
        title="Pilihan featured"
        subtitle="Kedai dengan pengalaman yang istimewa."
        shops={featuredShops}
        loading={loadingFeatured}
        error={errorFeatured}
        tinted
      />
      <Section
        title="Baru di Jember"
        subtitle="Tempat baru untuk masuk daftar ngopimu."
        shops={newShops}
        loading={loadingNew}
        error={errorNew}
      />

      <CTA />
    </MainLayout>
  );
}
