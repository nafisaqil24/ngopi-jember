import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { getImageUrl, listCategories, listFacilities, type ApiFacility } from "../../services/coffeeShop";
import {
  getAdminCoffeeShop,
  updateAdminCoffeeShop,
  updateAdminShopTaxonomy,
  createAdminMenu,
  updateAdminMenu,
  deleteAdminMenu,
  ApiError,
  type ApiAdminShopDetail,
} from "../../services/admin";

type ShopStatus = "OPEN" | "CLOSED" | "TEMPORARILY_CLOSED";

function toCoordinateInput(value: number | null | undefined): string {
  return value !== null && value !== undefined ? String(value) : "";
}

// String kosong -> undefined supaya tidak tersimpan sebagai angka 0 di backend.
function coordinateToNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  return Number.isNaN(num) ? undefined : num;
}

export default function AdminCoffeeShopEdit() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const toast = useToast();

  const [shop, setShop] = useState<ApiAdminShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("Sumbersari");
  const [openingHours, setOpeningHours] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [status, setStatus] = useState<ShopStatus>("OPEN");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [allCategories, setAllCategories] = useState<ApiFacility[]>([]);
  const [allFacilities, setAllFacilities] = useState<ApiFacility[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [facilityIds, setFacilityIds] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // State menu
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuCategory, setMenuCategory] = useState("");
  const [menuDescription, setMenuDescription] = useState("");
  const [menuImage, setMenuImage] = useState<File | null>(null);
  const [submittingMenu, setSubmittingMenu] = useState(false);
  const [menuFormError, setMenuFormError] = useState("");

  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [editMenuName, setEditMenuName] = useState("");
  const [editMenuPrice, setEditMenuPrice] = useState("");
  const [editMenuCategory, setEditMenuCategory] = useState("");
  const [editMenuDescription, setEditMenuDescription] = useState("");
  const [editMenuImage, setEditMenuImage] = useState<File | null>(null);
  const [updatingMenu, setUpdatingMenu] = useState(false);
  const [editMenuError, setEditMenuError] = useState("");

  async function loadShop(shopId: string) {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await getAdminCoffeeShop(token, shopId);
      setShop(data);
      setName(data.name);
      setDescription(data.description);
      setAddress(data.address);
      setDistrict(data.district);
      setOpeningHours(data.openingHours);
      setPriceRange(data.priceRange);
      setStatus(data.status);
      setPhone(data.phone || "");
      setInstagram(data.instagram || "");
      setLatitude(toCoordinateInput(data.latitude));
      setLongitude(toCoordinateInput(data.longitude));
      setCategoryIds(data.categories.map((c) => c.category.id));
      setFacilityIds(data.facilities.map((f) => f.facility.id));
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : "Gagal memuat data kedai";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id && token) loadShop(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  useEffect(() => {
    listCategories().then((res) => setAllCategories(res.data)).catch(() => setAllCategories([]));
    listFacilities().then((res) => setAllFacilities(res.data)).catch(() => setAllFacilities([]));
  }, []);

  function toggle(list: string[], setList: (value: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function handleSearchAddress() {
    if (!searchQuery.trim()) return;
    const normalized = searchQuery.toLowerCase().replace("jln", "jl").replace(/\./g, "").replace(/\s+/g, " ").trim();
    const fullQuery = `${normalized}, Kota Jember, Jawa Timur, Indonesia`;
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}`)
      .then((response) => response.json())
      .then((results) => {
        if (results && results.length > 0) {
          const loc = results[0];
          setLatitude(String(loc.lat));
          setLongitude(String(loc.lng));
          toast.info(`Alamat ditemukan: ${loc.display_name}`);
        } else {
          toast.error("Alamat tidak ditemukan.");
        }
      })
      .catch(() => toast.error("Gagal mencari alamat."));
  }

  function handleGetGPS() {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung browser Anda.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(String(pos.coords.latitude));
        setLongitude(String(pos.coords.longitude));
        toast.success("Lokasi berhasil diambil via GPS.");
      },
      () => toast.error("Gagal mendeteksi lokasi GPS. Pastikan izin lokasi diaktifkan."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!shop || !token) return;
    setSaving(true);
    setSaveError("");

    try {
      await updateAdminCoffeeShop(token, shop.id, {
        name,
        description,
        address,
        district,
        priceRange,
        openingHours,
        phone,
        instagram,
        status,
        latitude: coordinateToNumber(latitude),
        longitude: coordinateToNumber(longitude),
        image: image || undefined,
      });
      await updateAdminShopTaxonomy(token, shop.id, { categoryIds, facilityIds });
      toast.success("Perubahan kedai berhasil disimpan.");
      setImage(null);
      await loadShop(shop.id);
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : "Gagal menyimpan perubahan";
      setSaveError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMenu(e: FormEvent) {
    e.preventDefault();
    if (!shop || !token) return;
    setSubmittingMenu(true);
    setMenuFormError("");
    try {
      const priceNum = Number(menuPrice);
      if (Number.isNaN(priceNum) || priceNum < 0) throw new Error("Harga harus berupa angka valid.");
      await createAdminMenu(token, shop.id, {
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
      toast.success("Menu berhasil ditambahkan.");
      await loadShop(shop.id);
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : err.message || "Gagal menambahkan menu";
      setMenuFormError(message);
      toast.error(message);
    } finally {
      setSubmittingMenu(false);
    }
  }

  function startEditMenu(item: ApiAdminShopDetail["menus"][number]) {
    setEditingMenuId(item.id);
    setEditMenuName(item.name);
    setEditMenuPrice(String(item.price));
    setEditMenuCategory(item.category || "");
    setEditMenuDescription(item.description || "");
    setEditMenuImage(null);
    setEditMenuError("");
  }

  async function handleUpdateMenu(e: FormEvent, menuId: string) {
    e.preventDefault();
    if (!shop || !token) return;
    setUpdatingMenu(true);
    setEditMenuError("");
    try {
      const priceNum = Number(editMenuPrice);
      if (Number.isNaN(priceNum) || priceNum < 0) throw new Error("Harga harus berupa angka valid.");
      await updateAdminMenu(token, shop.id, menuId, {
        name: editMenuName,
        price: priceNum,
        category: editMenuCategory || undefined,
        description: editMenuDescription || undefined,
        image: editMenuImage || undefined,
      });
      setEditingMenuId(null);
      toast.success("Menu berhasil diperbarui.");
      await loadShop(shop.id);
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : err.message || "Gagal memperbarui menu";
      setEditMenuError(message);
      toast.error(message);
    } finally {
      setUpdatingMenu(false);
    }
  }

  async function handleDeleteMenu(menuId: string) {
    if (!shop || !token) return;
    if (!window.confirm("Apakah Anda yakin ingin menghapus menu ini?")) return;
    try {
      await deleteAdminMenu(token, shop.id, menuId);
      toast.success("Menu berhasil dihapus.");
      await loadShop(shop.id);
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : "Gagal menghapus menu");
    }
  }

  return (
    <MainLayout>
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-terracotta">PANEL ADMIN</p>
            <h1 className="mt-2 text-3xl font-black">{shop ? shop.name : "Edit Kedai"}</h1>
            <p className="mt-2 text-espresso/70">Ubah informasi profil, fasilitas, koordinat, dan menu kedai.</p>
          </div>
          <Link
            to="/admin/dashboard"
            className="rounded-xl border border-strong bg-white px-4 py-2.5 text-sm font-bold text-body shadow-xs transition hover:bg-info-soft"
          >
            ← Kembali ke Dashboard Admin
          </Link>
        </div>

        {loading && <p className="mt-12 text-center text-espresso/60">Memuat data kedai...</p>}

        {!loading && error && (
          <div className="mt-8 rounded-xl border border-danger/30 bg-danger-soft p-4 text-danger">
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {!loading && !error && shop && (
          <>
            <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-espresso/10">
              <div className="mb-5 rounded-xl border border-espresso/10 bg-info-soft p-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-espresso/60">Pemilik</h2>
                <p className="mt-1 font-bold text-espresso">{shop.owner.name}</p>
                <p className="text-sm text-espresso/70">{shop.owner.email}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                  <span className={`rounded-full px-3 py-1 ${shop.isVerified ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                    {shop.isVerified ? "✓ Terverifikasi" : "⏳ Menunggu Verifikasi"}
                  </span>
                  <span className="rounded-full bg-espresso/5 px-3 py-1 text-espresso/70">slug: {shop.slug}</span>
                </div>
              </div>

              {saveError && <p className="mb-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{saveError}</p>}

              <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-espresso/70">Nama Coffee Shop *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-espresso/70">Kecamatan (District) *</label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
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
                  <label className="mb-1 block text-xs font-bold text-espresso/70">Alamat Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Cari alamat (contoh: Jl. Karimata No. 41)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearchAddress())}
                      className="flex-1 rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                    />
                    <button
                      type="button"
                      onClick={handleSearchAddress}
                      className="rounded-xl bg-terracotta px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-terracotta-strong"
                    >
                      🔍 Cari
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleGetGPS}
                    className="rounded-xl bg-terracotta px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-terracotta-strong inline-flex items-center gap-1.5"
                  >
                    <span>📍 Gunakan GPS Saya</span>
                  </button>
                  <span className="ml-3 text-xs text-espresso/60">
                    Lat: {latitude || "(kosong)"}, Lng: {longitude || "(kosong)"}
                  </span>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-espresso/70">Latitude</label>
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="-8.1721"
                    className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-espresso/70">Longitude</label>
                  <input
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="113.7008"
                    className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-espresso/70">Kisaran Harga *</label>
                  <input
                    type="text"
                    required
                    value={priceRange}
                    onChange={(e) => setPriceRange(e.target.value)}
                    className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-espresso/70">Jam Operasional *</label>
                  <input
                    type="text"
                    required
                    value={openingHours}
                    onChange={(e) => setOpeningHours(e.target.value)}
                    className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-espresso/70">Status Operasional *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ShopStatus)}
                    className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                  >
                    <option value="OPEN">Buka (OPEN)</option>
                    <option value="CLOSED">Tutup (CLOSED)</option>
                    <option value="TEMPORARILY_CLOSED">Tutup Sementara (TEMPORARILY_CLOSED)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-espresso/70">No. Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-espresso/70">Instagram</label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-espresso/70">Deskripsi * (min 10 karakter)</label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-3 text-sm outline-none focus:border-terracotta"
                  />
                </div>

                <div className="sm:col-span-2 rounded-xl border border-espresso/15 bg-info-soft p-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-espresso/60">Kategori Coffee Shop</h5>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {allCategories.map((category) => (
                      <label key={category.id} className="flex cursor-pointer select-none items-center gap-2">
                        <input
                          type="checkbox"
                          checked={categoryIds.includes(category.id)}
                          onChange={() => toggle(categoryIds, setCategoryIds, category.id)}
                          className="rounded border-espresso/15 bg-white p-1"
                        />
                        <span className="text-sm text-espresso/70">{category.name}</span>
                      </label>
                    ))}
                    {!allCategories.length && <span className="text-sm text-espresso/40">Memuat kategori...</span>}
                  </div>
                </div>

                <div className="sm:col-span-2 rounded-xl border border-espresso/15 bg-info-soft p-4">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-espresso/60">Fasilitas Coffee Shop</h5>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {allFacilities.map((facility) => (
                      <label key={facility.id} className="flex cursor-pointer select-none items-center gap-2">
                        <input
                          type="checkbox"
                          checked={facilityIds.includes(facility.id)}
                          onChange={() => toggle(facilityIds, setFacilityIds, facility.id)}
                          className="rounded border-espresso/15 bg-white p-1"
                        />
                        <span className="text-sm text-espresso/70">{facility.name}</span>
                      </label>
                    ))}
                    {!allFacilities.length && <span className="text-sm text-espresso/40">Memuat fasilitas...</span>}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-espresso/70">Upload Foto Baru (Opsional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImage(e.target.files?.[0] || null)}
                    className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-terracotta file:px-3 file:py-1 file:text-xs file:font-bold file:text-white hover:file:bg-terracotta-strong"
                  />
                  {shop.images?.[0]?.imageUrl && (
                    <img
                      src={getImageUrl(shop.images[0].imageUrl)!}
                      alt={shop.name}
                      className="mt-3 h-40 w-full rounded-xl object-cover"
                    />
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                  <Link
                    to="/admin/dashboard"
                    className="rounded-xl border border-espresso/15 px-4 py-2 text-sm font-bold text-espresso hover:bg-espresso/5"
                  >
                    Batal
                  </Link>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-terracotta px-5 py-2 text-sm font-bold text-white hover:bg-terracotta-strong disabled:opacity-50"
                  >
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </div>

            {/* Menu CRUD */}
            <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-espresso/10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black">Daftar Menu</h3>
                  <p className="text-sm text-espresso/65">Kelola makanan dan minuman kedai ini.</p>
                </div>
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="rounded-xl bg-espresso px-4 py-2.5 text-sm font-bold text-cream hover:bg-espresso/90"
                >
                  {showAddMenu ? "Tutup Form" : "+ Tambah Menu Baru"}
                </button>
              </div>

              {showAddMenu && (
                <form onSubmit={handleAddMenu} className="mt-6 space-y-4 rounded-xl border border-espresso/15 bg-cream/30 p-5">
                  <h4 className="font-bold text-espresso">Tambah Menu Baru</h4>
                  {menuFormError && <p className="text-sm text-danger">{menuFormError}</p>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-espresso/70">Nama Menu *</label>
                      <input
                        type="text"
                        required
                        value={menuName}
                        onChange={(e) => setMenuName(e.target.value)}
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-espresso/70">Harga (Rp) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={menuPrice}
                        onChange={(e) => setMenuPrice(e.target.value)}
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-espresso/70">Kategori</label>
                      <input
                        type="text"
                        value={menuCategory}
                        onChange={(e) => setMenuCategory(e.target.value)}
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-espresso/70">Deskripsi</label>
                      <input
                        type="text"
                        value={menuDescription}
                        onChange={(e) => setMenuDescription(e.target.value)}
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-bold text-espresso/70">Foto Menu (Opsional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setMenuImage(e.target.files?.[0] || null)}
                        className="w-full rounded-xl border border-espresso/15 bg-white px-3 py-2.5 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-terracotta file:px-3 file:py-1 file:text-xs file:font-bold file:text-white hover:file:bg-terracotta-strong"
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
                      disabled={submittingMenu}
                      className="rounded-xl bg-terracotta px-4 py-2 text-sm font-bold text-white hover:bg-terracotta-strong disabled:opacity-50"
                    >
                      {submittingMenu ? "Menyimpan..." : "Simpan Menu"}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-6">
                {shop.menus.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-espresso/20 py-10 text-center text-sm text-espresso/60">
                    Belum ada menu. Klik "+ Tambah Menu Baru".
                  </div>
                ) : (
                  <div className="divide-y divide-espresso/10 rounded-xl border border-espresso/10 bg-white px-4">
                    {shop.menus.map((item) => (
                      <div key={item.id} className="py-4">
                        {editingMenuId === item.id ? (
                          <form onSubmit={(e) => handleUpdateMenu(e, item.id)} className="space-y-3 rounded-xl border border-espresso/10 bg-cream/20 p-4">
                            <h5 className="text-sm font-bold text-espresso">Edit Menu</h5>
                            {editMenuError && <p className="text-xs text-danger">{editMenuError}</p>}
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
                                className="w-full rounded-lg border border-espresso/15 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-terracotta file:px-3 file:py-1 file:text-xs file:font-bold file:text-white hover:file:bg-terracotta-strong sm:col-span-2"
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
                                className="rounded-lg bg-terracotta px-3 py-1.5 text-xs font-bold text-white hover:bg-terracotta-strong disabled:opacity-50"
                              >
                                {updatingMenu ? "Menyimpan..." : "Simpan"}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                            <div className="flex items-center gap-3">
                              {item.image && (
                                <img src={getImageUrl(item.image)!} alt={item.name} className="h-12 w-12 rounded-lg object-cover" />
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
                                {item.description && <p className="text-xs text-espresso/65">{item.description}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="font-bold text-terracotta">Rp{item.price.toLocaleString("id-ID")}</div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => startEditMenu(item)}
                                  className="rounded-lg border border-espresso/15 px-2.5 py-1 text-xs font-bold text-espresso hover:bg-espresso/5"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteMenu(item.id)}
                                  className="rounded-lg border border-danger/30 bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger hover:brightness-95"
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
          </>
        )}
      </main>
    </MainLayout>
  );
}