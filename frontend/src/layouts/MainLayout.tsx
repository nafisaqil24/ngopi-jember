import type { ReactNode } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

// MainLayout adalah "bingkai" untuk semua halaman public (Home, Explorer,
// Detail, Login, Register). Alasan dipisah jadi layout tersendiri:
// Navbar dan Footer selalu sama di semua halaman public, jadi daripada
// menulis ulang <Navbar /> dan <Footer /> di setiap halaman, kita cukup
// bungkus konten halaman (children) di dalam layout ini satu kali.
//
// Nanti saat Owner Dashboard dan Admin Dashboard dibuat (PHASE 9 & 10),
// mereka akan punya layout sendiri (mis. DashboardLayout) karena
// strukturnya beda (pakai sidebar, bukan navbar+footer public).

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
