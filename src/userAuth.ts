export const USER_TOKEN_KEY = "BLUEWATER_USER_TOKEN";

export function getUserToken() {
  try {
    return localStorage.getItem(USER_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function storeUserToken(token?: string | null) {
  try {
    if (token) localStorage.setItem(USER_TOKEN_KEY, token);
    else localStorage.removeItem(USER_TOKEN_KEY);
  } catch {
    // Ignore storage failures so auth can still rely on cookies when available.
  }
}

export function clearUserToken() {
  storeUserToken("");
}

export function withUserAuthHeaders(headers: Record<string, string> = {}) {
  const token = getUserToken();
  if (!token || headers.Authorization) return headers;
  return { ...headers, Authorization: `Bearer ${token}` };
}
