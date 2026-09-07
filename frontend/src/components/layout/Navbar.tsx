import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AuthUser } from "../../services/auth";

// Navbar ini bertanggung jawab untuk navigasi utama di semua halaman
// public. Kita simpan state `isOpen` secara lokal (useState) untuk
// mengatur apakah menu mobile (hamburger) sedang terbuka atau tidak.
// Ini murni state UI, jadi cukup pakai useState, tidak perlu context
// atau state management global.
//
// CATATAN PERBAIKAN:
// 1. Warna diganti dari coffee-800/cream-50/accent-600 (tidak terdaftar
//    di @theme) menjadi espresso/cream/terracotta (warna yang benar-benar
//    terdaftar di frontend/src/index.css).
// 2. Ditambahkan logic user login: baca user dari localStorage, tampilkan
//    "Halo, {nama}" + tombol Keluar kalau user sudah login. Logic ini
//    sebelumnya cuma ada di Layout versi lama (App.tsx), sekarang
//    dipindah ke sini supaya Navbar reusable dan konsisten.

const navLinks = [
  { label: "Beranda", to: "/" },
  { label: "Jelajahi", to: "/coffee-shops" },
];

// Baca user dari localStorage. Ini dipanggil langsung tiap render Navbar,
// bukan lewat context, karena scope-nya masih sederhana (belum butuh
// state global). Kalau nanti makin banyak komponen butuh data user,
// baru layak dipindah ke Context/Provider.
function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem("ngopi_jember_user");
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user] = useState<AuthUser | null>(() => getStoredUser());
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("ngopi_jember_token");
    localStorage.removeItem("ngopi_jember_user");
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-espresso/10 bg-cream/95 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-espresso">
            Ngopi <span className="text-terracotta">Jember</span>
          </span>
        </Link>

        {/* Menu desktop */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-espresso/80 transition hover:text-terracotta"
            >
              {link.label}
            </Link>
          ))}

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-espresso/70">Halo, {user.name}</span>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-espresso/15 px-3 py-2 text-sm font-bold text-espresso"
              >
                Keluar
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="text-sm font-medium text-espresso/80 transition hover:text-terracotta"
            >
              Masuk
            </Link>
          )}

          <Link
            to="/register"
            className="rounded-full bg-terracotta px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Daftarkan Coffee Shop
          </Link>
        </div>

        {/* Tombol hamburger untuk mobile */}
        <button
          type="button"
          aria-label="Buka menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-espresso md:hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Menu mobile: hanya dirender terbuka saat isOpen true */}
      {isOpen && (
        <div className="border-t border-espresso/10 bg-cream px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-espresso/80 hover:bg-espresso/5"
              >
                {link.label}
              </Link>
            ))}

            {user ? (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="rounded-lg px-3 py-2 text-left text-sm font-medium text-espresso/80 hover:bg-espresso/5"
              >
                Keluar ({user.name})
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-espresso/80 hover:bg-espresso/5"
              >
                Masuk
              </Link>
            )}

            <Link
              to="/register"
              onClick={() => setIsOpen(false)}
              className="mt-1 rounded-full bg-terracotta px-3 py-2 text-center text-sm font-semibold text-white"
            >
              Daftarkan Coffee Shop
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}