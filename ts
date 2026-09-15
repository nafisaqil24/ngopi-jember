Saya sedang membangun web app "Ngopi Jember" (direktori coffee shop) dengan stack:
frontend React + TypeScript + Vite + Tailwind CSS + React Router.

Tolong tambahkan animasi UI ke project ini. Gunakan Tailwind CSS (custom keyframes di
tailwind.config.ts) sebagai basis utama, dan tambahkan Framer Motion (framer-motion)
untuk animasi yang butuh state/transition kompleks (page transition, stagger list,
accordion height, dsb). Untuk progress bar loading di atas layar, gunakan library
nprogress atau bikin komponen custom ringan.

ATURAN KERJA:
- Kerjakan BERTAHAP per grup file di bawah, JANGAN langsung ubah semua file sekaligus.
- Setiap selesai satu tahap, JELASKAN: file apa saja yang diubah, animasi apa yang
  ditambahkan, dan library/pendekatan yang dipakai di file itu.
- Pastikan setiap animasi tetap accessible (hormati prefers-reduced-motion) dan tidak
  merusak fungsi/logic yang sudah ada — animasi murni presentational.

DAFTAR ANIMASI & FILE TARGET:

 — Root & Layout (frontend/index.html, src/layouts/MainLayout.tsx,
src/components/layout/Navbar.tsx, src/components/layout/Footer.tsx)
1. Sticky navbar shrink/blur saat di-scroll (Navbar.tsx)
2. Underline slide-in pada link nav saat hover (Navbar.tsx, Footer.tsx)
3. Hover scale/color pada semua button & link di Navbar/Footer
4. Smooth scroll ke anchor/section (setup scroll-behavior + helper function di MainLayout)
5. Page transition fade/slide antar halaman (bungkus <Outlet /> di MainLayout dengan
   AnimatePresence dari framer-motion)
6. Progress bar tipis di atas layar saat loading/navigasi halaman (pasang di MainLayout,
   trigger di setiap route change)

 Halaman Home & Explorer (src/pages/Home.tsx, src/pages/CoffeeShopExplorer.tsx,
src/components/coffeeshop/CoffeeShopCard.tsx)
7. Fade-in saat elemen muncul di viewport / scroll reveal (Hero section, section
   populer/featured/terbaru di Home.tsx, hasil filter di Explorer.tsx) — pakai
   IntersectionObserver custom hook atau framer-motion whileInView
8. Stagger animation pada list item (daftar coffee shop card di Home & Explorer)
9. Card hover elevation (shadow + terangkat) di CoffeeShopCard.tsx
10. Skeleton loading saat fetch data (state loading di Home.tsx & Explorer.tsx)
11. Animated gradient border (glow effect bergerak) — untuk card featured/populer di
    Home.tsx sebagai aksen visual

  Halaman Detail (src/pages/CoffeeShopDetail.tsx)
12. Fade-in scroll reveal untuk tiap section (info, menu, form ulasan, daftar ulasan)
13. Stagger animation pada daftar menu & daftar ulasan
14. Accordion/dropdown expand-collapse animasi height (kalau ada bagian menu/FAQ yang
    collapsible)
15. Ripple effect saat klik button (tombol aksi seperti "kirim ulasan", "simpan")
16. Success checkmark draw / shake animation untuk form ulasan (sukses submit vs error
    validasi)

Auth (src/pages/Login.tsx, src/pages/Register.tsx,
src/components/auth/AuthForm.tsx)
17. Border glow / label float-up pada input form saat focus (AuthForm.tsx, floating label
    pattern)
18. Shake animation saat validasi error di form
19. Button loading spinner + disable saat proses submit (Login/Register)
20. Ripple effect saat klik button submit

Owner Dashboard (src/pages/owner/Dashboard.tsx)
21. Sidebar/menu slide-in dari samping (kalau dashboard pakai sidebar)
22. Active tab indicator sliding underline (kalau ada tab menu di dashboard)
23. Stagger animation pada tabel/list data dashboard
24. Skeleton loading saat fetch data dashboard
25. Card hover elevation untuk widget/statistik

 Komponen Global (src/components/common/Toast.tsx,
src/components/common/EmptyState.tsx, src/components/common/ErrorState.tsx,
src/components/common/ErrorBoundary.tsx, src/pages/NotFound.tsx)
26. Toast notification slide-in dari pojok layar + auto dismiss dengan fade-out
27. Fade-in untuk EmptyState & ErrorState saat muncul
28. Animasi ringan (bounce/fade) untuk halaman NotFound.tsx
29. Typing effect ala terminal untuk headline (opsional: pakai di NotFound.tsx atau
    Hero Home.tsx sebagai aksen)

Review & Optimisasi
30. Cek ulang App.tsx, pastikan AnimatePresence & routing animasi jalan mulus di semua
    route
31. Audit performa: pastikan animasi pakai transform/opacity (bukan reflow-heavy
    property), tambahkan will-change kalau perlu
32. Tambahkan media query prefers-reduced-motion supaya animasi bisa dimatikan otomatis
    untuk user yang butuh

