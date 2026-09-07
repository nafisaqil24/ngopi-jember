import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import type { UserRole } from "../../services/auth";

// PrivateRoute membungkus halaman yang butuh login. Kalau user belum
// login, dia diarahkan ke /login. Kalau sudah login tapi rolenya
// tidak diizinkan (misal USER coba buka dashboard Owner), diarahkan
// ke halaman utama ("/") supaya tidak bisa mengintip halaman yang
// bukan haknya.
//
// Pola "children" dipilih (bukan pakai <Outlet />) supaya pemakaiannya
// simpel: tinggal bungkus komponen halaman dengan <PrivateRoute>...
// </PrivateRoute> langsung di App.tsx, cocok dengan gaya routing
// yang sudah ada di project ini.

export default function PrivateRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles: UserRole[];
}) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // "state={{ from: location }}" nyimpen halaman tujuan asal,
    // supaya nanti (opsional) setelah login bisa balik lagi ke sini.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}