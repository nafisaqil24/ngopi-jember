import { useCallback, useSyncExternalStore } from "react";
import type { AuthUser } from "../services/auth";

const TOKEN_KEY = "ngopi_jember_token";
const USER_KEY = "ngopi_jember_user";

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notify() {
  listeners.forEach((callback) => callback());
}

let cachedRawUser: string | null = null;
let cachedUser: AuthUser | null = null;

function getUserSnapshot(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (raw !== cachedRawUser) {
    cachedRawUser = raw;
    if (!raw) {
      cachedUser = null;
    } else {
      try {
        cachedUser = JSON.parse(raw) as AuthUser;
      } catch {
        cachedUser = null;
      }
    }
  }
  return cachedUser;
}

let cachedRawToken: string | null = null;
let cachedToken: string | null = null;

function getTokenSnapshot(): string | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (raw !== cachedRawToken) {
    cachedRawToken = raw;
    cachedToken = raw;
  }
  return cachedToken;
}

export function useAuth() {
  const user = useSyncExternalStore(subscribe, getUserSnapshot);
  const token = useSyncExternalStore(subscribe, getTokenSnapshot);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    cachedRawUser = null;
    cachedUser = null;
    cachedRawToken = null;
    cachedToken = null;
    notify();
  }, []);

  return { user, token, isAuthenticated: Boolean(token && user), logout };
}
