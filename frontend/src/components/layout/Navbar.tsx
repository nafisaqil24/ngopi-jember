import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Beranda", to: "/" },
    { label: "Jelajahi", to: "/coffee-shops" },
    ...(user?.role === "OWNER" ? [{ label: "Dashboard", to: "/dashboard" }] : []),
    ...(user?.role === "ADMIN" ? [{ label: "Panel Admin", to: "/admin/dashboard" }] : []),
  ];

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? "border-b border-slate-300 bg-white/95 py-2.5 shadow-md backdrop-blur-md"
          : "border-b border-slate-200/80 bg-white/90 py-3.5 backdrop-blur-xl"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3 group transition-transform hover:scale-105">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-600 font-mono text-sm font-bold shadow-sm">
            NJ
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight flex items-center gap-1.5">
              <span className="font-bold text-slate-950">Ngopi</span> <span className="text-indigo-600 font-bold">Jember</span>
            </span>
          </div>
        </Link>

        {/* Menu desktop */}
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`link-underline text-sm font-semibold transition hover:text-indigo-600 px-3 py-1.5 rounded-lg ${
                  isActive ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <span className="font-mono text-xs text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                usr: {user.name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 hover:scale-105 active:scale-95 transition shadow-2xs"
              >
                Keluar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <Link
                to="/login"
                className="link-underline text-sm font-semibold text-slate-900 transition hover:text-indigo-600 px-3 py-1.5 rounded-lg"
              >
                Masuk
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(99,102,241,0.35)] transition-all duration-200 hover:bg-indigo-500 hover:scale-105 active:scale-95 shadow-md"
              >
                + Daftar Akun
              </Link>
            </div>
          )}
        </div>

        {/* Tombol hamburger untuk mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            aria-label="Buka menu"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 md:hidden shadow-2xs transition hover:scale-105 active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
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

      {/* Menu mobile */}
      {isOpen && (
        <div className="border-t border-slate-200 bg-white/95 backdrop-blur-xl px-4 py-4 md:hidden shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsOpen(false)}
                  className={`rounded-xl px-3.5 py-2.5 text-sm font-medium transition hover:scale-[1.01] ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600 font-semibold"
                      : "text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            {user ? (
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
                <div className="font-mono text-xs text-slate-800 bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  usr: {user.name}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-left text-sm font-bold text-slate-800 hover:bg-slate-100 transition"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-100 transition"
              >
                Masuk
              </Link>
            )}

            <Link
              to="/register"
              onClick={() => setIsOpen(false)}
              className="mt-1 rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition"
            >
              + Daftarkan Kedai
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
