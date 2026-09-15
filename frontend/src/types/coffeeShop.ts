// Tipe data ini merepresentasikan bentuk data Coffee Shop yang akan
// dipakai di seluruh frontend. Untuk PHASE 1, data masih dummy (statis),
// tetapi bentuk tipe ini sengaja dibuat mirip dengan skema database
// yang direncanakan (lihat dokumen desain), supaya nanti saat backend
// sudah siap, kita tinggal mengganti sumber data tanpa mengubah banyak
// komponen.

export interface CoffeeShop {
  id: string;
  slug: string;
  name: string;
  description: string;
  district: string; // kecamatan
  address: string;
  priceRange: string; // contoh: "Rp15rb - Rp35rb"
  rating: number;
  reviewCount: number;
  facilities: string[];
  imageUrl: string;
  isFeatured: boolean;
  isOpenNow: boolean;
  distance?: number;
}
