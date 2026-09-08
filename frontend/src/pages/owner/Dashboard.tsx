import { useEffect, useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import { useAuth } from "../../hooks/useAuth";
import {
  getOwnerCoffeeShop,
  createMenu,
  createCoffeeShop,
  updateCoffeeShop,
  deleteCoffeeShop,
  updateMenu,
  deleteMenu,
  getImageUrl,
  ApiError,
  type ApiOwnerShop,
} from "../../services/coffeeShop";

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
  const [shopImage, setShopImage] = useState<File | null>(null);
  const [creatingShop, setCreatingShop] = useState(false);
  const [createShopError, setCreateShopError] = useState("");

  // Form Edit Coffee Shop
  const [isEditingShop, setIsEditingShop] = useState(false);
  const [editShopName, setEditShopName] = useState("");
  const [editShopDistrict, setEditShopDistrict] = useState("Sumbersari");
  const [editShopAddress, setEditShopAddress] = useState("");
  const [editShopPriceRange, setEditShopPriceRange] = useState("");
  const [editShopOpeningHours, setEditShopOpeningHours] = useState("");
  const [editShopDescription, setEditShopDescription] = useState("");
  const [editShopPhone, setEditShopPhone] = useState("");
  const [editShopInstagram, setEditShopInstagram] = useState("");
  const [editShopStatus, setEditShopStatus] = useState<"OPEN" | "CLOSED" | "TEMPORARILY_CLOSED">("OPEN");
  const [editShopImage, setEditShopImage] = useState<File | null>(null);
  const [updatingShop, setUpdatingShop] = useState(false);
  const [editShopError, setEditShopError] = useState("");

  // Form tambah menu
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuCategory, setMenuCategory] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [menuImage, setMenuImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Form edit menu
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [editMenuName, setEditMenuName] = useState("");
  const [editMenuPrice, setEditMenuPrice] = useState("");
  const [editMenuCategory, setEditMenuCategory] = useState("");
  const [editMenuDescription, setEditMenuDescription] = useState("");
  const [editMenuImage, setEditMenuImage] = useState<File | null>(null);
  const [updatingMenu, setUpdatingMenu] = useState(false);
  const [editMenuError, setEditMenuError] = useState("");

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
      .then((data) => {
        setShop(data);
        if (data) {
          setEditShopName(data.name);
          setEditShopDistrict(data.district);
          setEditShopAddress(data.address);
          setEditShopPriceRange(data.priceRange);
          setEditShopOpeningHours(data.openingHours);
          setEditShopDescription(data.description);
          setEditShopPhone(data.phone || "");
          setEditShopInstagram(data.instagram || "");
          setEditShopStatus(data.status);
        }
      })
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
        image: shopImage || undefined,
      });

      const updated = await getOwnerCoffeeShop(token);
      setShop(updated);
      if (updated) {
        setEditShopName(updated.name);
        setEditShopDistrict(updated.district);
        setEditShopAddress(updated.address);
        setEditShopPriceRange(updated.priceRange);
        setEditShopOpeningHours(updated.openingHours);
        setEditShopDescription(updated.description);
        setEditShopPhone(updated.phone || "");
        setEditShopInstagram(updated.instagram || "");
        setEditShopStatus(updated.status);
      }
    } catch (err: any) {
      setCreateShopError(err instanceof ApiError ? err.message : (err.message || "Gagal mendaftarkan coffee shop"));
    } finally {
      setCreatingShop(false);
    }
  }

  async function handleUpdateShop(e: React.FormEvent) {
    e.preventDefault();
    if (!shop || !token) return;
    setUpdatingShop(true);
    setEditShopError("");

    try {
      await updateCoffeeShop(shop.id, token, {
        name: editShopName,
        district: editShopDistrict,
        address: editShopAddress,
        priceRange: editShopPriceRange,
        openingHours: editShopOpeningHours,
        description: editShopDescription,
        phone: editShopPhone || undefined,
        instagram: editShopInstagram || undefined,
        status: editShopStatus,
        image: editShopImage || undefined,
      });

      const updated = await getOwnerCoffeeShop(token);
      setShop(updated);
      setIsEditingShop(false);
    } catch (err: any) {
      setEditShopError(err instanceof ApiError ? err.message : (err.message || "Gagal memperbarui coffee shop"));
    } finally {
      setUpdatingShop(false);
    }
  }

  async function handleDeleteShop() {
    if (!shop || !token) return;
    if (!window.confirm("Apakah Anda yakin ingin menghapus coffee shop ini? Semua data menu dan ulasan terkait akan ikut terhapus.")) {
      return;
    }

    try {
      await deleteCoffeeShop(shop.id, token);
      setShop(null);
    } catch (err: any) {
      alert(err instanceof ApiError ? err.message : "Gagal menghapus coffee shop");
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
        image: menuImage || undefined,
      });

      setMenuName("");
      setMenuPrice("");
      setMenuCategory("");
      setMenuDescription("");
      setMenuImage(null);
      setShowAddMenu(false);

      const updated = await getOwnerCoffeeShop(token);
      setShop(updated);
    } catch (err: any) {
      setFormError(err instanceof ApiError ? err.message : (err.message || "Gagal menambahkan menu"));
    } finally {
      setSubmitting(false);
    }
  }

  function startEditMenu(item: { id: string; name: string; price: number; category?: string | null; description?: string | null }) {
    setEditingMenuId(item.id);
    setEditMenuName(item.name);
    setEditMenuPrice(String(item.price));
    setEditMenuCategory(item.category || "");
    setEditMenuDescription(item.description || "");
    setEditMenuImage(null);
    setEditMenuError("");
  }

  async function handleUpdateMenu(e: React.FormEvent, menuId: string) {
    e.preventDefault();
    if (!shop || !token) return;
    setUpdatingMenu(true);
    setEditMenuError("");

    try {
      const priceNum = Number(editMenuPrice);
      if (isNaN(priceNum) || priceNum < 0) {
        throw new Error("Harga harus berupa angka valid.");
      }

      await updateMenu(shop.id, menuId, token, {
        name: editMenuName,
        price: priceNum,
        category: editMenuCategory || undefined,
        description: editMenuDescription || undefined,
        image: editMenuImage || undefined,
      });

      setEditingMenuId(null);
      const updated = await getOwnerCoffeeShop(token);
      setShop(updated);
    } catch (err: any) {
      setEditMenuError(err instanceof ApiError ? err.message : (err.message || "Gagal memperbarui menu"));
    } finally {
      setUpdatingMenu(false);
    }
  }

  async function handleDeleteMenu(menuId: string) {
    if (!shop || !token) return;
    if (!window.confirm("Apakah Anda yakin ingin menghapus menu ini?")) return;

    try {
      await deleteMenu(shop.id, menuId, token);
      const updated = await getOwnerCoffeeShop(token);
      setShop(updated);
    } catch (err: any) {
      alert(err instanceof ApiError ? err.message : "Gagal menghapus menu");
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
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-espresso/70 mb-1">Foto Coffee Shop</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setShopImage(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-terracotta file:text-white hover:file:bg-terracotta/90"
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
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-terracotta/10 px-3 py-1 text-xs font-bold text-terracotta">
                      {shop.status === "OPEN" ? "Buka" : shop.status === "CLOSED" ? "Tutup" : "Tutup Sementara"}
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-black">{shop.name}</h2>
                  <p className="mt-1 text-sm text-espresso/65">⌖ {shop.address} ({shop.district})</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-black text-terracotta">★ {shop.rating ? shop.rating.toFixed(1) : "0.0"}</p>
                    <p className="text-xs text-espresso/60">{shop.reviewCount} ulasan</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsEditingShop(!isEditingShop);
                        setEditShopError("");
                      }}
                      className="rounded-xl border border-espresso/15 px-3 py-2 text-xs font-bold text-espresso hover:bg-espresso/5"
                    >
                      {isEditingShop ? "Tutup Edit" : "Edit Info"}
                    </button>
                    <button
                      onClick={handleDeleteShop}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                    >
                      Hapus Shop
                    </button>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm text-espresso/75 leading-relaxed">{shop.description}</p>
              {shop.images?.[0]?.imageUrl && (
                <div className="mt-4">
                  <img
                    src={getImageUrl(shop.images[0].imageUrl)!}
                    alt={shop.name}
                    className="h-56 w-full rounded-2xl object-cover"
                  />
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-espresso/70">
                <span>🕒 {shop.openingHours}</span>
                <span>💰 {shop.priceRange}</span>
                {shop.phone && <span>📞 {shop.phone}</span>}
                {shop.instagram && <span>📷 {shop.instagram}</span>}
              </div>

              {/* Form Edit Coffee Shop */}
              {isEditingShop && (
                <form onSubmit={handleUpdateShop} className="mt-6 rounded-xl border border-espresso/15 bg-cream/30 p-5 space-y-4">
                  <h4 className="font-bold text-espresso">Edit Informasi Coffee Shop</h4>
                  {editShopError && <p className="text-sm text-red-600">{editShopError}</p>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-espresso/70 mb-1">Nama Coffee Shop *</label>
                      <input
                        type="text"
                        required
                        value={editShopName}
                        onChange={(e) => setEditShopName(e.target.value)}
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-espresso/70 mb-1">Kecamatan (District) *</label>
                      <select
                        value={editShopDistrict}
                        onChange={(e) => setEditShopDistrict(e.target.value)}
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
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
                        value={editShopAddress}
                        onChange={(e) => setEditShopAddress(e.target.value)}
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-espresso/70 mb-1">Kisaran Harga *</label>
                      <input
                        type="text"
                        required
                        value={editShopPriceRange}
                        onChange={(e) => setEditShopPriceRange(e.target.value)}
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-espresso/70 mb-1">Jam Operasional *</label>
                      <input
                        type="text"
                        required
                        value={editShopOpeningHours}
                        onChange={(e) => setEditShopOpeningHours(e.target.value)}
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-espresso/70 mb-1">Status Operasional *</label>
                      <select
                        value={editShopStatus}
                        onChange={(e) => setEditShopStatus(e.target.value as any)}
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                      >
                        <option value="OPEN">Buka (OPEN)</option>
                        <option value="CLOSED">Tutup (CLOSED)</option>
                        <option value="TEMPORARILY_CLOSED">Tutup Sementara (TEMPORARILY_CLOSED)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-espresso/70 mb-1">No. Telepon / WhatsApp</label>
                      <input
                        type="text"
                        value={editShopPhone}
                        onChange={(e) => setEditShopPhone(e.target.value)}
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-espresso/70 mb-1">Deskripsi *</label>
                      <textarea
                        required
                        rows={3}
                        value={editShopDescription}
                        onChange={(e) => setEditShopDescription(e.target.value)}
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-espresso/70 mb-1">Instagram</label>
                      <input
                        type="text"
                        value={editShopInstagram}
                        onChange={(e) => setEditShopInstagram(e.target.value)}
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-espresso/70 mb-1">Upload Foto Baru (Opsional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setEditShopImage(e.target.files?.[0] || null)}
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-terracotta file:text-white hover:file:bg-terracotta/90"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingShop(false)}
                      className="rounded-xl border border-espresso/15 px-4 py-2 text-sm font-bold text-espresso hover:bg-espresso/5"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={updatingShop}
                      className="rounded-xl bg-terracotta px-4 py-2 text-sm font-bold text-white hover:bg-terracotta/90 disabled:opacity-50"
                    >
                      {updatingShop ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                  </div>
                </form>
              )}
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
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-espresso/70 mb-1">Foto Menu (Opsional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setMenuImage(e.target.files?.[0] || null)}
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-terracotta file:text-white hover:file:bg-terracotta/90"
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
                      <div key={item.id} className="py-4">
                        {editingMenuId === item.id ? (
                          <form onSubmit={(e) => handleUpdateMenu(e, item.id)} className="space-y-3 bg-cream/20 p-4 rounded-xl border border-espresso/10">
                            <h5 className="font-bold text-espresso text-sm">Edit Menu</h5>
                            {editMenuError && <p className="text-xs text-red-600">{editMenuError}</p>}
                            <div className="grid gap-3 sm:grid-cols-2">
                              <input
                                type="text"
                                required
                                value={editMenuName}
                                onChange={(e) => setEditMenuName(e.target.value)}
                                placeholder="Nama Menu"
                                className="rounded-lg border border-espresso/15 bg-white px-3 py-2 text-sm outline-none focus:border-terracotta"
                              />
                              <input
                                type="number"
                                required
                                min="0"
                                value={editMenuPrice}
                                onChange={(e) => setEditMenuPrice(e.target.value)}
                                placeholder="Harga (Rp)"
                                className="rounded-lg border border-espresso/15 bg-white px-3 py-2 text-sm outline-none focus:border-terracotta"
                              />
                              <input
                                type="text"
                                value={editMenuCategory}
                                onChange={(e) => setEditMenuCategory(e.target.value)}
                                placeholder="Kategori"
                                className="rounded-lg border border-espresso/15 bg-white px-3 py-2 text-sm outline-none focus:border-terracotta"
                              />
                              <input
                                type="text"
                                value={editMenuDescription}
                                onChange={(e) => setEditMenuDescription(e.target.value)}
                                placeholder="Deskripsi"
                                className="rounded-lg border border-espresso/15 bg-white px-3 py-2 text-sm outline-none focus:border-terracotta"
                              />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setEditMenuImage(e.target.files?.[0] || null)}
                                className="w-full sm:col-span-2 rounded-lg border border-espresso/15 bg-white px-3 py-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-terracotta file:text-white hover:file:bg-terracotta/90"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingMenuId(null)}
                                className="rounded-lg border border-espresso/15 px-3 py-1.5 text-xs font-bold text-espresso hover:bg-espresso/5"
                              >
                                Batal
                              </button>
                              <button
                                type="submit"
                                disabled={updatingMenu}
                                className="rounded-lg bg-terracotta px-3 py-1.5 text-xs font-bold text-white hover:bg-terracotta/90 disabled:opacity-50"
                              >
                                {updatingMenu ? "Menyimpan..." : "Simpan"}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                            <div className="flex items-center gap-3">
                              {item.image && (
                                <img
                                  src={getImageUrl(item.image)!}
                                  alt={item.name}
                                  className="h-12 w-12 rounded-lg object-cover"
                                />
                              )}
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
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="font-bold text-terracotta">
                                Rp{item.price.toLocaleString("id-ID")}
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => startEditMenu(item)}
                                  className="rounded-lg border border-espresso/15 px-2.5 py-1 text-xs font-bold text-espresso hover:bg-espresso/5"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteMenu(item.id)}
                                  className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100"
                                >
                                  Hapus
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
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
