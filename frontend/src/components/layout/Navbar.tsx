import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const navLinks = [
    { label: "Beranda", to: "/" },
    { label: "Jelajahi", to: "/coffee-shops" },
    ...(user?.role === "OWNER" ? [{ label: "Dashboard", to: "/dashboard" }] : []),
  ];

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur transition-colors">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-zinc-100">
            Ngopi <span className="text-emerald-400">Jember</span>
          </span>
        </Link>

        {/* Menu desktop */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-zinc-300 transition hover:text-emerald-400"
            >
              {link.label}
            </Link>
          ))}

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-400">Halo, {user.name}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-bold text-zinc-200 hover:bg-zinc-800 transition"
              >
                Keluar
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="text-sm font-medium text-zinc-300 transition hover:text-emerald-400"
            >
              Masuk
            </Link>
          )}

          <Link
            to="/register"
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Daftarkan Coffee Shop
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 transition hover:bg-zinc-700"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Tombol hamburger & theme toggle untuk mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-100 transition hover:bg-zinc-700"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button
            type="button"
            aria-label="Buka menu"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-100 md:hidden"
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
        </div>
      </nav>

      {/* Menu mobile: hanya dirender terbuka saat isOpen true */}
      {isOpen && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                {link.label}
              </Link>
            ))}

            {user ? (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className="rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Keluar ({user.name})
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Masuk
              </Link>
            )}

            <Link
              to="/register"
              onClick={() => setIsOpen(false)}
              className="mt-1 rounded-full bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Daftarkan Coffee Shop
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
