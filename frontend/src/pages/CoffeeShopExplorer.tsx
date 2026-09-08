import { useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import CoffeeShopCard from "../components/coffeeshop/CoffeeShopCard";
import { listCoffeeShops, listFacilities, getImageUrl, ApiError, type ApiCoffeeShopCard, type ApiFacility } from "../services/coffeeShop";
import type { CoffeeShop } from "../types/coffeeShop";

// Halaman pencarian & filter coffee shop, sekarang fetch data ASLI dari
// backend (sebelumnya pakai data dummy dari data.ts).
//
// PERUBAHAN PENTING dibanding versi dummy:
// 1. Filter (search, district, facility, minRating) dikirim ke backend
//    lewat query params -- backend yang melakukan filtering, bukan
//    frontend lagi. Ini lebih efisien karena tidak perlu fetch SEMUA
//    data lalu filter di browser.
// 2. Sort "terbaru"/"rating" masih dilakukan di frontend untuk
//    "populer" (backend tidak punya sort by isPopular karena field itu
//    tidak ada di database -- itu cuma ada di data dummy lama).
// 3. Perlu state loading & error karena sekarang benar-benar menunggu
//    jawaban dari server yang bisa lambat atau gagal.
// 4. Daftar "district" untuk dropdown filter TIDAK ADA endpoint
//    khususnya di backend, jadi untuk sementara masih pakai daftar
//    kecamatan Jember yang di-hardcode manual di bawah. Fasilitas
//    (untuk dropdown filter fasilitas) SUDAH ada endpoint-nya
//    (/api/facilities), jadi itu di-fetch beneran.

// Kecamatan di Jember. Backend belum punya endpoint /api/districts,
// jadi daftar ini sementara di-hardcode. Kalau nanti ada endpoint
// khusus, tinggal ganti jadi fetch seperti listFacilities().
const JEMBER_DISTRICTS = [
  "Sumbersari",
  "Kaliwates",
  "Patrang",
  "Ajung",
  "Arjasa",
];

// Fungsi mapper: mengubah bentuk data dari API (ApiCoffeeShopCard)
// menjadi bentuk yang dibutuhkan oleh CoffeeShopCard (CoffeeShop).
// Diperlukan karena field API image: string | null berbeda dari
// komponen yang butuh imageUrl: string (tidak boleh null).
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

function Select({
  value,
  onChange,
  label,
  items,
  suffix = "",
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  items: string[];
  suffix?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
    >
      <option value="">{label}</option>
      {items.map((item) => (
        <option key={item} value={item}>
          {item}
          {suffix}
        </option>
      ))}
    </select>
  );
}

function Empty({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-espresso/20 bg-white px-6 py-16 text-center">
      <p className="text-4xl">☕</p>
      <h2 className="mt-3 text-xl font-black">Coffee shop tidak ditemukan</h2>
      <p className="mt-2 text-sm text-espresso/65">
        Coba ubah kata kunci atau hapus beberapa filter.
      </p>
      <button
        onClick={reset}
        className="mt-5 rounded-xl bg-espresso px-4 py-2 text-sm font-bold text-cream"
      >
        Tampilkan semua
      </button>
    </div>
  );
}

export default function CoffeeShopExplorer() {
  const params = new URLSearchParams(location.search);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [district, setDistrict] = useState("");
  const [rating, setRating] = useState("");
  const [facility, setFacility] = useState("");
  const [sort, setSort] = useState("newest");

  const [shops, setShops] = useState<ApiCoffeeShopCard[]>([]);
  const [facilities, setFacilities] = useState<ApiFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch daftar fasilitas sekali saja saat halaman dibuka, untuk
  // mengisi dropdown filter fasilitas.
  useEffect(() => {
    listFacilities()
      .then((result) => setFacilities(result.data))
      .catch(() => setFacilities([]));
  }, []);

  // Fetch daftar coffee shop setiap kali filter berubah. Query string
  // dikirim ke backend (bukan filter manual di frontend).
  useEffect(() => {
    setLoading(true);
    setError("");
    listCoffeeShops({
      search: query || undefined,
      district: district || undefined,
      minRating: rating ? Number(rating) : undefined,
      facility: facility || undefined,
    })
      .then((result) => setShops(result.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat data coffee shop."))
      .finally(() => setLoading(false));
  }, [query, district, rating, facility]);

  const sortedShops = useMemo(() => {
    const copy = [...shops];
    if (sort === "rating") return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return copy; // "newest": backend sudah urutkan featured + createdAt desc
  }, [shops, sort]);

  function reset() {
    setQuery("");
    setDistrict("");
    setRating("");
    setFacility("");
  }

  return (
    <MainLayout>
      <main className="mx-auto max-w-7xl px-5 py-12">
        <p className="text-sm font-bold text-terracotta">JELAJAHI</p>
        <h1 className="mt-2 text-4xl font-black">Cari tempat ngopi yang pas.</h1>
        <p className="mt-3 max-w-xl text-espresso/70">
          Saring berdasarkan kebutuhanmu untuk menemukan tempat bertemu,
          bekerja, atau menikmati jeda.
        </p>

        <div className="mt-8 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-espresso/10">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-xl border border-espresso/15 px-4 py-3 outline-none focus:border-terracotta"
            placeholder="Cari coffee shop atau kecamatan..."
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={district} onChange={setDistrict} label="Semua lokasi" items={JEMBER_DISTRICTS} />
            <Select
              value={rating}
              onChange={setRating}
              label="Semua rating"
              items={["3", "4", "4.5"]}
              suffix="+"
            />
            <Select
              value={facility}
              onChange={setFacility}
              label="Semua fasilitas"
              items={facilities.map((item) => item.slug)}
            />
            <button
              onClick={reset}
              className="rounded-xl border border-espresso/15 px-4 py-3 text-sm font-bold"
            >
              Reset filter
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-espresso/65">
            <b className="text-espresso">{sortedShops.length}</b> coffee shop ditemukan
          </p>
          <label className="flex items-center gap-2 text-sm font-bold">
            Urutkan
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="rounded-lg border border-espresso/15 bg-white px-3 py-2 font-normal"
            >
              <option value="newest">Featured &amp; terbaru</option>
              <option value="rating">Rating tertinggi</option>
            </select>
          </label>
        </div>

        <div className="mt-6">
          {loading && <p className="text-center text-espresso/60">Memuat coffee shop...</p>}
          {!loading && error && <p className="text-center text-red-600">{error}</p>}
          {!loading && !error && sortedShops.length === 0 && <Empty reset={reset} />}
          {!loading && !error && sortedShops.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sortedShops.map((shop) => (
                <CoffeeShopCard key={shop.id} coffeeShop={mapToCoffeeShop(shop)} />
              ))}
            </div>
          )}
        </div>
      </main>
    </MainLayout>
  );
}