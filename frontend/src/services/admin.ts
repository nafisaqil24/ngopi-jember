const apiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');

export type ApiAdminShop = {
  id: string;
  name: string;
  slug: string;
  district: string;
  address: string;
  priceRange: string;
  status: "OPEN" | "CLOSED" | "TEMPORARILY_CLOSED";
  isVerified: boolean;
  isFeatured: boolean;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  _count: { reviews: number; menus: number };
};

export type ApiAdminUser = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "OWNER" | "ADMIN";
  createdAt: string;
  _count: { coffeeShops: number; reviews: number };
};

export type ApiAdminShopDetail = {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  district: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  instagram: string | null;
  priceRange: string;
  openingHours: string;
  status: "OPEN" | "CLOSED" | "TEMPORARILY_CLOSED";
  isVerified: boolean;
  isFeatured: boolean;
  owner: { id: string; name: string; email: string };
  categories: { category: { id: string; name: string; slug: string } }[];
  facilities: { facility: { id: string; name: string; slug: string } }[];
  images: { id: string; imageUrl: string }[];
  menus: { id: string; name: string; category: string | null; description: string | null; price: number; image: string | null }[];
};

export class ApiError extends Error {}

async function fetchWithAuth(path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new ApiError(payload.success ? "Permintaan gagal" : payload.message || "Terjadi kesalahan");
  }
  return payload.data;
}

export async function getAdminCoffeeShops(token: string): Promise<ApiAdminShop[]> {
  return fetchWithAuth("/admin/coffee-shops", token);
}

export async function verifyCoffeeShop(token: string, shopId: string, isVerified: boolean): Promise<ApiAdminShop> {
  return fetchWithAuth(`/admin/coffee-shops/${shopId}/verify`, token, {
    method: "PATCH",
    body: JSON.stringify({ isVerified }),
  });
}

export async function setCoffeeShopFeatured(token: string, shopId: string, isFeatured: boolean): Promise<ApiAdminShop> {
  return fetchWithAuth(`/admin/coffee-shops/${shopId}/featured`, token, {
    method: "PATCH",
    body: JSON.stringify({ isFeatured }),
  });
}

export async function deleteAdminCoffeeShop(token: string, shopId: string): Promise<void> {
  const response = await fetch(`${apiUrl}/admin/coffee-shops/${shopId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok && response.status !== 204) {
    throw new ApiError("Gagal menghapus coffee shop");
  }
}

export async function getAdminUsers(token: string): Promise<ApiAdminUser[]> {
  return fetchWithAuth("/admin/users", token);
}

export async function updateUserRole(token: string, userId: string, role: "USER" | "OWNER" | "ADMIN"): Promise<ApiAdminUser> {
  return fetchWithAuth(`/admin/users/${userId}/role`, token, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function deleteAdminUser(token: string, userId: string): Promise<void> {
  const response = await fetch(`${apiUrl}/admin/users/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok && response.status !== 204) {
    throw new ApiError("Gagal menghapus pengguna");
  }
}

// Ambil detail satu kedai (lengkap, termasuk yang belum terverifikasi) untuk admin.
export async function getAdminCoffeeShop(token: string, shopId: string): Promise<ApiAdminShopDetail> {
  return fetchWithAuth(`/admin/coffee-shops/${shopId}`, token);
}

export type AdminShopUpdateInput = {
  name?: string;
  description?: string;
  address?: string;
  district?: string;
  priceRange?: string;
  openingHours?: string;
  phone?: string;
  instagram?: string;
  status?: "OPEN" | "CLOSED" | "TEMPORARILY_CLOSED";
  latitude?: number;
  longitude?: number;
  image?: File;
};

