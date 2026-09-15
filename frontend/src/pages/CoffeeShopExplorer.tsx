import { useEffect, useMemo, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import CoffeeShopCard from "../components/coffeeshop/CoffeeShopCard";
import { listCoffeeShops, listFacilities, listNearbyCoffeeShops, getImageUrl, ApiError, type ApiCoffeeShopCard, type ApiFacility, type NearbyCoffeeShop } from "../services/coffeeShop";
import type { CoffeeShop } from "../types/coffeeShop";

const JEMBER_DISTRICTS = [
  "Sumbersari",
  "Kaliwates",
  "Patrang",
  "Ajung",
  "Arjasa",
];

const JEMBER_DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  "Sumbersari": { lat: -8.1721, lng: 113.7008 },
  "Kaliwates": { lat: -8.1685, lng: 113.6703 },
  "Patrang": { lat: -8.1581, lng: 113.6934 },
  "Ajung": { lat: -8.2145, lng: 113.7231 },
  "Arjasa": { lat: -8.1182, lng: 113.7251 },
};

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

function mapNearbyToCoffeeShop(item: NearbyCoffeeShop): CoffeeShop {
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
    distance: item.distance,
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
      className="rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-600 shadow-2xs transition text-slate-950 font-medium"
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
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-xs">
      <p className="text-4xl">☕</p>
      <h2 className="mt-3 text-xl font-black text-slate-950">Coffee shop tidak ditemukan</h2>
      <p className="mt-2 text-sm text-slate-800 font-medium">
        Coba ubah kata kunci atau hapus beberapa filter.
      </p>
      <button
        onClick={reset}
        className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-500 transition"
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

  const [mode, setMode] = useState<"all" | "nearby">("all");
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState("");
  const [nearbyShops, setNearbyShops] = useState<NearbyCoffeeShop[]>([]);

  const [shops, setShops] = useState<ApiCoffeeShopCard[]>([]);
  const [facilities, setFacilities] = useState<ApiFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listFacilities()
      .then((result) => setFacilities(result.data))
      .catch(() => setFacilities([]));
  }, []);

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
    return copy;
  }, [shops, sort]);

  function handleGetLocationGPS() {
    if (!navigator.geolocation) {
      alert("Geolocation tidak didukung oleh browser Anda.");
      return;
    }
    setNearbyLoading(true);
    setNearbyError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMode("nearby");
        fetchNearby(lat, lng);
      },
      () => {
        setNearbyLoading(false);
        setNearbyError("Gagal mendeteksi lokasi GPS. Pastikan izin lokasi diaktifkan.");
      },
      { timeout: 10000 }
    );
  }

  function handleSelectDistrictManual(dist: string) {
    if (!dist) return;
    const coords = JEMBER_DISTRICT_COORDS[dist];
    if (coords) {
      setMode("nearby");
      fetchNearby(coords.lat, coords.lng);
    }
  }

  function fetchNearby(lat: number, lng: number) {
    setNearbyLoading(true);
    setNearbyError("");
    listNearbyCoffeeShops({ lat, lng })
      .then((res) => setNearbyShops(res.data))
      .catch((err) => setNearbyError(err instanceof ApiError ? err.message : "Gagal memuat rekomendasi terdekat"))
      .finally(() => setNearbyLoading(false));
  }

  function reset() {
    setQuery("");
    setDistrict("");
    setRating("");
    setFacility("");
    setMode("all");
  }

  return (
    <MainLayout>
      <main className="mx-auto max-w-7xl px-5 py-12">
        <p className="font-mono text-xs font-bold text-indigo-700 tracking-wider">JELAJAHI</p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">Cari tempat ngopi yang pas.</h1>
        <p className="mt-3 max-w-xl text-slate-800 font-medium">
          Saring berdasarkan kebutuhanmu untuk menemukan tempat bertemu,
          bekerja, atau menikmati jeda.
        </p>

        {/* Widget Rekomendasi Berdasarkan Lokasi */}
        <div className="mt-8 rounded-2xl bg-gradient-to-r from-indigo-900 to-indigo-950 p-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-800/60 px-3 py-1 rounded-lg border border-indigo-700/50">
                 LOKASI 
              </span>
              <h2 className="mt-2 text-xl font-black">Rekomendasi Coffee Shop Terdekat & Rating Tertinggi</h2>
              <p className="mt-1 text-sm text-indigo-200">
                Temukan kedai terbaik di sekitar Anda berdasarkan lokasi GPS atau pilih wilayah di Jember.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleGetLocationGPS}
                disabled={nearbyLoading}
                className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-950 shadow-md hover:bg-slate-100 transition inline-flex items-center gap-2"
              >
                <span>{nearbyLoading && mode === "nearby" ? "Mendeteksi..." : "📍 Gunakan Lokasi Saya (GPS)"}</span>
              </button>
              <select
                onChange={(e) => handleSelectDistrictManual(e.target.value)}
                className="rounded-xl border border-indigo-700 bg-indigo-900 px-3.5 py-3 text-sm font-bold text-white outline-none hover:bg-indigo-800 transition shadow-md"
                defaultValue=""
              >
                <option value="" disabled>Pilih Kecamatan di Jember...</option>
                {JEMBER_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {mode === "nearby" && (
            <div className="mt-5 pt-4 border-t border-indigo-800/80 flex items-center justify-between text-sm">
              <span className="text-indigo-200 font-medium">
                Menampilkan rekomendasi terdekat (diurutkan berdasarkan <b>Rating Tertinggi</b> &amp; Jarak)
              </span>
              <button
                type="button"
                onClick={() => setMode("all")}
                className="font-mono text-xs font-bold text-indigo-300 hover:underline"
              >
                ← Kembali ke Semua Coffee Shop
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl bg-white p-5 shadow-xl ring-1 ring-slate-300">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3.5 outline-none focus:border-indigo-600 shadow-2xs transition text-slate-950 font-medium placeholder:text-slate-500"
            placeholder="Cari coffee shop atau kecamatan..."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100 transition shadow-2xs"
            >
              Reset filter
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-800 font-medium flex items-center gap-2">
            <b className="text-slate-950">{mode === "nearby" ? nearbyShops.length : sortedShops.length}</b> coffee shop ditemukan
            {mode === "nearby" && (
              <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold">
                (diurutkan berdasarkan Rating &amp; Jarak)
              </span>
            )}
          </p>
          {mode === "all" && (
            <label className="flex items-center gap-2 text-sm font-bold text-slate-950">
              Urutkan
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-medium text-slate-950 shadow-2xs outline-none focus:border-indigo-600"
              >
                <option value="newest">Featured &amp; terbaru</option>
                <option value="rating">Rating tertinggi</option>
              </select>
            </label>
          )}
        </div>

        <div className="mt-6">
          {mode === "nearby" ? (
            <>
              {nearbyLoading && (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <p className="col-span-full text-center text-slate-800 font-medium">Mencari coffee shop terdekat...</p>
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-80 rounded-2xl skeleton" />
                  ))}
                </div>
              )}
              {!nearbyLoading && nearbyError && <p className="text-center text-red-700 font-bold">{nearbyError}</p>}
              {!nearbyLoading && !nearbyError && nearbyShops.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-xs">
                  <p className="text-4xl">📍</p>
                  <h2 className="mt-3 text-xl font-black text-slate-950">Tidak ada coffee shop terdekat</h2>
                  <p className="mt-2 text-sm text-slate-800 font-medium">Coba pilih wilayah lain atau gunakan GPS.</p>
                </div>
              )}
              {!nearbyLoading && !nearbyError && nearbyShops.length > 0 && (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {nearbyShops.map((shop, index) => (
                    <CoffeeShopCard key={shop.id} coffeeShop={mapNearbyToCoffeeShop(shop)} index={index} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {loading && (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <p className="col-span-full text-center text-slate-800 font-medium">Memuat coffee shop...</p>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="h-80 rounded-2xl skeleton" />
                  ))}
                </div>
              )}
              {!loading && error && <p className="text-center text-red-700 font-bold">{error}</p>}
              {!loading && !error && sortedShops.length === 0 && <Empty reset={reset} />}
              {!loading && !error && sortedShops.length > 0 && (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedShops.map((shop, index) => (
                    <CoffeeShopCard key={shop.id} coffeeShop={mapToCoffeeShop(shop)} index={index} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </MainLayout>
  );
}