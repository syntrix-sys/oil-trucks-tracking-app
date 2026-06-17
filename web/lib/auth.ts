const AUTH_KEY = "oiltrack_auth";
const USER_KEY = "oiltrack_user";

export const DEMO_CREDENTIALS = {
  username: "dispatcher",
  password: "oiltrack2024",
};

export function login(username: string, password: string): boolean {
  if (username.trim() === DEMO_CREDENTIALS.username && password.trim() === DEMO_CREDENTIALS.password) {
    localStorage.setItem(AUTH_KEY, "true");
    localStorage.setItem(USER_KEY, username);
    return true;
  }
  return false;
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTH_KEY) === "true";
}

export function getCurrentUser(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_KEY);
}
