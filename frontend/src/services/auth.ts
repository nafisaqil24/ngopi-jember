const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

type ApiResponse<T> = { success: true; data: T } | { success: false; message: string }
export type UserRole = 'USER' | 'OWNER' | 'ADMIN'
export type AuthUser = { id: string; name: string; email: string; role: UserRole; createdAt: string }
type AuthResult = { user: AuthUser; token: string }

export class ApiError extends Error {}

async function request<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, { headers: { 'Content-Type': 'application/json' }, method: 'POST', body: JSON.stringify(body) })
  const payload = await response.json() as ApiResponse<T>
  if (!response.ok || !payload.success) throw new ApiError(payload.success ? 'Permintaan gagal' : payload.message)
  return payload.data
}

export const login = (email: string, password: string) => request<AuthResult>('/auth/login', { email, password })
export const register = (input: { name: string; email: string; password: string; role: 'USER' | 'OWNER' }) => request<AuthResult>('/auth/register', input)
