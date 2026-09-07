import type { CoffeeShop } from "../types/coffeeShop";

// PENTING: Ini adalah data dummy/contoh untuk keperluan tampilan di
// PHASE 1 saja. Data ini BUKAN data coffee shop nyata di Jember.
// Nanti di PHASE 3 (Backend + Database), data seperti ini akan
// dipindahkan menjadi seed script Prisma dan diambil lewat REST API,
// bukan lagi hardcode di frontend seperti ini.

export const dummyCoffeeShops: CoffeeShop[] = [
  {
    id: "1",
    slug: "kopi-senja-jember",
    name: "Kopi Senja",
    description: "Tempat ngopi santai dengan nuansa senja yang hangat.",
    district: "Sumbersari",
    address: "Jl. Kalimantan No. 12",
    priceRange: "Rp15rb - Rp30rb",
    rating: 4.7,
    reviewCount: 128,
    facilities: ["WiFi", "Outdoor", "Live Music"],
    imageUrl:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600",
    isFeatured: true,
    isOpenNow: true,
  },
  {
    id: "2",
    slug: "kedai-tengah-kota",
    name: "Kedai Tengah Kota",
    description: "Kedai kopi minimalis di jantung kota Jember.",
    district: "Kaliwates",
    address: "Jl. PB Sudirman No. 45",
    priceRange: "Rp12rb - Rp25rb",
    rating: 4.5,
    reviewCount: 96,
    facilities: ["WiFi", "AC", "Meeting Room"],
    imageUrl:
      "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600",
    isFeatured: true,
    isOpenNow: true,
  },
  {
    id: "3",
    slug: "ruang-seduh",
    name: "Ruang Seduh",
    description: "Konsep specialty coffee dengan biji kopi lokal Jember.",
    district: "Patrang",
    address: "Jl. Danau Toba No. 8",
    priceRange: "Rp20rb - Rp45rb",
    rating: 4.8,
    reviewCount: 210,
    facilities: ["WiFi", "Indoor", "Specialty Coffee"],
    imageUrl:
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600",
    isFeatured: false,
    isOpenNow: false,
  },
  {
    id: "4",
    slug: "warung-kopi-mbah-jo",
    name: "Warung Kopi Mbah Jo",
    description: "Kopi tubruk klasik dengan harga bersahabat.",
    district: "Sumbersari",
    address: "Jl. Mastrip No. 3",
    priceRange: "Rp5rb - Rp15rb",
    rating: 4.3,
    reviewCount: 64,
    facilities: ["Outdoor", "24 Jam"],
    imageUrl:
      "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600",
    isFeatured: false,
    isOpenNow: true,
  },
];
