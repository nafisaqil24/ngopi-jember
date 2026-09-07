import { Link } from "react-router-dom";

// Footer statis, tidak ada state atau logic khusus. Satu-satunya
// perbaikan di sini adalah warna: sebelumnya pakai coffee-900/cream-100/
// coffee-200 (tidak terdaftar di @theme index.css), sekarang diganti ke
// espresso/cream/terracotta yang memang valid.
//
// Link "Jelajahi" dan "Untuk Owner" sebelumnya cuma teks statis (<li>),
// sekarang dijadikan <Link> supaya beneran bisa diklik dan mengarah ke
// halaman yang relevan (konsisten dengan versi lama di App.tsx).

export default function Footer() {
  return (
    <footer className="border-t border-espresso/10 bg-espresso text-cream">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold text-cream">
              Ngopi Jember
            </h3>
            <p className="mt-2 text-sm text-cream/70">
              Direktori coffee shop terlengkap di Jember. Temukan tempat
              ngopi favoritmu dengan mudah.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-cream">Jelajahi</h4>
            <ul className="mt-2 space-y-2 text-sm text-cream/70">
              <li>
                <Link to="/coffee-shops" className="hover:text-terracotta">
                  Coffee Shop Populer
                </Link>
              </li>
              <li>
                <Link to="/coffee-shops" className="hover:text-terracotta">
                  Coffee Shop Featured
                </Link>
              </li>
              <li>
                <Link to="/coffee-shops" className="hover:text-terracotta">
                  Coffee Shop Terbaru
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-cream">Untuk Owner</h4>
            <ul className="mt-2 space-y-2 text-sm text-cream/70">
              <li>
                <Link to="/register" className="hover:text-terracotta">
                  Daftarkan Coffee Shop
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-terracotta">
                  Paket Featured & Premium
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-cream/15 pt-6 text-center text-xs text-cream/50">
          © {new Date().getFullYear()} Ngopi Jember. Dibuat sebagai portfolio
          project.
        </div>
      </div>
    </footer>
  );
}