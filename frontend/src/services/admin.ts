const apiUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

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
