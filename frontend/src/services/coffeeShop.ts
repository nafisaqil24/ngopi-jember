const apiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

type ApiResponse<T> =
  | { success: true; data: T; meta?: unknown }
  | { success: false; message: string };

// Tipe respons API ini SENGAJA dibuat terpisah dari types/coffeeShop.ts,
// karena bentuk data yang dikirim backend untuk LIST (ApiCoffeeShopCard)
// berbeda dari bentuk data untuk DETAIL (ApiCoffeeShopDetail) -- lihat
// coffee-shop.routes.ts di backend: fungsi toCard() vs endpoint /:slug.
// Komponen (CoffeeShopCard, dll) tetap pakai tipe CoffeeShop yang sudah
// ada; fungsi mapper di bawah yang menjembatani antara bentuk API dan
// bentuk yang dibutuhkan komponen.

export type ApiFacility = { id: string; name: string; slug: string };

export type ApiCoffeeShopCard = {
  id: string;
  name: string;
  slug: string;
  district: string;
  priceRange: string;
  isFeatured: boolean;
  status: "OPEN" | "CLOSED" | "TEMPORARILY_CLOSED";
  image: string | null;
  facilities: ApiFacility[];
  rating: number | null;
  reviewCount: number;
};

export type ApiCoffeeShopDetail = ApiCoffeeShopCard & {
  ownerId: string;
  description: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  instagram: string | null;
  openingHours: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  categories: { category: { id: string; name: string; slug: string } }[];
  menus: { id: string; name: string; category?: string | null; description: string | null; price: number; image: string | null }[];
  images: { id: string; imageUrl: string }[];
  promotions: { id: string; title: string; description: string }[];
  reviews: { id: string; rating: number; comment: string; user: { name: string } }[];
};

export type ListMeta = { page: number; limit: number; total: number; totalPages: number };

export type ListParams = {
  search?: string;
  district?: string;
  minRating?: number;
  facility?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
};

export class ApiError extends Error {}

async function get<T>(path: string): Promise<{ data: T; meta?: ListMeta }> {
  const response = await fetch(`${apiUrl}${path}`);
  const payload = (await response.json()) as ApiResponse<T> & { meta?: ListMeta };
  if (!response.ok || !payload.success) {
    throw new ApiError(payload.success ? "Permintaan gagal" : payload.message);
  }
  return { data: payload.data, meta: payload.meta };
}

// Mengambil daftar coffee shop dengan filter opsional. Parameter yang
// undefined tidak dikirim sama sekali (bukan dikirim sebagai string
// "undefined"), supaya query string tetap bersih.
export async function listCoffeeShops(params: ListParams = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.district) query.set("district", params.district);
  if (params.minRating) query.set("minRating", String(params.minRating));
  if (params.facility) query.set("facility", params.facility);
  if (params.featured !== undefined) query.set("featured", String(params.featured));
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));

  const queryString = query.toString();
  return get<ApiCoffeeShopCard[]>(`/coffee-shops${queryString ? `?${queryString}` : ""}`);
}

export async function getCoffeeShopBySlug(slug: string) {
  return get<ApiCoffeeShopDetail>(`/coffee-shops/${slug}`);
}

export async function listCategories() {
  return get<ApiFacility[]>("/categories");
}

export async function listFacilities() {
  return get<ApiFacility[]>("/facilities");
}

export type ApiOwnerShop = ApiCoffeeShopDetail & {
  menus: { id: string; name: string; category: string | null; description: string | null; price: number; image: string | null }[];
};

export async function getOwnerCoffeeShop(token: string) {
  const response = await fetch(`${apiUrl}/owner/coffee-shop`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = (await response.json()) as { success: boolean; data: ApiOwnerShop | null; message?: string };
  if (!response.ok || !payload.success) {
    throw new ApiError(payload.success ? "Permintaan gagal" : (payload.message || "Gagal memuat coffee shop"));
  }
  return payload.data;
}

export async function createMenu(
  coffeeShopId: string,
  token: string,
  input: { name: string; category?: string; description?: string; price: number; image?: string }
) {
  const response = await fetch(`${apiUrl}/coffee-shops/${coffeeShopId}/menus`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as { success: boolean; data: any; message?: string; errors?: any };
  if (!response.ok || !payload.success) {
    throw new ApiError(payload.success ? "Permintaan gagal" : (payload.message || "Gagal menambahkan menu"));
  }
  return payload.data;
}

export async function createCoffeeShop(
  token: string,
  input: {
    name: string;
    description: string;
    address: string;
    district: string;
    priceRange: string;
    openingHours: string;
    phone?: string;
    instagram?: string;
  }
) {
  const response = await fetch(`${apiUrl}/coffee-shops`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as { success: boolean; data: any; message?: string };
  if (!response.ok || !payload.success) {
    throw new ApiError(payload.success ? "Permintaan gagal" : (payload.message || "Gagal mendaftarkan coffee shop"));
  }
  return payload.data;
}

export async function updateCoffeeShop(
  coffeeShopId: string,
  token: string,
  input: {
    name?: string;
    description?: string;
    address?: string;
    district?: string;
    priceRange?: string;
    openingHours?: string;
    phone?: string;
    instagram?: string;
    status?: "OPEN" | "CLOSED" | "TEMPORARILY_CLOSED";
  }
) {
  const response = await fetch(`${apiUrl}/coffee-shops/${coffeeShopId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as { success: boolean; data: any; message?: string };
  if (!response.ok || !payload.success) {
    throw new ApiError(payload.success ? "Permintaan gagal" : (payload.message || "Gagal memperbarui coffee shop"));
  }
  return payload.data;
}

export async function deleteCoffeeShop(coffeeShopId: string, token: string) {
  const response = await fetch(`${apiUrl}/coffee-shops/${coffeeShopId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Gagal menghapus coffee shop" }));
    throw new ApiError(payload.message || "Gagal menghapus coffee shop");
  }
  return true;
}

export async function updateMenu(
  coffeeShopId: string,
  menuId: string,
  token: string,
  input: { name?: string; category?: string; description?: string; price?: number; image?: string }
) {
  const response = await fetch(`${apiUrl}/coffee-shops/${coffeeShopId}/menus/${menuId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as { success: boolean; data: any; message?: string };
  if (!response.ok || !payload.success) {
    throw new ApiError(payload.success ? "Permintaan gagal" : (payload.message || "Gagal memperbarui menu"));
  }
  return payload.data;
}

export async function deleteMenu(coffeeShopId: string, menuId: string, token: string) {
  const response = await fetch(`${apiUrl}/coffee-shops/${coffeeShopId}/menus/${menuId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Gagal menghapus menu" }));
    throw new ApiError(payload.message || "Gagal menghapus menu");
  }
  return true;
}