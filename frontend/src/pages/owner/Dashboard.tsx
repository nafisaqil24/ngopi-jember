import { useAuth } from "../../hooks/useAuth";

// Placeholder dulu untuk memastikan routing + proteksi (PrivateRoute)
// jalan dengan benar. Isi dashboard yang sebenarnya (statistik,
// grafik, dll) akan dibangun di langkah berikutnya (6.3).

export default function OwnerDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-black">Dashboard Owner</h1>
      <p className="mt-2 text-espresso/70">
        Halo, {user?.name}. Ini halaman dashboard placeholder — nanti
        isinya diganti statistik beneran.
      </p>
      <button
        onClick={logout}
        className="mt-4 rounded-xl bg-terracotta px-4 py-2 font-bold text-white"
      >
        Logout
      </button>
    </div>
  );
}