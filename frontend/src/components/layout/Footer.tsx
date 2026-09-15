import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-slate-300 bg-white text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-600"></span>
              Ngopi Jember <span className="font-mono text-xs text-indigo-700 font-bold">v2.0</span>
            </h3>
            <p className="mt-2 text-sm text-slate-800 font-medium">
              Platform direktori coffee shop modern dengan nuansa professional engineering & developer aesthetic.
            </p>
          </div>

          <div>
            <h4 className="font-mono text-xs font-bold text-slate-950 tracking-wider uppercase">Jelajahi</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-900 font-medium">
              <li>
                <Link to="/coffee-shops" className="hover:text-indigo-700 font-semibold transition">
                  Coffee Shop Populer
                </Link>
              </li>
              <li>
                <Link to="/coffee-shops" className="hover:text-indigo-700 font-semibold transition">
                  Coffee Shop Featured
                </Link>
              </li>
              <li>
                <Link to="/coffee-shops" className="hover:text-indigo-700 font-semibold transition">
                  Coffee Shop Terbaru
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-xs font-bold text-slate-950 tracking-wider uppercase">Untuk Owner</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-900 font-medium">
              <li>
                <Link to="/register" className="hover:text-indigo-700 font-semibold transition">
                  Daftarkan Coffee Shop
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-indigo-700 font-semibold transition">
                  Dashboard Management
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-300 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-800 font-medium font-mono">
          <span>© {new Date().getFullYear()} Ngopi Jember Engine. All rights reserved.</span>
          <span className="mt-2 sm:mt-0 text-indigo-700 font-bold">build: stable-production</span>
        </div>
      </div>
    </footer>
  );
}
