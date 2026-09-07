export type CoffeeShop = {
  id: number; name: string; slug: string; description: string; address: string; district: string;
  rating: number; reviewCount: number; priceRange: string; openingHours: string; facilities: string[];
  images: string[]; menu: { name: string; price: string }[]; whatsapp: string; instagram: string;
  googleMapsUrl: string; isFeatured: boolean; isPopular: boolean; isNew: boolean;
}

const images = [
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1511081692775-05d0f180a065?auto=format&fit=crop&w=1200&q=85',
]

const base = (id: number, name: string, slug: string, district: string, rating: number, priceRange: string, flags: Pick<CoffeeShop, 'isFeatured' | 'isPopular' | 'isNew'>): CoffeeShop => ({
  id, name, slug, district, rating, priceRange, ...flags,
  description: `${name} adalah ruang hangat untuk menikmati kopi pilihan, bekerja santai, dan berbagi cerita di Jember.`,
  address: `Jl. ${district} Raya No. ${12 + id}, Jember`, reviewCount: 34 + id * 19,
  openingHours: 'Senin–Minggu, 08.00–23.00 WIB', facilities: ['Wi-Fi', 'Colokan', 'Parkir', 'Area outdoor'],
  images: [images[id % 4], images[(id + 1) % 4], images[(id + 2) % 4]],
  menu: [{ name: 'Es Kopi Susu', price: 'Rp18.000' }, { name: 'Cappuccino', price: 'Rp24.000' }, { name: 'Croissant Butter', price: 'Rp19.000' }],
  whatsapp: '6281234567890', instagram: `https://instagram.com/${slug}`, googleMapsUrl: 'https://maps.google.com/?q=Jember',
})

export const coffeeShops: CoffeeShop[] = [
  base(1, 'Ruang Senja', 'ruang-senja', 'Sumbersari', 4.8, 'Rp15–35 rb', { isFeatured: true, isPopular: true, isNew: false }),
  base(2, 'Titik Temu Coffee', 'titik-temu-coffee', 'Kaliwates', 4.7, 'Rp18–40 rb', { isFeatured: true, isPopular: true, isNew: false }),
  base(3, 'Kopi Pagi', 'kopi-pagi', 'Patrang', 4.6, 'Rp12–30 rb', { isFeatured: false, isPopular: true, isNew: false }),
  base(4, 'Kelana Roastery', 'kelana-roastery', 'Sumbersari', 4.9, 'Rp20–45 rb', { isFeatured: true, isPopular: true, isNew: true }),
  base(5, 'Sore Hari Coffee', 'sore-hari-coffee', 'Ajung', 4.5, 'Rp15–30 rb', { isFeatured: false, isPopular: false, isNew: true }),
  base(6, 'Niskala Kopi', 'niskala-kopi', 'Kaliwates', 4.6, 'Rp18–38 rb', { isFeatured: false, isPopular: true, isNew: false }),
  base(7, 'Bumi Seduh', 'bumi-seduh', 'Arjasa', 4.4, 'Rp10–28 rb', { isFeatured: false, isPopular: false, isNew: true }),
  base(8, 'Kedai Hujan', 'kedai-hujan', 'Sumbersari', 4.7, 'Rp15–35 rb', { isFeatured: true, isPopular: false, isNew: false }),
  base(9, 'Nara Coffee House', 'nara-coffee-house', 'Patrang', 4.5, 'Rp20–45 rb', { isFeatured: false, isPopular: false, isNew: true }),
  base(10, 'Loka Kopi', 'loka-kopi', 'Kaliwates', 4.6, 'Rp15–32 rb', { isFeatured: false, isPopular: true, isNew: false }),
]

export const districts = [...new Set(coffeeShops.map((shop) => shop.district))]