// Update kedai oleh admin (memakai endpoint PUT /api/coffee-shops/:id yang mengizinkan ADMIN).
// Menggunakan FormData (multipart) karena endpoint menerima upload gambar.
export async function updateAdminCoffeeShop(token: string, shopId: string, input: AdminShopUpdateInput): Promise<ApiAdminShopDetail> {
  const formData = new FormData();
  if (input.name !== undefined) formData.set("name", input.name);
  if (input.description !== undefined) formData.set("description", input.description);
  if (input.address !== undefined) formData.set("address", input.address);
  if (input.district !== undefined) formData.set("district", input.district);
  if (input.priceRange !== undefined) formData.set("priceRange", input.priceRange);
  if (input.openingHours !== undefined) formData.set("openingHours", input.openingHours);
  if (input.phone !== undefined) formData.set("phone", input.phone);
  if (input.instagram !== undefined) formData.set("instagram", input.instagram);
  if (input.status !== undefined) formData.set("status", input.status);
  if (input.latitude !== undefined) formData.set("latitude", String(input.latitude));
  if (input.longitude !== undefined) formData.set("longitude", String(input.longitude));
  if (input.image) formData.set("image", input.image);

  const response = await fetch(`${apiUrl}/coffee-shops/${shopId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const payload = await response.json().catch(() => ({ success: false, message: "Gagal memperbarui kedai" }));
  if (!response.ok || !payload.success) {
    throw new ApiError(payload.success ? "Permintaan gagal" : payload.message || "Gagal memperbarui kedai");
  }
  return payload.data;
}

// Set kategori & fasilitas kedai (endpoint yang sudah mengizinkan ADMIN).
export async function updateAdminShopTaxonomy(
  token: string,
  shopId: string,
  input: { categoryIds?: string[]; facilityIds?: string[] }
): Promise<ApiAdminShopDetail> {
  return fetchWithAuth(`/coffee-shops/${shopId}/taxonomy`, token, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export type AdminMenuInput = {
  name?: string;
  category?: string;
  description?: string;
  price?: number;
  image?: File;
};

// Menu CRUD oleh admin (endpoint menu mengizinkan ADMIN).
export async function createAdminMenu(token: string, shopId: string, input: AdminMenuInput): Promise<ApiAdminShopDetail["menus"][number]> {
  const formData = new FormData();
  if (input.name !== undefined) formData.set("name", input.name);
  if (input.category !== undefined) formData.set("category", input.category);
  if (input.description !== undefined) formData.set("description", input.description);
  if (input.price !== undefined) formData.set("price", String(input.price));
  if (input.image) formData.set("image", input.image);

  const response = await fetch(`${apiUrl}/coffee-shops/${shopId}/menus`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const payload = await response.json().catch(() => ({ success: false, message: "Gagal menambahkan menu" }));
  if (!response.ok || !payload.success) {
    throw new ApiError(payload.success ? "Permintaan gagal" : payload.message || "Gagal menambahkan menu");
  }
  return payload.data;
}

export async function updateAdminMenu(
  token: string,
  shopId: string,
  menuId: string,
  input: AdminMenuInput
): Promise<ApiAdminShopDetail["menus"][number]> {
  const formData = new FormData();
  if (input.name !== undefined) formData.set("name", input.name);
  if (input.category !== undefined) formData.set("category", input.category);
  if (input.description !== undefined) formData.set("description", input.description);
  if (input.price !== undefined) formData.set("price", String(input.price));
  if (input.image) formData.set("image", input.image);

  const response = await fetch(`${apiUrl}/coffee-shops/${shopId}/menus/${menuId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const payload = await response.json().catch(() => ({ success: false, message: "Gagal memperbarui menu" }));
  if (!response.ok || !payload.success) {
    throw new ApiError(payload.success ? "Permintaan gagal" : payload.message || "Gagal memperbarui menu");
  }
  return payload.data;
}

export async function deleteAdminMenu(token: string, shopId: string, menuId: string): Promise<void> {
  const response = await fetch(`${apiUrl}/coffee-shops/${shopId}/menus/${menuId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok && response.status !== 204) {
    throw new ApiError("Gagal menghapus menu");
  }
}
