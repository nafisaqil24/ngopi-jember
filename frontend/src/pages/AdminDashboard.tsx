import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import {
  getAdminCoffeeShops,
  verifyCoffeeShop,
  setCoffeeShopFeatured,
  deleteAdminCoffeeShop,
  getAdminUsers,
  updateUserRole,
  deleteAdminUser,
  type ApiAdminShop,
  type ApiAdminUser,
} from "../services/admin";

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const toast = useToast();

  const [shops, setShops] = useState<ApiAdminShop[]>([]);
  const [users, setUsers] = useState<ApiAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"shops" | "users">("shops");
  const [shopFilter, setShopFilter] = useState<"all" | "pending">("pending");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    Promise.all([getAdminCoffeeShops(token), getAdminUsers(token)])
      .then(([shopsData, usersData]) => {
        setShops(shopsData);
        setUsers(usersData);
      })
      .catch((err) => {
        setError(err.message || "Gagal memuat data admin");
        toast.error(err.message || "Gagal memuat data admin");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  async function handleVerify(shopId: string, isVerified: boolean) {
    if (!token) return;
    setActionLoadingId(shopId);
    try {
      const updated = await verifyCoffeeShop(token, shopId, isVerified);
      setShops((prev) => prev.map((s) => (s.id === shopId ? { ...s, isVerified: updated.isVerified } : s)));
      toast.success(isVerified ? "Coffee shop berhasil disetujui (verified)" : "Verifikasi coffee shop dibatalkan");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah status verifikasi");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleFeatured(shopId: string, isFeatured: boolean) {
    if (!token) return;
    setActionLoadingId(shopId);
    try {
      const updated = await setCoffeeShopFeatured(token, shopId, isFeatured);
      setShops((prev) => prev.map((s) => (s.id === shopId ? { ...s, isFeatured: updated.isFeatured } : s)));
      toast.success(isFeatured ? "Coffee shop berhasil dijadikan Featured ★" : "Status Featured coffee shop dicabut");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah status featured");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDeleteShop(shopId: string, shopName: string) {
    if (!token) return;
    if (!window.confirm(`Yakin ingin menghapus coffee shop "${shopName}"?`)) return;
    setActionLoadingId(shopId);
    try {
      await deleteAdminCoffeeShop(token, shopId);
      setShops((prev) => prev.filter((s) => s.id !== shopId));
      toast.success("Coffee shop berhasil dihapus");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus coffee shop");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleRoleChange(userId: string, newRole: "USER" | "OWNER" | "ADMIN") {
    if (!token) return;
    setActionLoadingId(userId);
    try {
      const updated = await updateUserRole(token, userId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)));
      toast.success(`Role pengguna berhasil diubah menjadi ${newRole}`);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah role pengguna");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDeleteUser(userId: string, userName: string) {
    if (!token) return;
    if (!window.confirm(`Yakin ingin menghapus pengguna "${userName}"?`)) return;
    setActionLoadingId(userId);
    try {
      await deleteAdminUser(token, userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("Pengguna berhasil dihapus");
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus pengguna");
    } finally {
      setActionLoadingId(null);
    }
  }

  const pendingShops = shops.filter((s) => !s.isVerified);
  const displayedShops = shopFilter === "pending" ? pendingShops : shops;

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft border border-terracotta/20 px-3 py-1 text-xs font-semibold text-terracotta-strong mb-2">
              🛡️ Panel Administrator
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-heading">
              Dashboard Admin
            </h1>
            <p className="text-sm text-body mt-1">
              Moderasi kedai kopi, verifikasi pendaftaran baru, dan kelola pengguna platform.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-info-soft p-1 border border-subtle">
            <button
              onClick={() => setActiveTab("shops")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === "shops"
                  ? "bg-white text-terracotta-strong shadow-sm"
                  : "text-body hover:text-heading"
              }`}
            >
              Kelola Kedai ({shops.length})
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === "users"
                  ? "bg-white text-terracotta-strong shadow-sm"
                  : "text-body hover:text-heading"
              }`}
            >
              Kelola Pengguna ({users.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-subtle bg-white shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-terracotta border-t-transparent"></div>
              <p className="text-sm font-medium text-body">Memuat data panel admin...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-danger/30 bg-danger-soft p-6 text-center text-danger">
            <p className="font-semibold">{error}</p>
          </div>
        ) : activeTab === "shops" ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShopFilter("pending")}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    shopFilter === "pending"
                      ? "bg-warning text-white shadow-sm"
                      : "bg-info-soft text-body hover:bg-subtle"
                  }`}
                >
                  Pending Verifikasi ({pendingShops.length})
                </button>
                <button
                  onClick={() => setShopFilter("all")}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    shopFilter === "all"
                      ? "bg-terracotta text-white shadow-sm"
                      : "bg-info-soft text-body hover:bg-subtle"
                  }`}
                >
                  Semua Kedai ({shops.length})
                </button>
              </div>
            </div>

            {displayedShops.length === 0 ? (
              <div className="rounded-2xl border border-subtle bg-white p-12 text-center shadow-sm">
                <p className="text-base font-medium text-body">
                  {shopFilter === "pending"
                    ? "Tidak ada kedai kopi yang menunggu verifikasi saat ini."
                    : "Belum ada kedai kopi terdaftar di sistem."}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-subtle bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-body">
                    <thead className="bg-info-soft text-xs uppercase tracking-wider text-muted border-b border-subtle">
                      <tr>
                        <th className="px-6 py-4">Nama Kedai</th>
                        <th className="px-6 py-4">Pemilik</th>
                        <th className="px-6 py-4">Kecamatan</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Tanggal Daftar</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle">
                      {displayedShops.map((shop) => (
                        <tr key={shop.id} className="hover:bg-surface-hover transition">
                          <td className="px-6 py-4 font-semibold text-heading">
                            <div>{shop.name}</div>
                            <div className="text-xs font-normal text-muted">{shop.priceRange}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-heading">{shop.owner?.name ?? "N/A"}</div>
                            <div className="text-xs text-muted">{shop.owner?.email ?? "-"}</div>
                          </td>
                          <td className="px-6 py-4">{shop.district}</td>
                           <td className="px-6 py-4">
                             <div className="flex flex-col gap-1.5 items-start">
                               {shop.isVerified ? (
                                 <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success border border-success/20">
                                   ✓ Verified
                                 </span>
                               ) : (
                                 <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning border border-warning/30">
                                   ⏳ Pending
                                 </span>
                               )}
                               {shop.isFeatured && (
                                 <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-terracotta-strong border border-terracotta/20">
                                   ★ Featured
                                 </span>
                               )}
                             </div>
                           </td>
                           <td className="px-6 py-4 text-xs text-muted">
                             {new Date(shop.createdAt).toLocaleDateString("id-ID", {
                               day: "numeric",
                               month: "short",
                               year: "numeric",
                             })}
                           </td>
                           <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-2">
                                <Link
                                  to={`/admin/coffee-shops/${shop.id}/edit`}
                                  className="rounded-lg border border-strong bg-white px-3 py-1.5 text-xs font-semibold text-body transition hover:bg-info-soft"
                                >
                                  Edit
                                </Link>
{shop.isVerified ? (
                                  <button
                                    disabled={actionLoadingId === shop.id}
                                    onClick={() => handleVerify(shop.id, false)}
                                    className="rounded-lg border border-warning/30 bg-warning-soft px-3 py-1.5 text-xs font-semibold text-warning transition hover:brightness-95 disabled:opacity-50"
                                  >
                                    Cabut Verifikasi
                                  </button>
                                ) : (
                                  <button
                                    disabled={actionLoadingId === shop.id}
                                    onClick={() => handleVerify(shop.id, true)}
                                    className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 shadow-sm disabled:opacity-50"
                                  >
                                    {actionLoadingId === shop.id ? "Memproses..." : "Approve"}
                                  </button>
                                )}
                                {shop.isFeatured ? (
                                  <button
                                    disabled={actionLoadingId === shop.id}
                                    onClick={() => handleFeatured(shop.id, false)}
                                    className="rounded-lg border border-terracotta/30 bg-accent-soft px-3 py-1.5 text-xs font-semibold text-terracotta-strong transition hover:brightness-95 disabled:opacity-50"
                                  >
                                    Un-feature
                                  </button>
                                ) : (
                                  <button
                                    disabled={actionLoadingId === shop.id}
                                    onClick={() => handleFeatured(shop.id, true)}
                                    className="rounded-lg border border-terracotta/30 bg-terracotta px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-terracotta-strong shadow-sm disabled:opacity-50"
                                  >
                                    ★ Feature
                                  </button>
                                )}
                                <button
                                  disabled={actionLoadingId === shop.id}
                                  onClick={() => handleDeleteShop(shop.id, shop.name)}
                                  className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-1.5 text-xs font-semibold text-danger transition hover:brightness-95 disabled:opacity-50"
                                >
                                  Hapus
                                </button>
                             </div>
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {users.length === 0 ? (
              <div className="rounded-2xl border border-subtle bg-white p-12 text-center shadow-sm">
                <p className="text-base font-medium text-body">Belum ada pengguna terdaftar.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-subtle bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-body">
                    <thead className="bg-info-soft text-xs uppercase tracking-wider text-muted border-b border-subtle">
                      <tr>
                        <th className="px-6 py-4">Nama Pengguna</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Statistik</th>
                        <th className="px-6 py-4">Bergabung</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-surface-hover transition">
                          <td className="px-6 py-4 font-semibold text-heading">{u.name}</td>
                          <td className="px-6 py-4 text-body">{u.email}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                u.role === "ADMIN"
                                  ? "bg-espresso text-cream border border-espresso/20"
                                  : u.role === "OWNER"
                                  ? "bg-accent-soft text-terracotta-strong border border-terracotta/20"
                                  : "bg-info-soft text-body border border-subtle"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-muted">
                            {u._count.coffeeShops} kedai • {u._count.reviews} ulasan
                          </td>
                          <td className="px-6 py-4 text-xs text-muted">
                            {new Date(u.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <select
                                disabled={actionLoadingId === u.id || u.id === user?.id}
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                                className="rounded-lg border border-strong bg-white px-2 py-1 text-xs font-semibold text-body focus:border-terracotta focus:outline-none disabled:opacity-50"
                              >
                                <option value="USER">USER</option>
                                <option value="OWNER">OWNER</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>
                              <button
                                disabled={actionLoadingId === u.id || u.id === user?.id}
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-1 text-xs font-semibold text-danger transition hover:brightness-95 disabled:opacity-50"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
