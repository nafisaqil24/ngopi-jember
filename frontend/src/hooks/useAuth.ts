import { useCallback, useSyncExternalStore } from "react";
import type { AuthUser } from "../services/auth";

// Hook ini "membungkus" localStorage supaya komponen React bisa
// baca data login (user + token) dengan cara yang lazim di React:
// dipanggil seperti useState, dan otomatis re-render kalau datanya
// berubah (misal setelah logout).
//
// Kenapa pakai useSyncExternalStore, bukan useState biasa?
// Karena localStorage itu "sumber data di luar React" (external
// store). useSyncExternalStore adalah hook resmi React untuk
// nyambungin komponen ke sumber data seperti ini, supaya komponen
// lain yang juga pakai useAuth() ikut ke-update kalau ada yang logout
// di komponen lain.

const TOKEN_KEY = "ngopi_jember_token";
const USER_KEY = "ngopi_jember_user";

// listeners: daftar "pemberitahuan" ke semua komponen yang pakai
// useAuth(), supaya semua ikut re-render begitu ada perubahan login.
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notify() {
  listeners.forEach((callback) => callback());
}

function getUserSnapshot(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function getTokenSnapshot(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function useAuth() {
  const user = useSyncExternalStore(subscribe, getUserSnapshot);
  const token = useSyncExternalStore(subscribe, getTokenSnapshot);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    notify();
  }, []);

  return { user, token, isAuthenticated: Boolean(token && user), logout };
}