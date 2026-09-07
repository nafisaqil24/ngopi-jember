import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
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
                onClick={handleLogout}
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
                  handleLogout();
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
