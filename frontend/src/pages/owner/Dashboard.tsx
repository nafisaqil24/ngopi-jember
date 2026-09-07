import { useEffect, useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import { useAuth } from "../../hooks/useAuth";
import { getOwnerCoffeeShop, createMenu, createCoffeeShop, ApiError, type ApiOwnerShop } from "../../services/coffeeShop";

export default function OwnerDashboard() {
  const { user, token, logout } = useAuth();
  const [shop, setShop] = useState<ApiOwnerShop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form buat coffee shop baru
  const [shopName, setShopName] = useState("");
  const [shopDistrict, setShopDistrict] = useState("Sumbersari");
  const [shopAddress, setShopAddress] = useState("");
  const [shopPriceRange, setShopPriceRange] = useState("Rp15.000 - Rp50.000");
  const [shopOpeningHours, setShopOpeningHours] = useState("10:00 - 22:00");
  const [shopDescription, setShopDescription] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopInstagram, setShopInstagram] = useState("");
  const [creatingShop, setCreatingShop] = useState(false);
  const [createShopError, setCreateShopError] = useState("");

  // Form tambah menu
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuCategory, setMenuCategory] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [fetchedToken, setFetchedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (token === fetchedToken) return;

    setFetchedToken(token);
    setLoading(true);
    setError("");
    getOwnerCoffeeShop(token)
      .then((data) => setShop(data))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat data coffee shop"))
      .finally(() => setLoading(false));
  }, [token, fetchedToken]);

  async function handleCreateShop(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreatingShop(true);
    setCreateShopError("");

    try {
      await createCoffeeShop(token, {
        name: shopName,
        district: shopDistrict,
        address: shopAddress,
        priceRange: shopPriceRange,
        openingHours: shopOpeningHours,
        description: shopDescription,
        phone: shopPhone || undefined,
        instagram: shopInstagram || undefined,
      });

      // Refresh data shop setelah berhasil dibuat
      const updated = await getOwnerCoffeeShop(token);
      setShop(updated);
    } catch (err: any) {
      setCreateShopError(err instanceof ApiError ? err.message : (err.message || "Gagal mendaftarkan coffee shop"));
    } finally {
      setCreatingShop(false);
    }
  }

  async function handleAddMenu(e: React.FormEvent) {
    e.preventDefault();
    if (!shop || !token) return;
    setSubmitting(true);
    setFormError("");

    try {
      const priceNum = Number(menuPrice);
      if (isNaN(priceNum) || priceNum < 0) {
        throw new Error("Harga harus berupa angka valid.");
      }

      await createMenu(shop.id, token, {
        name: menuName,
        price: priceNum,
        category: menuCategory || undefined,
        description: menuDescription || undefined,
      });

      // Reset form & tutup modal/form
      setMenuName("");
      setMenuPrice("");
      setMenuCategory("");
      setMenuDescription("");
      setShowAddMenu(false);

      // Refresh data shop untuk menampilkan menu baru
      const updated = await getOwnerCoffeeShop(token);
      setShop(updated);
    } catch (err: any) {
      setFormError(err instanceof ApiError ? err.message : (err.message || "Gagal menambahkan menu"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MainLayout>
      <main className="mx-auto max-w-7xl px-5 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-terracotta">DASHBOARD OWNER</p>
            <h1 className="mt-2 text-4xl font-black">Kelola Coffee Shop &amp; Menu</h1>
            <p className="mt-2 text-espresso/70">
              Halo, <b className="text-espresso">{user?.name}</b>. Kelola informasi dan daftar menu coffee shop kamu di sini.
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-xl border border-espresso/15 bg-white px-4 py-2.5 text-sm font-bold text-espresso hover:bg-espresso/5"
          >
            Logout
          </button>
        </div>

        {loading && <p className="mt-12 text-center text-espresso/60">Memuat data coffee shop...</p>}
        {!loading && error && <p className="mt-12 text-center text-red-600">{error}</p>}

        {!loading && !error && !shop && (
          <div className="mt-10 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-espresso/10">
            <h2 className="text-2xl font-black">Daftarkan Coffee Shop Kamu</h2>
            <p className="mt-2 text-sm text-espresso/65">
              Akun owner kamu belum memiliki coffee shop. Isi formulir di bawah ini untuk mendaftarkan coffee shop pertama kamu.
            </p>

            {createShopError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{createShopError}</p>}

            <form onSubmit={handleCreateShop} className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-espresso/70 mb-1">Nama Coffee Shop *</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Contoh: Kopi Jember Kita"
                  className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-espresso/70 mb-1">Kecamatan (District) *</label>
                <select
                  value={shopDistrict}
                  onChange={(e) => setShopDistrict(e.target.value)}
                  className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                >
                  <option value="Sumbersari">Sumbersari</option>
                  <option value="Kaliwates">Kaliwates</option>
                  <option value="Patrang">Patrang</option>
                  <option value="Ajung">Ajung</option>
                  <option value="Arjasa">Arjasa</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-espresso/70 mb-1">Alamat Lengkap *</label>
                <input
                  type="text"
                  required
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  placeholder="Contoh: Jl. Kalimantan No. 35"
                  className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-espresso/70 mb-1">Kisaran Harga *</label>
                <input
                  type="text"
                  required
                  value={shopPriceRange}
                  onChange={(e) => setShopPriceRange(e.target.value)}
                  placeholder="Contoh: Rp15.000 - Rp45.000"
                  className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-espresso/70 mb-1">Jam Operasional *</label>
                <input
                  type="text"
                  required
                  value={shopOpeningHours}
                  onChange={(e) => setShopOpeningHours(e.target.value)}
                  placeholder="Contoh: 10:00 - 23:00"
                  className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-espresso/70 mb-1">Deskripsi * (min 10 karakter)</label>
                <textarea
                  required
                  rows={3}
                  value={shopDescription}
                  onChange={(e) => setShopDescription(e.target.value)}
                  placeholder="Ceritakan tentang suasana, keunggulan, dan fasilitas coffee shop kamu..."
                  className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-espresso/70 mb-1">No. Telepon / WhatsApp</label>
                <input
                  type="text"
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-espresso/70 mb-1">Instagram</label>
                <input
                  type="text"
                  value={shopInstagram}
                  onChange={(e) => setShopInstagram(e.target.value)}
                  placeholder="Contoh: @kopijember"
                  className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                />
              </div>
              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={creatingShop}
                  className="w-full rounded-xl bg-terracotta py-3 font-bold text-white shadow-sm hover:bg-terracotta/90 disabled:opacity-50"
                >
                  {creatingShop ? "Mendaftarkan..." : "Daftarkan Coffee Shop"}
                </button>
              </div>
            </form>
          </div>
        )}

        {!loading && !error && shop && (
          <div className="mt-8 space-y-8">
            {/* Informasi Coffee Shop */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-espresso/10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="rounded-full bg-terracotta/10 px-3 py-1 text-xs font-bold text-terracotta">
                    {shop.status === "OPEN" ? "Buka" : "Tutup"}
                  </span>
                  <h2 className="mt-3 text-2xl font-black">{shop.name}</h2>
                  <p className="mt-1 text-sm text-espresso/65">⌖ {shop.address} ({shop.district})</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-terracotta">★ {shop.rating ? shop.rating.toFixed(1) : "0.0"}</p>
                  <p className="text-xs text-espresso/60">{shop.reviewCount} ulasan</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-espresso/75 leading-relaxed">{shop.description}</p>
            </div>

            {/* List Menu & Tombol Tambah */}
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-espresso/10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black">Daftar Menu</h3>
                  <p className="text-sm text-espresso/65">Kelola makanan dan minuman di coffee shop kamu.</p>
                </div>
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="rounded-xl bg-espresso px-4 py-2.5 text-sm font-bold text-cream hover:bg-espresso/90"
                >
                  {showAddMenu ? "Tutup Form" : "+ Tambah Menu Baru"}
                </button>
              </div>

              {/* Form Tambah Menu */}
              {showAddMenu && (
                <form onSubmit={handleAddMenu} className="mt-6 rounded-xl border border-espresso/15 bg-cream/30 p-5 space-y-4">
                  <h4 className="font-bold text-espresso">Tambah Menu Baru</h4>
                  {formError && <p className="text-sm text-red-600">{formError}</p>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-espresso/70 mb-1">Nama Menu *</label>
                      <input
                        type="text"
                        required
                        value={menuName}
                        onChange={(e) => setMenuName(e.target.value)}
                        placeholder="Contoh: Caffe Latte"
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-espresso/70 mb-1">Harga (Rp) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={menuPrice}
                        onChange={(e) => setMenuPrice(e.target.value)}
                        placeholder="Contoh: 25000"
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-espresso/70 mb-1">Kategori</label>
                      <input
                        type="text"
                        value={menuCategory}
                        onChange={(e) => setMenuCategory(e.target.value)}
                        placeholder="Contoh: Coffee, Non-Coffee, Snack"
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-espresso/70 mb-1">Deskripsi</label>
                      <input
                        type="text"
                        value={menuDescription}
                        onChange={(e) => setMenuDescription(e.target.value)}
                        placeholder="Deskripsi singkat menu..."
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddMenu(false)}
                      className="rounded-xl border border-espresso/15 px-4 py-2 text-sm font-bold text-espresso hover:bg-espresso/5"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-xl bg-terracotta px-4 py-2 text-sm font-bold text-white hover:bg-terracotta/90 disabled:opacity-50"
                    >
                      {submitting ? "Menyimpan..." : "Simpan Menu"}
                    </button>
                  </div>
                </form>
              )}

              {/* Tampilkan List Menu */}
              <div className="mt-6">
                {shop.menus.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-espresso/20 py-10 text-center text-sm text-espresso/60">
                    Belum ada menu yang ditambahkan. Klik tombol "+ Tambah Menu Baru" di atas.
                  </div>
                ) : (
                  <div className="divide-y divide-espresso/10 rounded-xl border border-espresso/10 bg-white px-4">
                    {shop.menus.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 py-4 text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <b className="text-base text-espresso">{item.name}</b>
                            {item.category && (
                              <span className="rounded-md bg-espresso/5 px-2 py-0.5 text-xs font-bold text-espresso/70">
                                {item.category}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-espresso/65">{item.description}</p>
                          )}
                        </div>
                        <div className="font-bold text-terracotta">
                          Rp{item.price.toLocaleString("id-ID")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </MainLayout>
  );
}
