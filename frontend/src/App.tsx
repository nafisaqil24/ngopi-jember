import { matchPath, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import CoffeeShopExplorer from "./pages/CoffeeShopExplorer";
import CoffeeShopDetail from "./pages/CoffeeShopDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import PrivateRoute from "./components/auth/PrivateRoute";
import OwnerDashboard from "./pages/owner/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCoffeeShopEdit from "./pages/admin/CoffeeShopEdit";
import { ToastProvider } from "./components/common/Toast";
import ChatWidget from "./components/chat/ChatWidget";

// Allowlist rute publik yang menampilkan widget chat. Selain ini
// (login, register, dashboard/owner, admin, NotFound) tidak ditampilkan.
const CHAT_PATH_PATTERNS = ["/", "/coffee-shops", "/coffee-shops/:slug"];

// App.tsx sekarang HANYA berisi routing. Sebelumnya file ini menumpuk
// semua komponen (Layout, Home, Explorer, Detail, Auth, dll) jadi satu
// file besar. Setelah refactor, tiap halaman dipindah ke file sendiri
// di folder pages/, dan App.tsx tinggal menghubungkan URL ke halaman
// yang sesuai.
//
// Alasan dipisah begini: setiap halaman jadi mudah dicari (tinggal buka
// pages/NamaHalaman.tsx), mudah diedit tanpa takut merusak halaman
// lain, dan file ini sendiri jadi sangat pendek sehingga gampang
// dibaca untuk melihat "peta" semua route yang ada di aplikasi.

export default function App() {
  const location = useLocation();
  const showChat = CHAT_PATH_PATTERNS.some(
    (path) => matchPath({ path, end: true }, location.pathname) !== null
  );

  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/coffee-shops" element={<CoffeeShopExplorer />} />
        <Route path="/coffee-shops/:slug" element={<CoffeeShopDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute allowedRoles={["OWNER"]}>
              <OwnerDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/owner/dashboard"
          element={
            <PrivateRoute allowedRoles={["OWNER"]}>
              <OwnerDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/coffee-shops/:id/edit"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminCoffeeShopEdit />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showChat && <ChatWidget />}
    </ToastProvider>
  );
}